import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, between, or, sql as sqlFunc, desc, asc } from "drizzle-orm";
import { 
  emailTemplates, emailSequences, emailSequenceSteps, marketingCampaigns,
  userEvents, leadScoring, leadScoringRules, abTests, abTestVariants,
  emailCampaignExecutions, marketingWorkflows, marketingAnalytics,
  profiles
} from "../../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export class MarketingDatabaseStorage {
  
  async getEmailTemplate(id) {
    const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
    return result[0];
  }

  async getEmailTemplatesByType(type) {
    const result = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.template_type, type))
      .orderBy(desc(emailTemplates.created_at));
    return result;
  }

  async getActiveEmailTemplates() {
    const result = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.is_active, true))
      .orderBy(desc(emailTemplates.created_at));
    return result;
  }

  async createEmailTemplate(template) {
    const result = await db.insert(emailTemplates).values(template).returning();
    return result[0];
  }

  async updateEmailTemplate(id, template) {
    const result = await db.update(emailTemplates)
      .set({ ...template, updated_at: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailTemplate(id) {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
    return result.length > 0;
  }

  async getEmailSequence(id) {
    const result = await db.select().from(emailSequences).where(eq(emailSequences.id, id)).limit(1);
    return result[0];
  }

  async getEmailSequenceByType(type) {
    const result = await db.select().from(emailSequences)
      .where(and(
        eq(emailSequences.sequence_type, type),
        eq(emailSequences.is_active, true)
      ))
      .limit(1);
    return result[0];
  }

  async getActiveEmailSequences() {
    const result = await db.select().from(emailSequences)
      .where(eq(emailSequences.is_active, true))
      .orderBy(desc(emailSequences.created_at));
    return result;
  }

  async createEmailSequence(sequence) {
    const result = await db.insert(emailSequences).values(sequence).returning();
    return result[0];
  }

  async updateEmailSequence(id, sequence) {
    const result = await db.update(emailSequences)
      .set({ ...sequence, updated_at: new Date() })
      .where(eq(emailSequences.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailSequence(id) {
    const result = await db.delete(emailSequences).where(eq(emailSequences.id, id)).returning();
    return result.length > 0;
  }

  async getEmailSequenceStep(id) {
    const result = await db.select().from(emailSequenceSteps).where(eq(emailSequenceSteps.id, id)).limit(1);
    return result[0];
  }

  async getEmailSequenceSteps(sequenceId) {
    const result = await db.select().from(emailSequenceSteps)
      .where(and(
        eq(emailSequenceSteps.sequence_id, sequenceId),
        eq(emailSequenceSteps.is_active, true)
      ))
      .orderBy(asc(emailSequenceSteps.step_order));
    return result;
  }

  async createEmailSequenceStep(step) {
    const result = await db.insert(emailSequenceSteps).values(step).returning();
    return result[0];
  }

  async updateEmailSequenceStep(id, step) {
    const result = await db.update(emailSequenceSteps)
      .set(step)
      .where(eq(emailSequenceSteps.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailSequenceStep(id) {
    const result = await db.delete(emailSequenceSteps).where(eq(emailSequenceSteps.id, id)).returning();
    return result.length > 0;
  }

  async getMarketingCampaign(id) {
    const result = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).limit(1);
    return result[0];
  }

  async getMarketingCampaigns(status, type) {
    const conditions = [];
    if (status) conditions.push(eq(marketingCampaigns.status, status));
    if (type) conditions.push(eq(marketingCampaigns.campaign_type, type));
    
    const baseQuery = db.select().from(marketingCampaigns);
    
    const result = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(marketingCampaigns.created_at))
      : await baseQuery.orderBy(desc(marketingCampaigns.created_at));
    
    return result;
  }

  async createMarketingCampaign(campaign) {
    const result = await db.insert(marketingCampaigns).values(campaign).returning();
    return result[0];
  }

  async updateMarketingCampaign(id, campaign) {
    const result = await db.update(marketingCampaigns)
      .set({ ...campaign, updated_at: new Date() })
      .where(eq(marketingCampaigns.id, id))
      .returning();
    return result[0];
  }

  async deleteMarketingCampaign(id) {
    const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id)).returning();
    return result.length > 0;
  }

  async getUserEvent(id) {
    const result = await db.select().from(userEvents).where(eq(userEvents.id, id)).limit(1);
    return result[0];
  }

  async getUserEvents(userId, limit = 50) {
    const result = await db.select().from(userEvents)
      .where(eq(userEvents.user_id, userId))
      .orderBy(desc(userEvents.timestamp))
      .limit(limit);
    return result;
  }

  async getUserEventsByType(userId, eventType, limit = 50) {
    const result = await db.select().from(userEvents)
      .where(and(
        eq(userEvents.user_id, userId),
        eq(userEvents.event_type, eventType)
      ))
      .orderBy(desc(userEvents.timestamp))
      .limit(limit);
    return result;
  }

  async createUserEvent(event) {
    const result = await db.insert(userEvents).values(event).returning();
    return result[0];
  }

  async getEventsSummary(userId, startDate, endDate) {
    const baseQuery = db.select({
      event_type: userEvents.event_type,
      count: sqlFunc`count(*)::int`,
    }).from(userEvents);

    const conditions = [eq(userEvents.user_id, userId)];
    if (startDate && endDate) {
      conditions.push(between(userEvents.timestamp, startDate, endDate));
    }

    const result = await baseQuery
      .where(and(...conditions))
      .groupBy(userEvents.event_type);

    return result.reduce((acc, row) => {
      acc[row.event_type] = row.count;
      return acc;
    }, {});
  }

  async getLeadScoring(id) {
    const result = await db.select().from(leadScoring).where(eq(leadScoring.id, id)).limit(1);
    return result[0];
  }

  async getLeadScoringByUserId(userId) {
    const result = await db.select().from(leadScoring).where(eq(leadScoring.user_id, userId)).limit(1);
    return result[0];
  }

  async getLeadsByTier(tier) {
    const result = await db.select().from(leadScoring)
      .where(eq(leadScoring.score_tier, tier))
      .orderBy(desc(leadScoring.total_score));
    return result;
  }

  async createLeadScoring(scoring) {
    const result = await db.insert(leadScoring).values(scoring).returning();
    return result[0];
  }

  async updateLeadScoring(userId, scoring) {
    const result = await db.update(leadScoring)
      .set({ ...scoring, updated_at: new Date() })
      .where(eq(leadScoring.user_id, userId))
      .returning();
    return result[0];
  }

  async getTopLeads(limit = 10) {
    const result = await db.select().from(leadScoring)
      .orderBy(desc(leadScoring.total_score))
      .limit(limit);
    return result;
  }

  async getLeadScoringRule(id) {
    const result = await db.select().from(leadScoringRules).where(eq(leadScoringRules.id, id)).limit(1);
    return result[0];
  }

  async getLeadScoringRules() {
    const result = await db.select().from(leadScoringRules).orderBy(desc(leadScoringRules.created_at));
    return result;
  }

  async getActiveLeadScoringRules() {
    const result = await db.select().from(leadScoringRules)
      .where(eq(leadScoringRules.is_active, true))
      .orderBy(desc(leadScoringRules.created_at));
    return result;
  }

  async createLeadScoringRule(rule) {
    const result = await db.insert(leadScoringRules).values(rule).returning();
    return result[0];
  }

  async updateLeadScoringRule(id, rule) {
    const result = await db.update(leadScoringRules)
      .set({ ...rule, updated_at: new Date() })
      .where(eq(leadScoringRules.id, id))
      .returning();
    return result[0];
  }

  async deleteLeadScoringRule(id) {
    const result = await db.delete(leadScoringRules).where(eq(leadScoringRules.id, id)).returning();
    return result.length > 0;
  }

  async getAbTest(id) {
    const result = await db.select().from(abTests).where(eq(abTests.id, id)).limit(1);
    return result[0];
  }

  async getAbTests(status) {
    const baseQuery = db.select().from(abTests);
    
    const result = status
      ? await baseQuery.where(eq(abTests.status, status)).orderBy(desc(abTests.created_at))
      : await baseQuery.orderBy(desc(abTests.created_at));
    
    return result;
  }

  async createAbTest(test) {
    const result = await db.insert(abTests).values(test).returning();
    return result[0];
  }

  async updateAbTest(id, test) {
    const result = await db.update(abTests)
      .set({ ...test, updated_at: new Date() })
      .where(eq(abTests.id, id))
      .returning();
    return result[0];
  }

  async deleteAbTest(id) {
    const result = await db.delete(abTests).where(eq(abTests.id, id)).returning();
    return result.length > 0;
  }

  async getAbTestVariant(id) {
    const result = await db.select().from(abTestVariants).where(eq(abTestVariants.id, id)).limit(1);
    return result[0];
  }

  async getAbTestVariants(testId) {
    const result = await db.select().from(abTestVariants)
      .where(eq(abTestVariants.test_id, testId))
      .orderBy(asc(abTestVariants.variant_name));
    return result;
  }

  async createAbTestVariant(variant) {
    const result = await db.insert(abTestVariants).values(variant).returning();
    return result[0];
  }

  async updateAbTestVariant(id, variant) {
    const result = await db.update(abTestVariants)
      .set(variant)
      .where(eq(abTestVariants.id, id))
      .returning();
    return result[0];
  }

  async deleteAbTestVariant(id) {
    const result = await db.delete(abTestVariants).where(eq(abTestVariants.id, id)).returning();
    return result.length > 0;
  }

  async getEmailCampaignExecution(id) {
    const result = await db.select().from(emailCampaignExecutions)
      .where(eq(emailCampaignExecutions.id, id)).limit(1);
    return result[0];
  }

  async getEmailCampaignExecutions(campaignId, userId) {
    const conditions = [];
    if (campaignId) conditions.push(eq(emailCampaignExecutions.campaign_id, campaignId));
    if (userId) conditions.push(eq(emailCampaignExecutions.user_id, userId));
    
    const baseQuery = db.select().from(emailCampaignExecutions);
    
    const result = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(emailCampaignExecutions.sent_at))
      : await baseQuery.orderBy(desc(emailCampaignExecutions.sent_at));
    
    return result;
  }

  async createEmailCampaignExecution(execution) {
    const result = await db.insert(emailCampaignExecutions).values(execution).returning();
    return result[0];
  }

  async updateEmailExecutionTracking(id, trackingData) {
    const result = await db.update(emailCampaignExecutions)
      .set(trackingData)
      .where(eq(emailCampaignExecutions.id, id))
      .returning();
    return result[0];
  }

  async getMarketingWorkflow(id) {
    const result = await db.select().from(marketingWorkflows).where(eq(marketingWorkflows.id, id)).limit(1);
    return result[0];
  }

  async getMarketingWorkflows(isActive) {
    const baseQuery = db.select().from(marketingWorkflows);
    
    const result = isActive !== undefined
      ? await baseQuery.where(eq(marketingWorkflows.is_active, isActive)).orderBy(desc(marketingWorkflows.created_at))
      : await baseQuery.orderBy(desc(marketingWorkflows.created_at));
    
    return result;
  }

  async createMarketingWorkflow(workflow) {
    const result = await db.insert(marketingWorkflows).values(workflow).returning();
    return result[0];
  }

  async updateMarketingWorkflow(id, workflow) {
    const result = await db.update(marketingWorkflows)
      .set({ ...workflow, updated_at: new Date() })
      .where(eq(marketingWorkflows.id, id))
      .returning();
    return result[0];
  }

  async deleteMarketingWorkflow(id) {
    const result = await db.delete(marketingWorkflows).where(eq(marketingWorkflows.id, id)).returning();
    return result.length > 0;
  }

  async getMarketingAnalytics(date, metricType) {
    const conditions = [eq(marketingAnalytics.date, date)];
    if (metricType) {
      conditions.push(eq(marketingAnalytics.metric_type, metricType));
    }
    
    const result = await db.select().from(marketingAnalytics)
      .where(and(...conditions))
      .orderBy(desc(marketingAnalytics.created_at));
    
    return result;
  }

  async createMarketingAnalytics(analytics) {
    const result = await db.insert(marketingAnalytics).values(analytics).returning();
    return result[0];
  }

  async getCampaignPerformance(campaignId) {
    const executions = await db.select({
      total_sent: sqlFunc`count(*)::int`,
      total_delivered: sqlFunc`count(*) filter (where delivery_status = 'delivered')::int`,
      total_opened: sqlFunc`sum(case when opened_at is not null then 1 else 0 end)::int`,
      total_clicked: sqlFunc`sum(total_clicks)::int`,
      unique_opens: sqlFunc`count(*) filter (where opened_at is not null)::int`,
    }).from(emailCampaignExecutions)
      .where(eq(emailCampaignExecutions.campaign_id, campaignId))
      .groupBy(emailCampaignExecutions.campaign_id);

    return executions[0] || {
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      unique_opens: 0,
    };
  }

  async getEmailPerformance(templateId) {
    const executions = await db.select({
      total_sent: sqlFunc`count(*)::int`,
      total_delivered: sqlFunc`count(*) filter (where delivery_status = 'delivered')::int`,
      total_opened: sqlFunc`sum(case when opened_at is not null then 1 else 0 end)::int`,
      total_clicked: sqlFunc`sum(total_clicks)::int`,
      avg_open_rate: sqlFunc`avg(case when opened_at is not null then 1.0 else 0.0 end) * 100`,
    }).from(emailCampaignExecutions)
      .where(eq(emailCampaignExecutions.template_id, templateId))
      .groupBy(emailCampaignExecutions.template_id);

    return executions[0] || {
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      avg_open_rate: 0,
    };
  }

  async getConversionFunnel(startDate, endDate) {
    const funnelData = await db.select({
      stage: userEvents.event_type,
      count: sqlFunc`count(distinct user_id)::int`,
    }).from(userEvents)
      .where(between(userEvents.timestamp, startDate, endDate))
      .groupBy(userEvents.event_type);

    return funnelData.reduce((acc, row) => {
      acc[row.stage] = row.count;
      return acc;
    }, {});
  }
}

export const marketingStorage = new MarketingDatabaseStorage();
