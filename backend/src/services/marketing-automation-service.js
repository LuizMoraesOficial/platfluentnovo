import { storage } from './storage.js';
import { emailService } from './email-service.js';
import { appLogger } from '../utils/logger.js';
import cron from 'node-cron';
import crypto from 'crypto';

export const DEFAULT_SCORING_CRITERIA = {
  page_view: 1,
  time_on_site_minutes: 2,
  file_download: 5,
  form_submit: 8,
  trial_signup: 15,
  class_booking: 12,
  payment: 25,
  email_open: 2,
  email_click: 4,
  profile_update: 3,
  login: 1,
};

export class MarketingAutomationService {
  isInitialized = false;
  scoringCriteria = DEFAULT_SCORING_CRITERIA;
  campaignExecutionInProgress = new Set();
  retryDelays = [1, 5, 15, 60];
  
  constructor() {
    this.initializeAutomation();
  }

  async initializeAutomation() {
    if (this.isInitialized) return;

    try {
      await this.ensureDefaultScoringRules();
      
      this.startAutomationJobs();
      
      this.isInitialized = true;
      appLogger.info('✓ Marketing Automation Service initialized successfully');
    } catch (error) {
      appLogger.error('Failed to initialize Marketing Automation Service:', error);
    }
  }

  async trackUserEvent(eventData) {
    try {
      const event = {
        user_id: eventData.user_id,
        session_id: eventData.session_id,
        event_type: eventData.event_type,
        event_name: eventData.event_name,
        page_url: eventData.page_url,
        referrer: eventData.referrer,
        event_data: eventData.event_data ? JSON.stringify(eventData.event_data) : undefined,
        utm_source: eventData.utm_source,
        utm_medium: eventData.utm_medium,
        utm_campaign: eventData.utm_campaign,
        utm_content: eventData.utm_content,
        utm_term: eventData.utm_term,
        user_agent: eventData.user_agent,
        ip_address: eventData.ip_address,
        duration: eventData.duration,
      };

      await storage.createUserEvent(event);

      if (eventData.user_id) {
        await this.updateLeadScore(eventData.user_id, eventData.event_type, eventData.event_data);
      }

      appLogger.info('User event tracked:', {
        action: 'user_event_tracked',
        metadata: {
          user_id: eventData.user_id,
          event_type: eventData.event_type,
          event_name: eventData.event_name,
        },
      });
    } catch (error) {
      appLogger.error('Failed to track user event:', error);
    }
  }

  async updateLeadScore(userId, eventType, eventData) {
    try {
      let currentScoring = await storage.getLeadScoringByUserId(userId);
      
      const points = this.calculateEventPoints(eventType, eventData);
      
      if (points === 0) return;

      if (!currentScoring) {
        const newScoring = {
          user_id: userId,
          total_score: points,
          engagement_score: eventType === 'page_view' ? points : 0,
          interaction_score: ['button_click', 'form_submit', 'email_click'].includes(eventType) ? points : 0,
          conversion_score: ['trial_signup', 'payment', 'class_booking'].includes(eventType) ? points : 0,
          score_tier: this.calculateScoreTier(points),
          last_activity: new Date(),
        };
        
        currentScoring = await storage.createLeadScoring(newScoring);
        
        appLogger.info('Lead scoring created:', {
          action: 'lead_score_created',
          metadata: {
            userId,
            eventType,
            points,
            total_score: points,
          },
        });
      } else {
        const newTotalScore = currentScoring.total_score + points;
        const currentTier = currentScoring.score_tier;
        const newTier = this.calculateScoreTier(newTotalScore);
        
        const updatedScoring = {
          total_score: newTotalScore,
          engagement_score: eventType === 'page_view' ? 
            currentScoring.engagement_score + points : currentScoring.engagement_score,
          interaction_score: ['button_click', 'form_submit', 'email_click'].includes(eventType) ?
            currentScoring.interaction_score + points : currentScoring.interaction_score,
          conversion_score: ['trial_signup', 'payment', 'class_booking'].includes(eventType) ?
            currentScoring.conversion_score + points : currentScoring.conversion_score,
          score_tier: newTier,
          last_activity: new Date(),
        };

        await storage.updateLeadScoring(userId, updatedScoring);
        
        appLogger.info('Lead score updated:', {
          action: 'lead_score_updated',
          metadata: {
            userId,
            eventType,
            points,
            old_total: currentScoring.total_score,
            new_total: newTotalScore,
            tier_change: currentTier !== newTier ? { from: currentTier, to: newTier } : null,
          },
        });
        
        if (currentTier !== newTier) {
          await this.triggerTierChangeAutomation(userId, newTier, currentTier);
        }
        
        await this.triggerScoreBasedAutomations(userId, newTotalScore);
      }

    } catch (error) {
      appLogger.error('Failed to update lead score:', error);
    }
  }

  calculateEventPoints(eventType, eventData) {
    switch (eventType) {
      case 'page_view':
        return this.scoringCriteria.page_view;
      
      case 'time_on_site':
        const minutes = eventData?.duration_minutes || 0;
        return Math.floor(minutes * this.scoringCriteria.time_on_site_minutes);
      
      case 'file_download':
        return this.scoringCriteria.file_download;
      
      case 'form_submit':
        return this.scoringCriteria.form_submit;
      
      case 'trial_signup':
        return this.scoringCriteria.trial_signup;
      
      case 'class_booking':
        return this.scoringCriteria.class_booking;
      
      case 'payment':
        return this.scoringCriteria.payment;
      
      case 'email_open':
        return this.scoringCriteria.email_open;
      
      case 'email_click':
        return this.scoringCriteria.email_click;
      
      case 'profile_update':
        return this.scoringCriteria.profile_update;
      
      case 'login':
        return this.scoringCriteria.login;
      
      default:
        return 0;
    }
  }

  calculateScoreTier(totalScore) {
    if (totalScore >= 100) return 'qualified';
    if (totalScore >= 50) return 'hot';
    if (totalScore >= 20) return 'warm';
    return 'cold';
  }

  async triggerTierChangeAutomation(userId, newTier, oldTier) {
    try {
      appLogger.info('Triggering tier change automation:', {
        action: 'tier_change_automation',
        metadata: { userId, newTier, oldTier },
      });

      const sequence = await storage.getEmailSequenceByType(`tier_${newTier}`);
      if (sequence) {
        await this.enrollUserInSequence(userId, sequence.id);
      }
    } catch (error) {
      appLogger.error('Failed to trigger tier change automation:', error);
    }
  }

  async triggerScoreBasedAutomations(userId, totalScore) {
    try {
      const milestones = [25, 50, 75, 100];
      
      for (const milestone of milestones) {
        if (totalScore === milestone) {
          const sequence = await storage.getEmailSequenceByType(`milestone_${milestone}`);
          if (sequence) {
            await this.enrollUserInSequence(userId, sequence.id);
          }
        }
      }
    } catch (error) {
      appLogger.error('Failed to trigger score-based automations:', error);
    }
  }

  async enrollUserInSequence(userId, sequenceId) {
    try {
      appLogger.info('User enrolled in email sequence:', {
        action: 'sequence_enrollment',
        metadata: { userId, sequenceId },
      });
      
    } catch (error) {
      appLogger.error('Failed to enroll user in sequence:', error);
    }
  }

  async createABTest(testData) {
    try {
      const test = await storage.createAbTest({
        name: testData.name,
        description: testData.description,
        test_type: testData.test_type,
        traffic_allocation: testData.traffic_allocation,
        status: 'draft',
        start_date: new Date(),
      });

      for (const variantData of testData.variants) {
        await storage.createAbTestVariant({
          test_id: test.id,
          variant_name: variantData.name,
          variant_config: JSON.stringify(variantData.config),
          traffic_weight: variantData.weight || 50,
        });
      }

      appLogger.info('A/B test created:', {
        action: 'ab_test_created',
        metadata: { testId: test.id, name: test.name, variants: testData.variants.length },
      });

      return test;
    } catch (error) {
      appLogger.error('Failed to create A/B test:', error);
      throw error;
    }
  }

  async startABTest(testId) {
    try {
      await storage.updateAbTest(testId, {
        status: 'active',
        start_date: new Date(),
      });

      appLogger.info('A/B test started:', {
        action: 'ab_test_started',
        metadata: { testId },
      });
    } catch (error) {
      appLogger.error('Failed to start A/B test:', error);
      throw error;
    }
  }

  async stopABTest(testId, winnerVariant) {
    try {
      await storage.updateAbTest(testId, {
        status: 'completed',
        end_date: new Date(),
        winner_variant: winnerVariant,
      });

      appLogger.info('A/B test stopped:', {
        action: 'ab_test_stopped',
        metadata: { testId, winnerVariant },
      });
    } catch (error) {
      appLogger.error('Failed to stop A/B test:', error);
      throw error;
    }
  }

  async getABTestResults(testId) {
    try {
      const test = await storage.getAbTest(testId);
      if (!test) throw new Error('A/B test not found');

      const variants = await storage.getAbTestVariants(testId);
      
      const results = {
        test,
        variants: await Promise.all(variants.map(async (variant) => {
          const executions = await storage.getEmailCampaignExecutions(testId);
          
          const totalSent = executions.length;
          const totalOpened = executions.filter(e => e.opened_at).length;
          const totalClicked = executions.filter(e => e.first_click_at).length;
          
          return {
            ...variant,
            metrics: {
              total_sent: totalSent,
              total_opened: totalOpened,
              total_clicked: totalClicked,
              open_rate: totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(2) : 0,
              click_rate: totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(2) : 0,
            }
          };
        }))
      };

      return results;
    } catch (error) {
      appLogger.error('Failed to get A/B test results:', error);
      throw error;
    }
  }

  async updateScoreTier(userId, totalScore) {
    let tier = 'cold';
    
    if (totalScore >= 100) tier = 'qualified';
    else if (totalScore >= 50) tier = 'hot';
    else if (totalScore >= 20) tier = 'warm';
    
    appLogger.info('Lead tier would be updated:', {
      action: 'lead_tier_update',
      metadata: { userId, totalScore, tier },
    });
    
  }

  async triggerEmailSequence(userId, sequenceType, triggerEvent) {
    try {
      const profile = await storage.getProfile(userId);
      if (!profile) {
        appLogger.warn('User profile not found for email sequence:', {
          action: 'email_sequence_profile_not_found',
          metadata: { userId, sequenceType },
        });
        return;
      }

      if (sequenceType === 'welcome') {
        await this.triggerWelcomeSequence(profile);
      }

      appLogger.info('Email sequence triggered:', {
        action: 'email_sequence_triggered',
        metadata: {
          userId,
          sequenceType,
          triggerEvent,
          email: profile.email,
        },
      });

    } catch (error) {
      appLogger.error('Failed to trigger email sequence:', error);
    }
  }

  async triggerWelcomeSequence(profile) {
    await emailService.sendWelcomeEmail(profile);

    appLogger.info('Welcome sequence initiated:', {
      action: 'welcome_sequence_initiated',
      metadata: {
        userId: profile.id,
        email: profile.email,
      },
    });
  }

  async executeCampaign(campaignId) {
    try {
      appLogger.info('Campaign execution would start:', {
        action: 'campaign_execution_start',
        metadata: { campaignId },
      });
      
    } catch (error) {
      appLogger.error('Failed to execute campaign:', error);
    }
  }

  startAutomationJobs() {
    cron.schedule('*/15 * * * *', async () => {
      await this.processScheduledEmails();
    });

    cron.schedule('0 * * * *', async () => {
      await this.processLeadScoreUpdates();
    });

    cron.schedule('0 9 * * *', async () => {
      await this.processTrialReminders();
    });

    cron.schedule('*/30 * * * *', async () => {
      await this.processScheduledCampaigns();
    });

    appLogger.info('Marketing automation background jobs started');
  }

  async handleSendGridEvent(event) {
    try {
      const { event: eventType, email, timestamp, sg_event_id, sg_message_id } = event;

      const execution = await storage.getEmailCampaignExecutionByMessageId(sg_message_id);
      if (!execution) {
        appLogger.warn('Email execution not found for SendGrid event:', {
          action: 'sendgrid_event_orphaned',
          metadata: { eventType, email, sg_message_id },
        });
        return;
      }

      switch (eventType) {
        case 'delivered':
          await storage.updateEmailCampaignExecution(execution.id, {
            delivered_at: new Date(timestamp * 1000),
          });
          break;

        case 'open':
          await storage.updateEmailCampaignExecution(execution.id, {
            opened_at: execution.opened_at || new Date(timestamp * 1000),
            total_opens: (execution.total_opens || 0) + 1,
          });
          
          if (execution.user_id) {
            await this.trackUserEvent({
              user_id: execution.user_id,
              event_type: 'email_open',
              event_name: 'Email Opened',
              event_data: { campaign_id: execution.campaign_id, email_id: sg_message_id },
            });
          }
          break;

        case 'click':
          await storage.updateEmailCampaignExecution(execution.id, {
            first_click_at: execution.first_click_at || new Date(timestamp * 1000),
            total_clicks: (execution.total_clicks || 0) + 1,
          });

          if (execution.user_id) {
            await this.trackUserEvent({
              user_id: execution.user_id,
              event_type: 'email_click',
              event_name: 'Email Link Clicked',
              event_data: { 
                campaign_id: execution.campaign_id, 
                email_id: sg_message_id,
                url: event.url 
              },
            });
          }
          break;

        case 'bounce':
        case 'blocked':
          await storage.updateEmailCampaignExecution(execution.id, {
            bounced_at: new Date(timestamp * 1000),
            bounce_reason: event.reason || event.type,
          });

          await this.addToSuppressionList(email, 'bounce', event.reason);
          break;

        case 'spam_report':
          await storage.updateEmailCampaignExecution(execution.id, {
            spam_reported_at: new Date(timestamp * 1000),
          });

          await this.addToSuppressionList(email, 'spam', 'User reported as spam');
          break;

        case 'unsubscribe':
          await storage.updateEmailCampaignExecution(execution.id, {
            unsubscribed_at: new Date(timestamp * 1000),
          });

          await this.addToSuppressionList(email, 'unsubscribe', 'User unsubscribed');
          break;

        default:
          appLogger.debug('Unhandled SendGrid event type:', {
            action: 'sendgrid_event_unhandled',
            metadata: { eventType, sg_message_id },
          });
      }

      appLogger.info('SendGrid event processed:', {
        action: 'sendgrid_event_processed',
        metadata: {
          event_type: eventType,
          email,
          sg_message_id,
        },
      });

    } catch (error) {
      appLogger.error('Failed to handle SendGrid webhook event:', error);
    }
  }

  async processScheduledEmails() {
    try {
      appLogger.debug('Processing scheduled emails...');
      
    } catch (error) {
      appLogger.error('Failed to process scheduled emails:', error);
    }
  }

  async processLeadScoreUpdates() {
    try {
      appLogger.debug('Processing lead score updates...');
      
    } catch (error) {
      appLogger.error('Failed to process lead score updates:', error);
    }
  }

  async processTrialReminders() {
    try {
      appLogger.debug('Processing trial reminders...');
      
    } catch (error) {
      appLogger.error('Failed to process trial reminders:', error);
    }
  }

  async processScheduledCampaigns() {
    try {
      appLogger.debug('Processing scheduled campaigns...');
      
    } catch (error) {
      appLogger.error('Failed to process scheduled campaigns:', error);
    }
  }

  async selectVariant(testId, userId) {
    try {
      const variants = await storage.getAbTestVariants(testId);
      if (variants.length === 0) {
        throw new Error('No variants found for A/B test');
      }

      const hash = crypto.createHash('sha256')
        .update(`${testId}-${userId}`)
        .digest('hex');
      
      const hashValue = parseInt(hash.substring(0, 8), 16);
      
      const totalWeight = variants.reduce((sum, v) => sum + v.traffic_weight, 0);
      const normalizedHash = (hashValue % 100) / 100;
      
      let cumulativeWeight = 0;
      for (const variant of variants) {
        cumulativeWeight += variant.traffic_weight / totalWeight;
        if (normalizedHash < cumulativeWeight) {
          return variant;
        }
      }
      
      return variants[variants.length - 1];
    } catch (error) {
      appLogger.error('Failed to select A/B test variant:', error);
      const variants = await storage.getAbTestVariants(testId);
      return variants[0];
    }
  }

  async trackABTestEvent(testId, variantId, eventType, userId, eventData) {
    try {
      appLogger.info('A/B test event tracked:', {
        action: 'ab_test_event_tracked',
        metadata: {
          test_id: testId,
          variant_id: variantId,
          event_type: eventType,
          user_id: userId
        },
      });

      const variant = await storage.getAbTestVariant(variantId);
      if (!variant) return;

      const updates = {};
      
      switch (eventType) {
        case 'impression':
          updates.impressions = (variant.impressions || 0) + 1;
          break;
        case 'sent':
          updates.impressions = (variant.impressions || 0) + 1;
          break;
        case 'open':
          updates.clicks = (variant.clicks || 0) + 1;
          break;
        case 'click':
          updates.clicks = (variant.clicks || 0) + 1;
          break;
        case 'conversion':
          updates.conversions = (variant.conversions || 0) + 1;
          break;
      }

      if (Object.keys(updates).length > 0) {
        if (updates.conversions && updates.impressions) {
          updates.conversion_rate = (updates.conversions / updates.impressions) * 100;
        }
        await storage.updateAbTestVariant(variantId, updates);
      }
    } catch (error) {
      appLogger.error('Failed to track A/B test event:', error);
    }
  }

  async evaluateABTestWinner(testId) {
    try {
      const test = await storage.getAbTest(testId);
      if (!test || test.status !== 'running') {
        return null;
      }

      const variants = await storage.getAbTestVariants(testId);
      if (variants.length < 2) {
        return null;
      }

      let bestVariant = variants[0];
      let bestConversionRate = bestVariant.conversion_rate || 0;
      
      for (const variant of variants) {
        const conversionRate = variant.conversion_rate || 0;
        if (conversionRate > bestConversionRate && variant.impressions > 100) {
          bestVariant = variant;
          bestConversionRate = conversionRate;
        }
      }

      if (bestVariant.impressions > 1000 && bestConversionRate > 0.05) {
        return bestVariant.id;
      }

      return null;
    } catch (error) {
      appLogger.error('Failed to evaluate A/B test winner:', error);
      return null;
    }
  }

  async rolloutWinnerVariant(testId, winnerVariantId) {
    try {
      const campaigns = await storage.getCampaignsByAbTest(testId);
      
      for (const campaign of campaigns) {
        await storage.updateMarketingCampaign(campaign.id, {
          ab_test_id: null,
          template_id: winnerVariantId
        });
      }

      appLogger.info('A/B test winner rolled out:', {
        action: 'ab_test_winner_rollout',
        metadata: {
          test_id: testId,
          winner_variant_id: winnerVariantId,
          campaigns_updated: campaigns.length
        }
      });
    } catch (error) {
      appLogger.error('Failed to rollout A/B test winner:', error);
    }
  }

  async sendCampaignEmail(campaignId, userId) {
    try {
      const campaign = await storage.getMarketingCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const user = await storage.getProfile(userId);
      if (!user || !user.email) {
        throw new Error('User not found or no email');
      }

      const isUnsubscribed = await this.checkSuppressionList(user.email);
      if (isUnsubscribed) {
        appLogger.warn('Email suppressed - user in suppression list:', {
          email: user.email,
          campaign_id: campaignId
        });
        return false;
      }

      let templateId = campaign.template_id;
      let variantId = null;

      if (campaign.ab_test_id) {
        const variant = await this.selectVariant(campaign.ab_test_id, userId);
        templateId = variant.template_id;
        variantId = variant.id;
        
        await this.trackABTestEvent(campaign.ab_test_id, variant.id, 'impression', userId);
      }

      const template = await storage.getEmailTemplate(templateId);
      if (!template) {
        throw new Error('Email template not found');
      }

      const success = await emailService.sendEmail({
        to: user.email,
        subject: campaign.subject_line,
        html: template.html_content,
        text: template.text_content,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true }
        },
        customArgs: {
          campaign_id: campaignId,
          user_id: userId,
          template_id: templateId,
          ab_test_id: campaign.ab_test_id || '',
          variant_id: variantId || ''
        }
      });

      if (success) {
        await storage.createEmailCampaignExecution({
          campaign_id: campaignId,
          user_id: userId,
          template_id: templateId,
          email_subject: campaign.subject_line,
          email_content: template.html_content,
          recipient_email: user.email,
          ab_test_id: campaign.ab_test_id,
          variant_name: variantId,
          delivery_status: 'sent'
        });

        if (campaign.ab_test_id && variantId) {
          await this.trackABTestEvent(campaign.ab_test_id, variantId, 'sent', userId);
        }

        appLogger.info('Campaign email sent successfully:', {
          action: 'campaign_email_sent',
          metadata: {
            campaign_id: campaignId,
            user_id: userId,
            template_id: templateId,
            ab_test_id: campaign.ab_test_id,
            variant_id: variantId
          }
        });
        
        return true;
      }

      return false;
    } catch (error) {
      appLogger.error('Failed to send campaign email:', error, {
        action: 'campaign_email_failed',
        metadata: {
          campaign_id: campaignId,
          user_id: userId
        }
      });
      return false;
    }
  }

  async processCampaign(campaignId) {
    try {
      if (this.campaignExecutionInProgress.has(campaignId)) {
        appLogger.warn('Campaign execution already in progress:', { campaignId });
        return;
      }

      this.campaignExecutionInProgress.add(campaignId);

      try {
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
          throw new Error('Campaign not found');
        }

        if (campaign.status !== 'scheduled' && campaign.status !== 'active') {
          appLogger.warn('Campaign not in executable state:', {
            campaignId,
            status: campaign.status
          });
          return;
        }

        const targetUsers = await storage.getCampaignTargetAudience(campaignId);
        
        appLogger.info('Processing campaign:', {
          action: 'campaign_processing_started',
          metadata: {
            campaign_id: campaignId,
            target_users: targetUsers.length,
            campaign_name: campaign.name
          }
        });

        let successCount = 0;
        let failureCount = 0;

        for (const user of targetUsers) {
          try {
            const success = await this.sendCampaignEmail(campaignId, user.id);
            if (success) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch (error) {
            failureCount++;
            appLogger.error('Failed to send campaign email to user:', error, {
              campaignId,
              userId: user.id
            });
          }
        }

        await storage.updateMarketingCampaign(campaignId, {
          total_sent: successCount,
          status: successCount > 0 ? 'active' : 'failed',
          started_at: new Date()
        });

        appLogger.info('Campaign processing completed:', {
          action: 'campaign_processing_completed',
          metadata: {
            campaign_id: campaignId,
            success_count: successCount,
            failure_count: failureCount,
            total_target: targetUsers.length
          }
        });

      } finally {
        this.campaignExecutionInProgress.delete(campaignId);
      }
    } catch (error) {
      appLogger.error('Failed to process campaign:', error, {
        action: 'campaign_processing_failed',
        metadata: { campaign_id: campaignId }
      });
      
      await this.scheduleRetry(campaignId);
    }
  }

  async scheduleRetry(campaignId) {
    try {
      const campaign = await storage.getMarketingCampaign(campaignId);
      if (!campaign) return;

      const retryCount = campaign.retry_count || 0;
      if (retryCount >= this.retryDelays.length) {
        appLogger.error('Campaign max retries exceeded:', { campaignId, retryCount });
        await storage.updateMarketingCampaign(campaignId, {
          status: 'failed',
          error_message: 'Max retries exceeded'
        });
        return;
      }

      const delayMinutes = this.retryDelays[retryCount];
      const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await storage.updateMarketingCampaign(campaignId, {
        status: 'scheduled',
        scheduled_at: retryAt,
        retry_count: retryCount + 1
      });

      appLogger.info('Campaign retry scheduled:', {
        action: 'campaign_retry_scheduled',
        metadata: {
          campaign_id: campaignId,
          retry_count: retryCount + 1,
          retry_at: retryAt,
          delay_minutes: delayMinutes
        }
      });
    } catch (error) {
      appLogger.error('Failed to schedule campaign retry:', error);
    }
  }

  async checkSuppressionList(email) {
    try {
      const suppression = await storage.getEmailSuppression(email);
      return !!suppression;
    } catch (error) {
      appLogger.error('Failed to check suppression list:', error);
      return false;
    }
  }

  async addToSuppressionList(email, reason, description, messageId, campaignId, userId) {
    try {
      await storage.createEmailSuppression({
        email,
        reason: reason,
        description,
        sg_message_id: messageId,
        campaign_id: campaignId,
        user_id: userId
      });

      appLogger.info('Email added to suppression list:', {
        action: 'email_suppressed',
        metadata: {
          email,
          reason,
          description,
          campaign_id: campaignId,
          user_id: userId
        }
      });
    } catch (error) {
      appLogger.error('Failed to add email to suppression list:', error);
    }
  }

  async updateCampaignExecutionMetrics(event) {
    try {
      const execution = await storage.getEmailCampaignExecutionByMessageId(event.sg_message_id);
      if (!execution) return;

      const updates = {};
      
      switch (event.event) {
        case 'delivered':
          updates.delivered_at = new Date(event.timestamp * 1000);
          updates.delivery_status = 'delivered';
          break;
        case 'open':
          if (!execution.opened_at) {
            updates.opened_at = new Date(event.timestamp * 1000);
          }
          updates.total_opens = (execution.total_opens || 0) + 1;
          break;
        case 'click':
          if (!execution.first_click_at) {
            updates.first_click_at = new Date(event.timestamp * 1000);
          }
          updates.last_click_at = new Date(event.timestamp * 1000);
          updates.total_clicks = (execution.total_clicks || 0) + 1;
          break;
        case 'unsubscribe':
        case 'group_unsubscribe':
          updates.unsubscribed_at = new Date(event.timestamp * 1000);
          break;
        case 'bounce':
        case 'dropped':
          updates.delivery_status = 'bounced';
          updates.error_message = event.reason || 'Email bounced';
          break;
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateEmailCampaignExecution(execution.id, updates);
      }
    } catch (error) {
      appLogger.error('Failed to update campaign execution metrics:', error);
    }
  }

  async getHealthStatus() {
    try {
      const scheduledCampaigns = await storage.getScheduledCampaigns();
      const runningAbTests = await storage.getRunningAbTests();
      const suppressionListSize = await storage.getSuppressionListSize();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        marketing_automation: {
          initialized: this.isInitialized,
          scheduled_campaigns: scheduledCampaigns.length,
          running_ab_tests: runningAbTests.length,
          campaigns_in_progress: this.campaignExecutionInProgress.size,
          suppression_list_size: suppressionListSize
        },
        last_job_runs: {
          scheduled_campaigns: new Date().toISOString(),
          email_processing: new Date().toISOString(),
          lead_scoring: new Date().toISOString()
        }
      };
    } catch (error) {
      appLogger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async ensureDefaultScoringRules() {
    try {
      appLogger.info('Default lead scoring rules would be ensured');
    } catch (error) {
      appLogger.error('Failed to ensure default scoring rules:', error);
    }
  }

  async getLeadScoreBreakdown(userId) {
    try {
      return {
        userId,
        totalScore: 0,
        tier: 'cold',
        breakdown: {
          engagement_score: 0,
          interaction_score: 0,
          conversion_score: 0,
          behavior_score: 0,
          recency_score: 0,
        },
        recentEvents: [],
      };
    } catch (error) {
      appLogger.error('Failed to get lead score breakdown:', error);
      return null;
    }
  }

  async getUserEventHistory(userId, limit = 50) {
    try {
      appLogger.info('User event history requested:', {
        action: 'user_event_history_requested',
        metadata: { userId, limit },
      });
      return [];
    } catch (error) {
      appLogger.error('Failed to get user event history:', error);
      return [];
    }
  }

  async handleEmailWebhook(eventData) {
    try {
      await emailService.handleEmailEvent(eventData);
      
      const userId = eventData.userId || eventData.customArgs?.user_id;
      
      if (userId) {
        await this.trackUserEvent({
          user_id: userId,
          event_type: eventData.event || 'email_interaction',
          event_name: `email_${eventData.event}`,
          event_data: eventData,
        });
      }
      
    } catch (error) {
      appLogger.error('Failed to handle email webhook:', error);
    }
  }
}

export const marketingAutomation = new MarketingAutomationService();
