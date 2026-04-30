import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  performance: 5,
  audit: 6,
  security: 7
};

const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
  format.printf((info) => {
    const enhanced = {
      ...info,
      service: 'be-fluent-school',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      hostname: process.env.HOSTNAME || 'localhost',
      pid: process.pid,
    };
    
    return JSON.stringify(enhanced);
  })
);

const developmentFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, action, ...meta } = info;
    let logLine = `${timestamp} [${level.toUpperCase()}]`;
    
    if (correlationId) logLine += ` [${correlationId}]`;
    if (userId) logLine += ` [User:${userId}]`;
    if (action) logLine += ` [${action}]`;
    
    logLine += `: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    
    return logLine;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: developmentFormat
  }));
}

const fileTransportConfig = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: productionFormat,
  auditFile: path.join(logsDir, '.audit.json')
};

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'application-%DATE%.log'),
  level: 'info',
}));

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'errors-%DATE%.log'),
  level: 'error',
}));

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'requests-%DATE%.log'),
  level: 'http',
}));

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'performance-%DATE%.log'),
  level: 'performance',
}));

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'audit-%DATE%.log'),
  level: 'audit',
}));

logger.add(new DailyRotateFile({
  ...fileTransportConfig,
  filename: path.join(logsDir, 'security-%DATE%.log'),
  level: 'security',
}));

class AppLogger {
  constructor() {
    this.logger = logger;
  }

  debug(message, context) {
    this.logger.debug(message, context);
  }

  info(message, context) {
    this.logger.info(message, context);
  }

  warn(message, context) {
    this.logger.warn(message, context);
  }

  error(message, error, context) {
    const errorData = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    } : {};
    
    this.logger.error(message, { ...errorData, ...context });
  }

  http(message, context) {
    this.logger.log('http', message, context);
  }

  performance(metrics) {
    this.logger.log('performance', 'Performance metric recorded', {
      type: 'performance',
      ...metrics
    });
  }

  audit(data) {
    this.logger.log('audit', `Audit: ${data.action}`, {
      type: 'audit',
      ...data
    });
  }

  security(event, severity, context) {
    this.logger.log('security', `Security event: ${event}`, {
      type: 'security',
      severity,
      ...context
    });
  }

  transaction(correlationId, phase, operation, details) {
    this.logger.info(`Transaction ${phase}: ${operation}`, {
      correlationId,
      transactionPhase: phase,
      operation,
      ...details
    });
  }
}

export function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function logWithCorrelation(level, message, correlationId, additionalData) {
  const logData = {
    correlationId,
    ...additionalData
  };

  switch (level) {
    case 'debug':
      logger.debug(message, logData);
      break;
    case 'info':
      logger.info(message, logData);
      break;
    case 'warn':
      logger.warn(message, logData);
      break;
    case 'error':
      logger.error(message, logData);
      break;
    default:
      logger.info(message, logData);
  }
}

export const appLogger = new AppLogger();
export { logger };

appLogger.info('Logger initialized successfully', {
  action: 'logger_init',
  metadata: {
    environment: process.env.NODE_ENV || 'development',
    logLevel: logger.level,
    transports: logger.transports.length,
    logsDirectory: logsDir,
  }
});
