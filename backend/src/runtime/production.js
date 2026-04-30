import express from "express";
import { appLogger } from "../utils/logger.js";
import { gracefulShutdown, shutdownMiddleware } from "../maintenance/graceful-shutdown.js";
import { healthEndpoint, readinessEndpoint, livelinessEndpoint } from "../monitoring/health.js";
import { metricsEndpoint, metricsMiddleware } from "../monitoring/metrics.js";
import { 
  correlationMiddleware, 
  requestLoggingMiddleware, 
  performanceMiddleware, 
  securityMiddleware,
  errorHandlingMiddleware
} from "../middleware/index.js";
import { fullDiagnosticsEndpoint, troubleshootingReportEndpoint, singleDiagnosticEndpoint } from "../utils/diagnostics.js";
import { notificationService } from "../utils/notification.js";
import { configManager } from "../config/index.js";

export function setupProductionMiddleware(app) {
  appLogger.info('Setting up production middleware', {
    action: 'production_middleware_setup',
    correlationId: `setup-${Date.now()}`,
  });

  app.use(correlationMiddleware);
  app.use(shutdownMiddleware);
  app.use(securityMiddleware);
  app.use(performanceMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(metricsMiddleware);
}

export function setupProductionEndpoints(app, server) {
  appLogger.info('Registering production monitoring endpoints', {
    action: 'production_endpoints_setup',
    correlationId: `setup-${Date.now()}`,
  });

  app.get('/health', healthEndpoint);
  app.get('/ready', readinessEndpoint);
  app.get('/live', livelinessEndpoint);
  app.get('/metrics', metricsEndpoint);

  app.get('/api/monitoring/health', healthEndpoint);
  app.get('/api/monitoring/ready', readinessEndpoint);
  app.get('/api/monitoring/metrics', metricsEndpoint);

  app.get('/api/monitoring/diagnostics', fullDiagnosticsEndpoint);
  app.get('/api/monitoring/diagnostics/:testName', singleDiagnosticEndpoint);
  app.get('/api/monitoring/troubleshooting-report', troubleshootingReportEndpoint);

  app.get('/api/monitoring/alerts', (req, res) => {
    try {
      const alerts = notificationService.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      appLogger.error('Failed to fetch alerts', error, {
        correlationId: req.correlationId,
        action: 'alerts_endpoint_error',
      });
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.get('/api/monitoring/config', (req, res) => {
    try {
      const configHealth = configManager.healthCheck();
      const runtimeConfig = Object.fromEntries(configManager.getAllRuntimeConfig().entries());

      res.json({
        health: configHealth,
        runtime_config: runtimeConfig,
        features: {
          metrics_collection: configManager.isFeatureEnabled('metrics_collection'),
          performance_tracking: configManager.isFeatureEnabled('performance_tracking'),
          alerting: configManager.isFeatureEnabled('alerting'),
          rate_limiting: configManager.isFeatureEnabled('rate_limiting'),
        },
      });
    } catch (error) {
      appLogger.error('Failed to fetch configuration', error, {
        correlationId: req.correlationId,
        action: 'config_endpoint_error',
      });
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  app.post('/api/monitoring/alerts/manual', async (req, res) => {
    try {
      const userRole = req.user?.profile?.role;

      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { type, title, message, source } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields: type, title, message' });
      }

      const alertId = await notificationService.sendCustomAlert({
        type,
        title,
        message,
        source: source || 'manual',
      });

      appLogger.audit({
        action: 'manual_alert_created',
        resource: 'alert',
        userId: req.user?.id,
        userRole,
        details: { alertId, type, title },
        correlationId: req.correlationId,
      });

      res.json({ alertId, message: 'Alert sent successfully' });
    } catch (error) {
      appLogger.error('Failed to send manual alert', error, {
        correlationId: req.correlationId,
        action: 'manual_alert_error',
      });
      res.status(500).json({ error: 'Failed to send alert' });
    }
  });

  app.use(errorHandlingMiddleware);

  if (server) {
    gracefulShutdown.registerServer(server);
    gracefulShutdown.registerDefaultHandlers();

    appLogger.info('Graceful shutdown handlers registered', {
      action: 'graceful_shutdown_registered',
    });
  }

  appLogger.info('Production features setup completed', {
    action: 'production_setup_completed',
    correlationId: `setup-${Date.now()}`,
    metadata: {
      endpoints_registered: [
        '/health', '/ready', '/live', '/metrics',
        '/api/monitoring/health', '/api/monitoring/ready', '/api/monitoring/metrics',
        '/api/monitoring/diagnostics', '/api/monitoring/troubleshooting-report',
        '/api/monitoring/alerts', '/api/monitoring/config'
      ],
      middleware_registered: [
        'correlationMiddleware', 'shutdownMiddleware', 'securityMiddleware',
        'performanceMiddleware', 'requestLoggingMiddleware', 'metricsMiddleware',
        'errorHandlingMiddleware'
      ],
      features_enabled: {
        health_checks: true,
        metrics_collection: true,
        diagnostics: true,
        alerting: true,
        graceful_shutdown: !!server,
      },
    },
  });

  return app;
}

export function setupProductionFeatures(app, server) {
  setupProductionMiddleware(app);
  return setupProductionEndpoints(app, server);
}

export function initializeBackgroundServices() {
  appLogger.info('Initializing background services', {
    action: 'background_services_init',
  });
  
  appLogger.info('Background services initialized successfully', {
    action: 'background_services_ready',
    metadata: {
      services: [
        'notification_service',
        'health_monitor', 
        'metrics_collector',
        'configuration_manager'
      ],
    },
  });
}

export async function sendStartupNotification() {
  try {
    const config = configManager.get();
    
    await notificationService.sendCustomAlert({
      type: 'info',
      title: 'Be Fluent School Application Started',
      message: `Application successfully started in ${config.app.environment} mode`,
      source: 'startup',
      metadata: {
        version: config.app.version,
        environment: config.app.environment,
        timestamp: new Date().toISOString(),
      },
    });
    
    appLogger.info('Startup notification sent', {
      action: 'startup_notification_sent',
    });
  } catch (error) {
    appLogger.error('Failed to send startup notification', error, {
      action: 'startup_notification_failed',
    });
  }
}

export async function performStartupHealthCheck() {
  if (process.env.NODE_ENV === 'development') {
    appLogger.info('Startup health check skipped in development');
    return { status: 'healthy', services: [] };
  }
  try {
    const { healthMonitor } = await import('../monitoring/health.js');
    const healthData = await healthMonitor.checkAll();
    
    appLogger.info('Startup health check completed', {
      action: 'startup_health_check',
      metadata: {
        overall_status: healthData.status,
        services_checked: healthData.services.length,
        unhealthy_services: healthData.services.filter(s => s.status === 'unhealthy').length,
      },
    });
    
    const unhealthyServices = healthData.services.filter(s => s.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      await notificationService.sendCustomAlert({
        type: 'critical',
        title: 'Unhealthy Services Detected on Startup',
        message: `${unhealthyServices.length} services are unhealthy: ${unhealthyServices.map(s => s.service).join(', ')}`,
        source: 'startup_health_check',
        metadata: { unhealthyServices },
      });
    }

    if (healthData.status === 'degraded') {
      console.warn('⚠ Startup health check: system degraded (non-critical services). Continuing.');
      healthData.status = 'healthy';
    }

    return healthData;
  } catch (error) {
    appLogger.error('Startup health check failed', error, {
      action: 'startup_health_check_failed',
    });
    
    await notificationService.sendCustomAlert({
      type: 'critical',
      title: 'Startup Health Check Failed',
      message: 'Failed to perform initial health check - system may not be functioning properly',
      source: 'startup_health_check_error',
    });

    return { status: 'unhealthy', services: [] };
  }
}
