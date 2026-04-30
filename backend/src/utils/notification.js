import nodemailer from 'nodemailer';
import { appLogger } from '../utils/logger.js';
import { healthMonitor } from '../monitoring/health.js';
import cron from 'node-cron';

class NotificationService {
  constructor() {
    this.config = null;
    this.emailTransporter = null;
    this.alerts = new Map();
    this.alertRules = [];
    this.isInitialized = false;
    
    this.config = this.loadConfiguration();
    this.setupEmailTransporter();
    this.setupDefaultAlertRules();
    this.startHealthCheckMonitoring();
  }
  
  loadConfiguration() {
    return {
      email: {
        enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        smtp: {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER || '',
          password: process.env.SMTP_PASSWORD || '',
        },
        from: process.env.SMTP_FROM || 'noreply@befluent.school',
        to: process.env.ALERT_EMAILS?.split(',') || ['admin@befluent.school'],
      },
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#alerts',
      },
      discord: {
        enabled: !!process.env.DISCORD_WEBHOOK_URL,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      },
    };
  }
  
  setupEmailTransporter() {
    if (!this.config.email?.enabled) {
      appLogger.info('Email notifications disabled - SMTP not configured');
      return;
    }
    
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port,
        secure: this.config.email.smtp.secure,
        auth: {
          user: this.config.email.smtp.user,
          pass: this.config.email.smtp.password,
        },
      });
      
      appLogger.info('Email transporter configured successfully');
    } catch (error) {
      appLogger.error('Failed to configure email transporter', error);
    }
  }
  
  setupDefaultAlertRules() {
    this.alertRules = [
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        condition: (data) => data.system?.memory?.percentage > 85,
        severity: 'warning',
        description: 'Memory usage is above 85%',
        enabled: true,
        cooldown: 15,
      },
      {
        id: 'critical_memory_usage',
        name: 'Critical Memory Usage',
        condition: (data) => data.system?.memory?.percentage > 95,
        severity: 'critical',
        description: 'Memory usage is above 95%',
        enabled: true,
        cooldown: 5,
      },
      {
        id: 'database_unhealthy',
        name: 'Database Unhealthy',
        condition: (data) => {
          const dbService = data.services?.find((s) => s.service === 'database');
          return dbService?.status === 'unhealthy';
        },
        severity: 'critical',
        description: 'Database is unhealthy',
        enabled: true,
        cooldown: 5,
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (data) => data.errorRate > 5,
        severity: 'warning',
        description: 'HTTP error rate is above 5%',
        enabled: true,
        cooldown: 10,
      },
      {
        id: 'slow_response_times',
        name: 'Slow Response Times',
        condition: (data) => data.averageResponseTime > 5000,
        severity: 'warning',
        description: 'Average response time is above 5 seconds',
        enabled: true,
        cooldown: 15,
      },
      {
        id: 'external_service_down',
        name: 'External Service Down',
        condition: (data) => {
          const externalService = data.services?.find((s) => s.service === 'external_apis');
          return externalService?.status === 'unhealthy';
        },
        severity: 'warning',
        description: 'External service (Google APIs) is down',
        enabled: true,
        cooldown: 10,
      },
      {
        id: 'security_alert',
        name: 'Security Alert',
        condition: (data) => data.securityEvents > 10,
        severity: 'critical',
        description: 'High number of security events detected',
        enabled: true,
        cooldown: 5,
      },
    ];
  }
  
  startHealthCheckMonitoring() {
    if (process.env.NODE_ENV === 'development') {
      appLogger.info('Health check monitoring skipped in development');
      return;
    }
    cron.schedule('* * * * *', async () => {
      try {
        const healthData = await healthMonitor.checkAll();
        await this.processHealthData(healthData);
      } catch (error) {
        appLogger.error('Error in health monitoring', error);
      }
    });

    appLogger.info('Health check monitoring started');
  }
  
  async processHealthData(healthData) {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      if (rule.lastTriggered) {
        const timeSince = Date.now() - rule.lastTriggered.getTime();
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (timeSince < cooldownMs) {
          continue;
        }
      }
      
      try {
        if (rule.condition(healthData)) {
          await this.triggerAlert(rule, healthData);
          rule.lastTriggered = new Date();
        }
      } catch (error) {
        appLogger.error(`Error evaluating alert rule ${rule.id}`, error);
      }
    }
  }
  
  async triggerAlert(rule, data) {
    const alert = {
      id: `${rule.id}-${Date.now()}`,
      type: rule.severity,
      title: rule.name,
      message: rule.description,
      source: 'system-monitor',
      timestamp: new Date(),
      metadata: {
        rule: rule.id,
        healthData: data,
      },
    };
    
    this.alerts.set(alert.id, alert);
    
    const logLevel = rule.severity === 'critical' ? 'error' : 'warn';
    appLogger[logLevel](`Alert triggered: ${rule.name}`, {
      action: 'alert_triggered',
      metadata: {
        alertId: alert.id,
        severity: rule.severity,
        rule: rule.id,
      },
    });
    
    await this.sendNotifications(alert);
  }
  
  async sendNotifications(alert) {
    const promises = [];
    
    if (this.config.email?.enabled) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    if (this.config.slack?.enabled) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    if (this.config.discord?.enabled) {
      promises.push(this.sendDiscordAlert(alert));
    }
    
    try {
      await Promise.allSettled(promises);
      appLogger.info(`Notifications sent for alert: ${alert.title}`);
    } catch (error) {
      appLogger.error('Error sending notifications', error);
    }
  }
  
  async sendEmailAlert(alert) {
    if (!this.emailTransporter || !this.config.email) return;
    
    try {
      const subject = `[${alert.type.toUpperCase()}] Be Fluent School - ${alert.title}`;
      const html = this.generateEmailHTML(alert);
      
      await this.emailTransporter.sendMail({
        from: this.config.email.from,
        to: this.config.email.to,
        subject,
        html,
      });
      
      appLogger.info(`Email alert sent: ${alert.id}`);
    } catch (error) {
      appLogger.error('Failed to send email alert', error);
    }
  }
  
  async sendSlackAlert(alert) {
    if (!this.config.slack?.enabled) return;
    
    try {
      const color = alert.type === 'critical' ? 'danger' : 
                   alert.type === 'warning' ? 'warning' : 'good';
      
      const payload = {
        channel: this.config.slack.channel,
        username: 'Be Fluent Monitor',
        icon_emoji: ':warning:',
        attachments: [{
          color,
          title: `${alert.type.toUpperCase()}: ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
            {
              title: 'Source',
              value: alert.source,
              short: true,
            },
          ],
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        }],
      };
      
      const response = await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
      
      appLogger.info(`Slack alert sent: ${alert.id}`);
    } catch (error) {
      appLogger.error('Failed to send Slack alert', error);
    }
  }
  
  async sendDiscordAlert(alert) {
    if (!this.config.discord?.enabled) return;
    
    try {
      const color = alert.type === 'critical' ? 16711680 :
                   alert.type === 'warning' ? 16776960 :
                   65280;
      
      const payload = {
        embeds: [{
          title: `${alert.type.toUpperCase()}: ${alert.title}`,
          description: alert.message,
          color,
          timestamp: alert.timestamp.toISOString(),
          fields: [
            {
              name: 'Source',
              value: alert.source,
              inline: true,
            },
            {
              name: 'Alert ID',
              value: alert.id,
              inline: true,
            },
          ],
        }],
      };
      
      const response = await fetch(this.config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }
      
      appLogger.info(`Discord alert sent: ${alert.id}`);
    } catch (error) {
      appLogger.error('Failed to send Discord alert', error);
    }
  }
  
  generateEmailHTML(alert) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { background-color: ${alert.type === 'critical' ? '#dc3545' : alert.type === 'warning' ? '#ffc107' : '#28a745'}; color: white; padding: 20px; border-radius: 8px; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .metadata { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin-top: 15px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${alert.type.toUpperCase()}: ${alert.title}</h1>
          </div>
          
          <div class="content">
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Alert ID:</strong> ${alert.id}</p>
            
            ${alert.metadata ? `
              <div class="metadata">
                <strong>Additional Information:</strong>
                <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
          
          <p><em>This alert was generated automatically by Be Fluent School monitoring system.</em></p>
        </body>
      </html>
    `;
  }
  
  async sendCustomAlert(alert) {
    const fullAlert = {
      ...alert,
      id: `custom-${Date.now()}`,
      timestamp: new Date(),
    };
    
    this.alerts.set(fullAlert.id, fullAlert);
    await this.sendNotifications(fullAlert);
    
    return fullAlert.id;
  }
  
  resolveAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      appLogger.info(`Alert resolved: ${alert.title}`, {
        action: 'alert_resolved',
        metadata: { alertId, resolvedAt: alert.resolvedAt },
      });
    }
  }
  
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  getAllAlerts() {
    return Array.from(this.alerts.values());
  }
  
  addAlertRule(rule) {
    this.alertRules.push(rule);
    appLogger.info(`Alert rule added: ${rule.name}`);
  }
  
  removeAlertRule(ruleId) {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    appLogger.info(`Alert rule removed: ${ruleId}`);
  }
  
  getAlertRules() {
    return this.alertRules;
  }
}

export const notificationService = new NotificationService();
