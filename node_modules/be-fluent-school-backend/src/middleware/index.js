import { appLogger, generateCorrelationId } from '../utils/logger.js';
import { metricsCollector } from '../monitoring/metrics.js';

export const correlationMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || 
                       req.headers['x-request-id'] || 
                       generateCorrelationId();
  
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  next();
};

export const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  req.startTime = startTime;
  
  const contentLength = req.headers['content-length'];
  req.requestSize = contentLength ? parseInt(contentLength, 10) : 0;
  
  appLogger.http('Incoming request', {
    correlationId: req.correlationId,
    userId: req.user?.id,
    userRole: req.user?.profile?.role,
    action: 'http_request',
    metadata: {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      contentLength: req.requestSize,
      headers: {
        contentType: req.headers['content-type'],
        authorization: req.headers.authorization ? 'Bearer [REDACTED]' : undefined,
        accept: req.headers.accept,
      },
    },
  });
  
  const originalJson = res.json;
  const originalSend = res.send;
  let responseData;
  let responseSize = 0;
  
  res.json = function (body) {
    responseData = body;
    responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    return originalJson.call(this, body);
  };
  
  res.send = function (body) {
    if (!responseData) {
      responseData = body;
      responseSize = Buffer.byteLength(body?.toString() || '', 'utf8');
    }
    return originalSend.call(this, body);
  };
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userRole = req.user?.profile?.role;
    
    metricsCollector.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration / 1000,
      userRole
    );
    
    let logLevel = 'info';
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logLevel = 'warn';
    } else if (res.statusCode >= 500) {
      logLevel = 'error';
    }
    
    const logData = {
      correlationId: req.correlationId,
      userId: req.user?.id,
      userRole: req.user?.profile?.role,
      action: 'http_response',
      metadata: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        requestSize: req.requestSize,
        responseSize,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
      },
    };
    
    const message = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;
    
    switch (logLevel) {
      case 'error':
        appLogger.error(message, undefined, logData);
        break;
      case 'warn':
        appLogger.warn(message, logData);
        break;
      default:
        appLogger.http(message, logData);
        break;
    }
    
    if (duration > 3000) {
      appLogger.warn('Slow request detected', {
        correlationId: req.correlationId,
        userId: req.user?.id,
        action: 'slow_request',
        metadata: {
          method: req.method,
          url: req.url,
          duration,
          threshold: 3000,
        },
      });
    }
  });
  
  next();
};

export const performanceMiddleware = (req, res, next) => {
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endMemory = process.memoryUsage();
    const duration = Date.now() - req.startTime;
    
    appLogger.performance({
      operation: 'http_request',
      duration,
      success: res.statusCode < 400,
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      memoryUsage: endMemory,
      correlationId: req.correlationId,
    });
    
    const memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
      rss: endMemory.rss - startMemory.rss,
    };
    
    if (Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024) {
      appLogger.warn('Significant memory usage in request', {
        correlationId: req.correlationId,
        action: 'memory_usage_alert',
        metadata: {
          method: req.method,
          url: req.url,
          duration,
          memoryDelta,
        },
      });
    }
  });
  
  next();
};

export const securityMiddleware = (req, res, next) => {
  if (req.path.includes('/api/auth/')) {
    appLogger.security('Authentication attempt', 'medium', {
      correlationId: req.correlationId,
      action: 'auth_attempt',
      metadata: {
        endpoint: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    });
  }
  
  if (req.path.includes('/api/admin/')) {
    appLogger.security('Admin endpoint access', 'high', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      userRole: req.user?.profile?.role,
      action: 'admin_access',
      metadata: {
        endpoint: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
      },
    });
  }
  
  if (req.path.includes('/api/payment/')) {
    appLogger.security('Payment endpoint access', 'high', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      action: 'payment_access',
      metadata: {
        endpoint: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
      },
    });
  }

  next();
};

export const errorHandlingMiddleware = (
  error,
  req,
  res,
  next
) => {
  const correlationId = req.correlationId || generateCorrelationId();
  
  appLogger.error('Request error', error, {
    correlationId,
    userId: req.user?.id,
    userRole: req.user?.profile?.role,
    action: 'request_error',
    metadata: {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    },
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (res.headersSent) {
    return next(error);
  }
  
  let statusCode = 500;
  if ('status' in error) {
    statusCode = error.status;
  } else if ('statusCode' in error) {
    statusCode = error.statusCode;
  }
  
  res.status(statusCode).json({
    error: isProduction ? 'Internal server error' : error.message,
    correlationId,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { stack: error.stack }),
  });
};

export const rateLimitExceededLogger = (req, res) => {
  appLogger.security('Rate limit exceeded', 'medium', {
    correlationId: req.correlationId || generateCorrelationId(),
    action: 'rate_limit_exceeded',
    metadata: {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      method: req.method,
    },
  });
};
