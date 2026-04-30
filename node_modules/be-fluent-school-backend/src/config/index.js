import { z } from 'zod';
import { appLogger } from '../utils/logger.js';

const DatabaseConfigSchema = z.object({
  url: z.string().url('DATABASE_URL must be a valid URL'),
  maxConnections: z.number().min(1).max(100).default(20),
  idleTimeout: z.number().min(1000).max(300000).default(30000),
  connectionTimeout: z.number().min(1000).max(60000).default(10000),
});

const SessionConfigSchema = z.object({
  secret: z.string().min(64, 'SESSION_SECRET must be at least 64 characters'),
  name: z.string().default('be-fluent-session'),
  maxAge: z.number().min(60000).max(86400000).default(86400000),
  secure: z.boolean().default(false),
  httpOnly: z.boolean().default(true),
  sameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
});


const SMTPConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().min(1).max(65535).optional(),
  secure: z.boolean().default(false),
  user: z.string().optional(),
  password: z.string().optional(),
  from: z.string().email().optional(),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(true),
  maxFiles: z.string().default('30d'),
  maxSize: z.string().default('20m'),
  datePattern: z.string().default('YYYY-MM-DD'),
});

const MonitoringConfigSchema = z.object({
  healthCheckInterval: z.number().min(10000).max(300000).default(60000),
  metricsCollection: z.boolean().default(true),
  performanceTracking: z.boolean().default(true),
  alerting: z.boolean().default(true),
});

const SecurityConfigSchema = z.object({
  rateLimitEnabled: z.boolean().default(true),
  rateLimitWindow: z.number().min(60000).max(3600000).default(900000),
  rateLimitMax: z.number().min(1).max(10000).default(100),
  helmetEnabled: z.boolean().default(true),
  corsEnabled: z.boolean().default(true),
  corsAllowedOrigins: z.array(z.string()).default([]),
  contentSecurityPolicy: z.boolean().default(true),
  contentSecurityPolicyDirectives: z.record(z.array(z.string())).default({
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https:"],
    styleSrc: ["'self'", "https:"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  }),
  hstsEnabled: z.boolean().default(true),
  hstsMaxAge: z.number().min(0).default(63072000),
  hstsIncludeSubDomains: z.boolean().default(true),
});

const AppConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().min(1).max(65535).default(5000),
  host: z.string().default('0.0.0.0'),
  version: z.string().default('1.0.0'),
  timezone: z.string().default('America/Sao_Paulo'),
  gracefulShutdownTimeout: z.number().min(5000).max(120000).default(30000),
});

const ConfigSchema = z.object({
  app: AppConfigSchema,
  database: DatabaseConfigSchema,
  session: SessionConfigSchema,
  smtp: SMTPConfigSchema,
  logging: LoggingConfigSchema,
  monitoring: MonitoringConfigSchema,
  security: SecurityConfigSchema,
});

class ConfigManager {
  constructor() {
    this.config = null;
    this.environmentOverrides = {};
    this.runtimeConfig = new Map();
    
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.logConfiguration();
  }
  
  loadConfiguration() {
    const rawConfig = {
      app: {
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '5000', 10),
        host: process.env.HOST || '0.0.0.0',
        version: process.env.APP_VERSION || '1.0.0',
        timezone: process.env.TZ || 'America/Sao_Paulo',
        gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000', 10),
      },
      database: {
        url: process.env.DATABASE_URL || '',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
      },
      session: {
        secret: process.env.SESSION_SECRET || '',
        name: process.env.SESSION_NAME || 'be-fluent-session',
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
        secure: process.env.SESSION_SECURE === 'true',
        httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
        sameSite: process.env.SESSION_SAME_SITE || 'lax',
      },
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_FROM,
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false',
        maxFiles: process.env.LOG_MAX_FILES || '30d',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      },
      monitoring: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10),
        metricsCollection: process.env.METRICS_COLLECTION !== 'false',
        performanceTracking: process.env.PERFORMANCE_TRACKING !== 'false',
        alerting: process.env.ALERTING !== 'false',
      },
      security: {
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        helmetEnabled: process.env.HELMET_ENABLED !== 'false',
        corsEnabled: process.env.CORS_ENABLED !== 'false',
        corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
          ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
          : [],
        contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
        contentSecurityPolicyDirectives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https:"],
          styleSrc: ["'self'", "https:"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
        hstsEnabled: process.env.HSTS_ENABLED !== 'false',
        hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '63072000', 10),
        hstsIncludeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
      },
    };
    
    const envOverrides = this.getEnvironmentOverrides(rawConfig.app.environment);
    return this.mergeConfig(rawConfig, envOverrides);
  }
  
  getEnvironmentOverrides(environment) {
    switch (environment) {
      case 'production':
        return {
          logging: {
            level: 'info',
            enableConsole: false,
          },
          security: {
            rateLimitEnabled: true,
            helmetEnabled: true,
          },
          session: {
            secure: true,
          },
        };
      
      case 'staging':
        return {
          logging: {
            level: 'debug',
            enableConsole: true,
          },
          monitoring: {
            healthCheckInterval: 30000,
          },
        };
      
      case 'development':
        return {
          logging: {
            level: 'debug',
            enableConsole: true,
          },
          security: {
            rateLimitEnabled: false,
          },
          monitoring: {
            healthCheckInterval: 120000,
          },
        };
      
      default:
        return {};
    }
  }
  
  mergeConfig(base, overrides) {
    const merged = { ...base };
    
    for (const key in overrides) {
      if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
        merged[key] = { ...merged[key], ...overrides[key] };
      } else {
        merged[key] = overrides[key];
      }
    }
    
    return merged;
  }
  
  validateConfiguration() {
    try {
      this.config = ConfigSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
      }
      throw error;
    }

    const env = this.config.app.environment;
    if (env === 'production') {
      if (!this.config.security.corsAllowedOrigins || this.config.security.corsAllowedOrigins.length === 0) {
        throw new Error('Configuration validation failed:\nsecurity.corsAllowedOrigins: CORS_ALLOWED_ORIGINS must be provided in production');
      }

      if (!this.config.database.url) {
        throw new Error('Configuration validation failed:\ndatabase.url: DATABASE_URL is required in production');
      }
    }
  }
  
  logConfiguration() {
    const sanitizedConfig = this.sanitizeConfigForLogging(this.config);
    
    appLogger.info('Configuration loaded and validated', {
      action: 'config_loaded',
      metadata: {
        environment: this.config.app.environment,
        version: this.config.app.version,
        features: {
          database: !!this.config.database.url,
          smtp: !!this.config.smtp.host,
          monitoring: this.config.monitoring.metricsCollection,
          security: this.config.security.rateLimitEnabled,
        },
        config: sanitizedConfig,
      },
    });
  }
  
  sanitizeConfigForLogging(config) {
    const sanitized = JSON.parse(JSON.stringify(config));
    
    if (sanitized.database?.url) {
      sanitized.database.url = '[REDACTED]';
    }
    if (sanitized.session?.secret) {
      sanitized.session.secret = '[REDACTED]';
    }
    if (sanitized.smtp?.password) {
      sanitized.smtp.password = '[REDACTED]';
    }
    
    return sanitized;
  }
  
  get() {
    return this.config;
  }
  
  getApp() {
    return this.config.app;
  }
  
  getDatabase() {
    return this.config.database;
  }
  
  getSession() {
    return this.config.session;
  }
  
  getSMTP() {
    return this.config.smtp;
  }
  
  getLogging() {
    return this.config.logging;
  }
  
  getMonitoring() {
    return this.config.monitoring;
  }
  
  getSecurity() {
    return this.config.security;
  }

  getCorsAllowedOrigins() {
    return this.config.security.corsAllowedOrigins;
  }
  
  setRuntimeConfig(key, value) {
    this.runtimeConfig.set(key, value);
    appLogger.info(`Runtime configuration updated: ${key}`, {
      action: 'runtime_config_updated',
      metadata: { key, value: typeof value === 'object' ? '[OBJECT]' : value },
    });
  }
  
  getRuntimeConfig(key) {
    return this.runtimeConfig.get(key);
  }
  
  getAllRuntimeConfig() {
    return new Map(this.runtimeConfig);
  }
  
  isFeatureEnabled(feature) {
    const runtimeFlag = this.runtimeConfig.get(`feature.${feature}`);
    if (runtimeFlag !== undefined) {
      return runtimeFlag;
    }
    
    const envFlag = process.env[`FEATURE_${feature.toUpperCase()}`];
    if (envFlag !== undefined) {
      return envFlag === 'true';
    }
    
    const defaultFeatures = {
      'metrics_collection': this.config.monitoring.metricsCollection,
      'performance_tracking': this.config.monitoring.performanceTracking,
      'alerting': this.config.monitoring.alerting,
      'rate_limiting': this.config.security.rateLimitEnabled,
      'detailed_logging': this.config.app.environment === 'development',
    };
    
    return defaultFeatures[feature] || false;
  }
  
  enableFeature(feature) {
    this.setRuntimeConfig(`feature.${feature}`, true);
  }
  
  disableFeature(feature) {
    this.setRuntimeConfig(`feature.${feature}`, false);
  }
  
  updateConfig(updates) {
    try {
      const updatedConfig = this.mergeConfig(this.config, updates);
      ConfigSchema.parse(updatedConfig);
      
      this.config = updatedConfig;
      appLogger.info('Configuration hot-reloaded', {
        action: 'config_hot_reload',
        metadata: { updates },
      });
      
    } catch (error) {
      appLogger.error('Configuration hot-reload failed', error);
      throw error;
    }
  }
  
  healthCheck() {
    const details = {
      environment: this.config.app.environment,
      version: this.config.app.version,
    };
    
    let status = 'healthy';
    
    if (!this.config.database.url) {
      status = 'unhealthy';
      details.database = 'Database URL not configured';
    }
    
    if (this.config.app.environment === 'production') {
      if (!this.config.session.secret || this.config.session.secret.length < 32) {
        status = 'unhealthy';
        details.session = 'Session secret not properly configured for production';
      }
      
      if (!this.config.session.secure) {
        status = 'unhealthy';
        details.security = 'Secure sessions not enabled in production';
      }
    }
    
    return { status, details };
  }
}

export const configManager = new ConfigManager();
export const config = configManager.get();
