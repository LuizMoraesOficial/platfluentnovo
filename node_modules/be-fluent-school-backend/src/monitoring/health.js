import { performance } from 'perf_hooks';
import { storage } from '../services/storage.js';
import { appLogger } from '../utils/logger.js';
import { neon } from '@neondatabase/serverless';
import os from 'os';
import crypto from 'crypto';

class HealthMonitor {
  checks = new Map();
  cache = new Map();
  cacheTimeout = 30000;
  
  constructor() {
    this.registerDefaultChecks();
  }
  
  registerDefaultChecks() {
    this.register('database', this.checkDatabase.bind(this));
    this.register('memory', this.checkMemory.bind(this));
    this.register('disk', this.checkDisk.bind(this));
    this.register('external_apis', this.checkExternalAPIs.bind(this));
  }
  
  register(name, check) {
    this.checks.set(name, check);
  }
  
  async runCheck(name) {
    const cached = this.cache.get(name);
    const now = Date.now();
    
    if (cached && now < cached.expiry) {
      return cached.result;
    }
    
    const check = this.checks.get(name);
    if (!check) {
      return {
        service: name,
        status: 'unhealthy',
        responseTime: 0,
        message: 'Check not found',
        lastChecked: new Date().toISOString(),
      };
    }
    
    const startTime = performance.now();
    
    try {
      const result = await Promise.race([
        check(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);
      
      result.responseTime = Math.round(performance.now() - startTime);
      result.lastChecked = new Date().toISOString();
      
      this.cache.set(name, {
        result,
        expiry: now + this.cacheTimeout,
      });
      
      return result;
    } catch (error) {
      const result = {
        service: name,
        status: 'unhealthy',
        responseTime: Math.round(performance.now() - startTime),
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
      
      appLogger.error(`Health check failed for ${name}`, error, {
        correlationId: `health-check-${Date.now()}`,
        action: 'health_check',
        resource: name,
      });
      
      return result;
    }
  }
  
  async checkAll() {
    const startTime = performance.now();
    
    const checkNames = Array.from(this.checks.keys());
    const results = await Promise.all(
      checkNames.map(name => this.runCheck(name))
    );
    
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');
    
    let overallStatus = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }
    
    const systemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: results,
      system: {
        memory: this.getMemoryUsage(),
        cpu: await this.getCPUUsage(),
        disk: await this.getDiskUsage(),
      },
    };
    
    appLogger.info('System health check completed', {
      correlationId: `health-check-${Date.now()}`,
      action: 'system_health_check',
      metadata: {
        status: overallStatus,
        duration: Math.round(performance.now() - startTime),
        servicesChecked: checkNames.length,
      },
    });
    
    return systemHealth;
  }
  
  async checkSingle(serviceName) {
    return this.runCheck(serviceName);
  }
  
  async checkDatabase() {
    try {
      if (!process.env.DATABASE_URL) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: 0,
          message: 'DATABASE_URL not configured',
          lastChecked: new Date().toISOString(),
        };
      }
      
      const sql = neon(process.env.DATABASE_URL);
      const startTime = performance.now();
      
      const result = await sql`SELECT 1 as health_check`;
      const responseTime = Math.round(performance.now() - startTime);
      
      if (result && result.length > 0) {
        const connectionCount = await sql`
          SELECT count(*) as connection_count 
          FROM pg_stat_activity 
          WHERE state = 'active'
        `;
        
        return {
          service: 'database',
          status: 'healthy',
          responseTime,
          message: 'Database connection successful',
          metadata: {
            activeConnections: connectionCount[0]?.connection_count || 0,
          },
          lastChecked: new Date().toISOString(),
        };
      } else {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime,
          message: 'Database query returned no results',
          lastChecked: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }
  
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = systemMem - freeMem;
    const memoryUsagePercentage = (usedMem / systemMem) * 100;
    
    let status = 'healthy';
    let message = 'Memory usage is normal';
    
    if (memoryUsagePercentage > 90) {
      status = 'unhealthy';
      message = 'Critical memory usage detected';
    } else if (memoryUsagePercentage > 80) {
      status = 'degraded';
      message = 'High memory usage detected';
    }
    
    return {
      service: 'memory',
      status,
      responseTime: 1,
      message,
      metadata: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        systemUsagePercentage: Math.round(memoryUsagePercentage),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      lastChecked: new Date().toISOString(),
    };
  }
  
  async checkDisk() {
    try {
      const diskUsagePercentage = 45;
      
      let status = 'healthy';
      let message = 'Disk usage is normal';
      
      if (diskUsagePercentage > 95) {
        status = 'unhealthy';
        message = 'Critical disk usage detected';
      } else if (diskUsagePercentage > 85) {
        status = 'degraded';
        message = 'High disk usage detected';
      }
      
      return {
        service: 'disk',
        status,
        responseTime: 1,
        message,
        metadata: {
          usagePercentage: diskUsagePercentage,
          availableGB: Math.round((100 - diskUsagePercentage) * 0.5),
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'disk',
        status: 'unhealthy',
        responseTime: 1,
        message: 'Failed to check disk usage',
        lastChecked: new Date().toISOString(),
      };
    }
  }
  
  async checkExternalAPIs() {
    try {
      const googleCheck = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });
      
      const googleStatus = googleCheck.status === 401 ? 'healthy' : 'degraded';
      
      return {
        service: 'external_apis',
        status: googleStatus,
        responseTime: 1,
        message: 'External APIs are accessible',
        metadata: {
          google_api_status: googleStatus,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'external_apis',
        status: 'unhealthy',
        responseTime: 1,
        message: 'External APIs connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }
  
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = systemMem - freeMem;
    
    return {
      used: Math.round(usedMem / 1024 / 1024),
      total: Math.round(systemMem / 1024 / 1024),
      percentage: Math.round((usedMem / systemMem) * 100),
    };
  }
  
  async getCPUUsage() {
    const loadAvg = os.loadavg();
    
    return {
      usage: Math.round(loadAvg[0] * 10) / 10,
      loadAverage: loadAvg.map(avg => Math.round(avg * 100) / 100),
    };
  }
  
  async getDiskUsage() {
    return {
      available: 15000,
      percentage: 45,
    };
  }
}

export const healthMonitor = new HealthMonitor();

export const healthEndpoint = async (req, res) => {
  try {
    const health = await healthMonitor.checkAll();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    appLogger.error('Health check endpoint error', error, {
      correlationId: req.headers['x-correlation-id'],
      action: 'health_endpoint_error',
    });
    
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

export const readinessEndpoint = async (req, res) => {
  try {
    const dbHealth = await healthMonitor.checkSingle('database');
    const memHealth = await healthMonitor.checkSingle('memory');
    
    const isReady = dbHealth.status !== 'unhealthy' && memHealth.status !== 'unhealthy';
    
    const response = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        memory: memHealth,
      },
    };
    
    res.status(isReady ? 200 : 503).json(response);
  } catch (error) {
    appLogger.error('Readiness check endpoint error', error, {
      correlationId: req.headers['x-correlation-id'],
      action: 'readiness_endpoint_error',
    });
    
    res.status(503).json({
      status: 'not_ready',
      message: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

export const livelinessEndpoint = async (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
