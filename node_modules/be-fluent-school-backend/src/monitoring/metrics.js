import client from 'prom-client';
import { appLogger } from '../utils/logger.js';
import os from 'os';

client.collectDefaultMetrics({
  prefix: 'befluent_',
  register: client.register,
});

export class MetricsCollector {
  httpRequestDuration;
  httpRequestsTotal;
  activeUsers;
  classesScheduled;
  classesCompleted;
  paymentTransactions;
  databaseQueries;
  cacheHits;
  cacheMisses;
  businessMetrics;
  systemMetrics;
  
  constructor() {
    this.httpRequestDuration = new client.Histogram({
      name: 'befluent_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });
    
    this.httpRequestsTotal = new client.Counter({
      name: 'befluent_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
    });
    
    this.activeUsers = new client.Gauge({
      name: 'befluent_active_users',
      help: 'Number of currently active users',
      labelNames: ['role'],
    });
    
    this.classesScheduled = new client.Counter({
      name: 'befluent_classes_scheduled_total',
      help: 'Total number of classes scheduled',
      labelNames: ['teacher_id', 'class_type'],
    });
    
    this.classesCompleted = new client.Counter({
      name: 'befluent_classes_completed_total',
      help: 'Total number of classes completed',
      labelNames: ['teacher_id', 'class_type', 'rating'],
    });
    
    this.paymentTransactions = new client.Counter({
      name: 'befluent_payment_transactions_total',
      help: 'Total number of payment transactions',
      labelNames: ['status', 'payment_method', 'currency'],
    });
    
    this.databaseQueries = new client.Histogram({
      name: 'befluent_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'success'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });
    
    this.cacheHits = new client.Counter({
      name: 'befluent_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });
    
    this.cacheMisses = new client.Counter({
      name: 'befluent_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });
    
    this.businessMetrics = new client.Gauge({
      name: 'befluent_business_metrics',
      help: 'Business metrics for Be Fluent School',
      labelNames: ['metric_name', 'period'],
    });
    
    this.systemMetrics = new client.Gauge({
      name: 'befluent_system_metrics',
      help: 'System metrics for Be Fluent School',
      labelNames: ['metric_name'],
    });
    
    this.startSystemMetricsCollection();
  }
  
  recordHttpRequest(method, route, statusCode, duration, userRole) {
    const labels = {
      method,
      route: this.normalizeRoute(route),
      status_code: statusCode.toString(),
      user_role: userRole || 'anonymous',
    };
    
    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestsTotal.inc(labels);
  }
  
  setActiveUsers(role, count) {
    this.activeUsers.set({ role }, count);
  }
  
  recordClassScheduled(teacherId, classType) {
    this.classesScheduled.inc({
      teacher_id: teacherId,
      class_type: classType,
    });
    
    appLogger.businessMetric('class_scheduled', 1, 'count', {
      action: 'class_scheduled',
      metadata: { teacherId, classType },
    });
  }
  
  recordClassCompleted(teacherId, classType, rating) {
    this.classesCompleted.inc({
      teacher_id: teacherId,
      class_type: classType,
      rating: rating.toString(),
    });
    
    appLogger.businessMetric('class_completed', 1, 'count', {
      action: 'class_completed',
      metadata: { teacherId, classType, rating },
    });
  }
  
  recordPaymentTransaction(status, paymentMethod, currency, amount) {
    this.paymentTransactions.inc({
      status,
      payment_method: paymentMethod,
      currency,
    });
    
    if (amount) {
      this.businessMetrics.set(
        { metric_name: 'revenue', period: 'current_month' },
        amount
      );
      
      appLogger.businessMetric('payment_transaction', amount, currency, {
        action: 'payment_processed',
        metadata: { status, paymentMethod, currency },
      });
    }
  }
  
  recordDatabaseQuery(operation, table, duration, success) {
    this.databaseQueries.observe(
      {
        operation,
        table,
        success: success.toString(),
      },
      duration
    );
  }
  
  recordCacheHit(cacheType) {
    this.cacheHits.inc({ cache_type: cacheType });
  }
  
  recordCacheMiss(cacheType) {
    this.cacheMisses.inc({ cache_type: cacheType });
  }
  
  setBusinessMetric(metricName, value, period = 'current') {
    this.businessMetrics.set({ metric_name: metricName, period }, value);
  }
  
  startSystemMetricsCollection() {
    setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        this.systemMetrics.set({ metric_name: 'heap_used_bytes' }, memUsage.heapUsed);
        this.systemMetrics.set({ metric_name: 'heap_total_bytes' }, memUsage.heapTotal);
        this.systemMetrics.set({ metric_name: 'external_bytes' }, memUsage.external);
        this.systemMetrics.set({ metric_name: 'rss_bytes' }, memUsage.rss);
        
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        this.systemMetrics.set({ metric_name: 'system_memory_used_bytes' }, usedMem);
        this.systemMetrics.set({ metric_name: 'system_memory_total_bytes' }, totalMem);
        this.systemMetrics.set({ metric_name: 'system_memory_usage_percent' }, (usedMem / totalMem) * 100);
        
        const loadAvg = os.loadavg();
        this.systemMetrics.set({ metric_name: 'cpu_load_1min' }, loadAvg[0]);
        this.systemMetrics.set({ metric_name: 'cpu_load_5min' }, loadAvg[1]);
        this.systemMetrics.set({ metric_name: 'cpu_load_15min' }, loadAvg[2]);
        
        this.systemMetrics.set({ metric_name: 'process_uptime_seconds' }, process.uptime());
        
      } catch (error) {
        appLogger.error('Failed to collect system metrics', error, {
          action: 'system_metrics_collection_error',
        });
      }
    }, 15000);
  }
  
  normalizeRoute(route) {
    return route
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\?.*$/, '');
  }
  
  getMetrics() {
    return client.register.metrics();
  }
  
  reset() {
    client.register.resetMetrics();
  }
}

export const metricsCollector = new MetricsCollector();

export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const userRole = req.user?.profile?.role;
    
    metricsCollector.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration,
      userRole
    );
  });
  
  next();
};

export const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await metricsCollector.getMetrics();
    res.end(metrics);
  } catch (error) {
    appLogger.error('Metrics endpoint error', error, {
      correlationId: req.headers['x-correlation-id'],
      action: 'metrics_endpoint_error',
    });
    
    res.status(500).send('Internal server error');
  }
};
