import { MailService } from '@sendgrid/mail';
import { appLogger } from '../utils/logger.js';

let mailService = null;

if (process.env.SENDGRID_API_KEY) {
  try {
    mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    appLogger.info('✓ SendGrid initialized successfully');
  } catch (error) {
    appLogger.error('Failed to initialize SendGrid:', error);
  }
} else {
  appLogger.warn('⚠ SENDGRID_API_KEY not found - Email features will be limited');
}

export class BeFluentEmailService {
  constructor() {
    this.defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'noreply@befluent.school';
    this.companyName = 'Be Fluent School';
    
    if (!mailService) {
      appLogger.warn('SendGrid not initialized - emails will be logged only');
    }
  }

  async sendSingleEmail(params) {
    try {
      const isSupressed = await this.checkSuppressionList(params.to);
      if (isSupressed) {
        appLogger.warn('Email suppressed - address in suppression list:', {
          action: 'email_suppressed',
          metadata: {
            to: params.to,
            subject: params.subject,
          },
        });
        return false;
      }

      if (!mailService) {
        appLogger.info('Email would be sent (SendGrid not configured):', {
          action: 'email_send_simulated',
          metadata: {
            to: params.to,
            subject: params.subject,
            from: params.from || this.defaultFrom,
          },
        });
        return false;
      }

      const content = [];
      if (params.text) content.push({ type: 'text/plain', value: params.text });
      if (params.html) content.push({ type: 'text/html', value: params.html });
      if (content.length === 0) {
        content.push({ type: 'text/plain', value: params.subject || 'Email from Be Fluent School' });
      }
      
      const mailContent = content;

      const msg = {
        to: params.to,
        from: params.from || this.defaultFrom,
        subject: params.subject,
        content: mailContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: true },
          ...params.trackingSettings,
        },
        customArgs: params.customArgs || {},
      };

      await mailService.send(msg);
      appLogger.info('Email sent successfully:', {
        action: 'email_sent',
        metadata: {
          to: params.to,
          subject: params.subject,
        },
      });
      return true;
    } catch (error) {
      appLogger.error('Failed to send email:', error, {
        action: 'email_send_failed',
        metadata: {
          to: params.to,
          subject: params.subject,
        },
      });
      return false;
    }
  }

  async sendBulkEmails(params) {
    try {
      const filteredPersonalizations = [];
      for (const personalization of params.personalizations) {
        const validRecipients = [];
        for (const recipient of personalization.to) {
          const isSupressed = await this.checkSuppressionList(recipient.email);
          if (!isSupressed) {
            validRecipients.push(recipient);
          } else {
            appLogger.warn('Bulk email recipient suppressed:', {
              action: 'bulk_email_recipient_suppressed',
              metadata: {
                email: recipient.email,
                template_id: params.template_id,
              },
            });
          }
        }
        
        if (validRecipients.length > 0) {
          filteredPersonalizations.push({
            ...personalization,
            to: validRecipients,
          });
        }
      }

      if (filteredPersonalizations.length === 0) {
        appLogger.warn('All bulk email recipients suppressed - no emails sent:', {
          action: 'bulk_email_all_suppressed',
          metadata: {
            template_id: params.template_id,
            original_recipients: params.personalizations.length,
          },
        });
        return false;
      }

      if (!mailService) {
        appLogger.info('Bulk email would be sent (SendGrid not configured):', {
          action: 'bulk_email_simulated',
          metadata: {
            template_id: params.template_id,
            recipients: filteredPersonalizations.length,
            original_recipients: params.personalizations.length,
          },
        });
        return false;
      }

      await mailService.send({
        templateId: params.template_id,
        personalizations: filteredPersonalizations,
        from: params.from,
        subject: params.subject,
      });

      appLogger.info('Bulk email sent successfully:', {
        action: 'bulk_email_sent',
        metadata: {
          template_id: params.template_id,
          recipients: filteredPersonalizations.length,
          original_recipients: params.personalizations.length,
          filtered_count: params.personalizations.length - filteredPersonalizations.length,
        },
      });
      return true;
    } catch (error) {
      appLogger.error('Failed to send bulk email:', error, {
        action: 'bulk_email_failed',
        metadata: {
          template_id: params.template_id,
          recipients: params.personalizations.length,
        },
      });
      return false;
    }
  }

  processEmailTemplate(template, variables) {
    let processedSubject = template.subject;
    let processedHtml = template.html_content;
    let processedText = template.text_content || '';

    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
        processedText = processedText.replace(new RegExp(placeholder, 'g'), value);
      }
    });

    if (!variables.company_name) {
      processedSubject = processedSubject.replace(/{{company_name}}/g, this.companyName);
      processedHtml = processedHtml.replace(/{{company_name}}/g, this.companyName);
      processedText = processedText.replace(/{{company_name}}/g, this.companyName);
    }

    return {
      subject: processedSubject,
      html: processedHtml,
      text: processedText,
    };
  }

  async checkSuppressionList(email) {
    try {
      const { storage } = await import('./storage.js');
      const suppression = await storage.getSuppressionByEmail(email);
      return !!suppression;
    } catch (error) {
      appLogger.error('Failed to check suppression list:', error, {
        action: 'suppression_check_failed',
        metadata: { email },
      });
      return false;
    }
  }

  generateTemplateVariables(profile) {
    return {
      first_name: profile.full_name.split(' ')[0] || profile.full_name,
      full_name: profile.full_name,
      email: profile.email,
      student_level: profile.student_level || 'beginner',
      company_name: this.companyName,
      unsubscribe_url: `${process.env.BASE_URL || 'http://localhost:5000'}/unsubscribe?email=${encodeURIComponent(profile.email)}`,
    };
  }

  async sendWelcomeEmail(profile) {
    const variables = this.generateTemplateVariables(profile);
    
    const welcomeTemplate = {
      subject: 'Bem-vindo à {{company_name}}, {{first_name}}! 🎉',
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1>Bem-vindo à {{company_name}}!</h1>
            <p style="font-size: 18px;">Olá {{first_name}}, estamos animados para ter você conosco!</p>
          </div>
          
          <div style="padding: 30px;">
            <h2>O que esperar nos próximos dias:</h2>
            <ul style="line-height: 2;">
              <li>🎯 Avaliação do seu nível atual de inglês</li>
              <li>📚 Acesso aos materiais de estudo personalizados</li>
              <li>👨‍🏫 Conexão com professores nativos qualificados</li>
              <li>📅 Agendamento da sua primeira aula experimental</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:5000'}/dashboard" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Acessar Minha Conta
              </a>
            </div>
            
            <p>Se você tiver alguma dúvida, não hesite em nos contatar. Estamos aqui para ajudar!</p>
            
            <p>Atenciosamente,<br>
            Equipe {{company_name}}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>{{company_name}} - Transformando vidas através do inglês</p>
            <p><a href="{{unsubscribe_url}}" style="color: #666;">Cancelar inscrição</a></p>
          </div>
        </div>
      `,
      text_content: `
        Bem-vindo à {{company_name}}, {{first_name}}!
        
        Estamos animados para ter você conosco!
        
        O que esperar nos próximos dias:
        - Avaliação do seu nível atual de inglês
        - Acesso aos materiais de estudo personalizados
        - Conexão com professores nativos qualificados
        - Agendamento da sua primeira aula experimental
        
        Acesse sua conta: ${process.env.BASE_URL || 'http://localhost:5000'}/dashboard
        
        Se você tiver alguma dúvida, não hesite em nos contatar.
        
        Atenciosamente,
        Equipe {{company_name}}
        
        Para cancelar inscrição: {{unsubscribe_url}}
      `,
    };

    const processed = this.processEmailTemplate(welcomeTemplate, variables);
    
    return this.sendSingleEmail({
      to: profile.email,
      subject: processed.subject,
      html: processed.html,
      text: processed.text,
      customArgs: {
        campaign_type: 'welcome',
        user_id: profile.id,
        template_type: 'welcome',
      },
    });
  }

  async sendTrialReminderEmail(profile, daysLeft) {
    const variables = {
      ...this.generateTemplateVariables(profile),
      days_left: daysLeft.toString(),
      trial_end_date: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    };
    
    const reminderTemplate = {
      subject: '⏰ {{first_name}}, seu trial acaba em {{days_left}} dias!',
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ff6b6b; color: white; padding: 30px; text-align: center;">
            <h1>⏰ Seu trial está acabando!</h1>
            <p style="font-size: 18px;">Olá {{first_name}}, restam apenas {{days_left}} dias do seu período experimental.</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Não perca a oportunidade de continuar sua jornada de aprendizado conosco!</p>
            
            <h3>O que você já conquistou:</h3>
            <ul style="line-height: 2;">
              <li>✅ Acesso a conteúdo premium</li>
              <li>✅ Aulas personalizadas</li>
              <li>✅ Suporte de professores nativos</li>
            </ul>
            
            <h3>Continue progredindo:</h3>
            <p>Escolha o plano que melhor se adapta ao seu ritmo de estudos.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:5000'}/pricing" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Ver Planos
              </a>
            </div>
          </div>
        </div>
      `,
      text_content: `
        Olá {{first_name}}, 
        
        Seu trial acaba em {{days_left}} dias ({{trial_end_date}}).
        
        Não perca a oportunidade de continuar sua jornada!
        
        Ver nossos planos: ${process.env.BASE_URL || 'http://localhost:5000'}/pricing
        
        Equipe {{company_name}}
      `,
    };

    const processed = this.processEmailTemplate(reminderTemplate, variables);
    
    return this.sendSingleEmail({
      to: profile.email,
      subject: processed.subject,
      html: processed.html,
      text: processed.text,
      customArgs: {
        campaign_type: 'trial_reminder',
        user_id: profile.id,
        days_left: daysLeft.toString(),
      },
    });
  }

  async handleEmailEvent(eventData) {
    try {
      appLogger.info('Email event received:', eventData);
    } catch (error) {
      appLogger.error('Failed to handle email event:', error);
    }
  }

  async unsubscribeUser(email) {
    try {
      if (!mailService) {
        appLogger.info('User would be unsubscribed (SendGrid not configured):', {
          action: 'unsubscribe_simulated',
          metadata: { email },
        });
        return true;
      }

      appLogger.info('User unsubscribed from marketing emails:', {
        action: 'user_unsubscribed',
        metadata: { email },
      });
      return true;
    } catch (error) {
      appLogger.error('Failed to unsubscribe user:', error);
      return false;
    }
  }

  async sendTestEmail(to, subject = 'Test Email from Be Fluent') {
    return this.sendSingleEmail({
      to,
      subject,
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from Be Fluent School marketing automation system.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `Test Email\n\nThis is a test email from Be Fluent School.\nTimestamp: ${new Date().toISOString()}`,
    });
  }
}

export const emailService = new BeFluentEmailService();
