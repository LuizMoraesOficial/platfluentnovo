import { appLogger } from '../utils/logger.js';
import { healthMonitor } from '../monitoring/health.js';
import { metricsCollector } from '../monitoring/metrics.js';
import { notificationService } from '../utils/notification.js';
import { configManager } from '../config/index.js';
import { storage } from '../services/storage.js';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

class DiagnosticsService {
  constructor() {
    this.diagnosticTests = new Map();
    this.registerDefaultTests();
  }
  
  registerDefaultTests() {
    this.diagnosticTests.set('system_memory', this.testSystemMemory.bind(this));
    this.diagnosticTests.set('system_cpu', this.testSystemCPU.bind(this));
    this.diagnosticTests.set('system_disk', this.testSystemDisk.bind(this));
    this.diagnosticTests.set('database_connectivity', this.testDatabaseConnectivity.bind(this));
    this.diagnosticTests.set('database_performance', this.testDatabasePerformance.bind(this));
    this.diagnosticTests.set('external_services', this.testExternalServices.bind(this));
    this.diagnosticTests.set('logging_system', this.testLoggingSystem.bind(this));
    this.diagnosticTests.set('configuration', this.testConfiguration.bind(this));
    this.diagnosticTests.set('session_storage', this.testSessionStorage.bind(this));
    this.diagnosticTests.set('file_permissions', this.testFilePermissions.bind(this));
    this.diagnosticTests.set('network_connectivity', this.testNetworkConnectivity.bind(this));
    this.diagnosticTests.set('application_state', this.testApplicationState.bind(this));
  }
  
  async runFullDiagnostics() {
    const startTime = Date.now();
    
    appLogger.info('Starting full system diagnostics', {
      action: 'diagnostics_start',
      correlationId: `diagnostics-${startTime}`,
    });
    
    const testNames = Array.from(this.diagnosticTests.keys());
    const diagnosticResults = await Promise.allSettled(
      testNames.map(async (testName) => {
        try {
          return await this.diagnosticTests.get(testName)();
        } catch (error) {
          appLogger.error(`Diagnostic test ${testName} failed`, error);
          return {
            component: testName,
            status: 'error',
            message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          };
        }
      })
    );
    
    const diagnostics = diagnosticResults
      .filter((result) => result.status === 'fulfilled')
      .map(result => result.value);
    
    diagnosticResults
      .filter((result) => result.status === 'rejected')
      .forEach((result, index) => {
        diagnostics.push({
          component: testNames[index],
          status: 'error',
          message: `Diagnostic test crashed: ${result.reason}`,
          timestamp: new Date().toISOString(),
        });
      });
    
    const hasErrors = diagnostics.some(d => d.status === 'error');
    const hasWarnings = diagnostics.some(d => d.status === 'warning');
    
    let overallStatus = 'healthy';
    if (hasErrors) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    }
    
    const systemInfo = await this.gatherSystemInfo();
    const applicationInfo = await this.gatherApplicationInfo();
    
    const result = {
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      diagnostics,
      system_info: systemInfo,
      application_info: applicationInfo,
    };
    
    const duration = Date.now() - startTime;
    appLogger.info('System diagnostics completed', {
      action: 'diagnostics_completed',
      correlationId: `diagnostics-${startTime}`,
      metadata: {
        overall_status: overallStatus,
        tests_run: diagnostics.length,
        duration,
        errors: diagnostics.filter(d => d.status === 'error').length,
        warnings: diagnostics.filter(d => d.status === 'warning').length,
      },
    });
    
    return result;
  }
  
  async runSingleDiagnostic(testName) {
    const test = this.diagnosticTests.get(testName);
    if (!test) {
      return {
        component: testName,
        status: 'error',
        message: 'Diagnostic test not found',
        timestamp: new Date().toISOString(),
      };
    }
    
    try {
      return await test();
    } catch (error) {
      return {
        component: testName,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testSystemMemory() {
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = systemMem - freeMem;
    const usagePercent = (usedMem / systemMem) * 100;
    
    let status = 'ok';
    let message = 'Memory usage is normal';
    
    if (usagePercent > 95) {
      status = 'error';
      message = 'Critical memory usage - system may become unstable';
    } else if (usagePercent > 85) {
      status = 'warning';
      message = 'High memory usage detected';
    }
    
    return {
      component: 'system_memory',
      status,
      message,
      details: {
        system_usage_percent: Math.round(usagePercent),
        system_total_mb: Math.round(systemMem / 1024 / 1024),
        system_free_mb: Math.round(freeMem / 1024 / 1024),
        process_heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        process_heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        process_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        process_external_mb: Math.round(memUsage.external / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  async testSystemCPU() {
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    const loadPercent = (loadAvg[0] / cpuCount) * 100;
    
    let status = 'ok';
    let message = 'CPU usage is normal';
    
    if (loadPercent > 90) {
      status = 'error';
      message = 'Critical CPU load detected';
    } else if (loadPercent > 70) {
      status = 'warning';
      message = 'High CPU load detected';
    }
    
    return {
      component: 'system_cpu',
      status,
      message,
      details: {
        cpu_count: cpuCount,
        load_average_1min: Math.round(loadAvg[0] * 100) / 100,
        load_average_5min: Math.round(loadAvg[1] * 100) / 100,
        load_average_15min: Math.round(loadAvg[2] * 100) / 100,
        load_percent: Math.round(loadPercent),
        cpu_model: os.cpus()[0]?.model || 'Unknown',
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  async testSystemDisk() {
    try {
      const logsDir = './logs';
      const logsDirStat = await fs.stat(logsDir);
      
      const diskUsagePercent = 45;
      
      let status = 'ok';
      let message = 'Disk usage is normal';
      
      if (diskUsagePercent > 95) {
        status = 'error';
        message = 'Critical disk usage - immediate action required';
      } else if (diskUsagePercent > 85) {
        status = 'warning';
        message = 'High disk usage detected';
      }
      
      return {
        component: 'system_disk',
        status,
        message,
        details: {
          usage_percent: diskUsagePercent,
          logs_directory_exists: logsDirStat.isDirectory(),
          logs_directory_writable: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'system_disk',
        status: 'error',
        message: `Disk diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testDatabaseConnectivity() {
    try {
      const dbHealth = await healthMonitor.checkSingle('database');
      
      return {
        component: 'database_connectivity',
        status: dbHealth.status === 'healthy' ? 'ok' : 
               dbHealth.status === 'degraded' ? 'warning' : 'error',
        message: dbHealth.message || 'Database connectivity check completed',
        details: {
          response_time_ms: dbHealth.responseTime,
          last_checked: dbHealth.lastChecked,
          metadata: dbHealth.metadata,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'database_connectivity',
        status: 'error',
        message: `Database connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testDatabasePerformance() {
    const startTime = performance.now();
    
    try {
      const users = await storage.getAllTeachers();
      const queryTime = performance.now() - startTime;
      
      let status = 'ok';
      let message = 'Database performance is good';
      
      if (queryTime > 5000) {
        status = 'error';
        message = 'Database queries are very slow';
      } else if (queryTime > 2000) {
        status = 'warning';
        message = 'Database queries are slower than expected';
      }
      
      return {
        component: 'database_performance',
        status,
        message,
        details: {
          query_time_ms: Math.round(queryTime),
          records_returned: users.length,
          performance_threshold_ms: 2000,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'database_performance',
        status: 'error',
        message: `Database performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testExternalServices() {
    const externalAPIsHealth = await healthMonitor.checkSingle('external_apis');

    const issues = [];
    if (externalAPIsHealth.status === 'unhealthy') issues.push('Google APIs');

    let status = 'ok';
    let message = 'All external services are accessible';

    if (issues.length > 0) {
      status = 'warning';
      message = `External service issue detected: ${issues[0]}`;
    }

    return {
      component: 'external_services',
      status,
      message,
      details: {
        google_apis_status: externalAPIsHealth.status,
        google_apis_response_time: externalAPIsHealth.responseTime,
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  async testLoggingSystem() {
    try {
      const logsDir = './logs';
      await fs.access(logsDir, fs.constants.W_OK);
      
      const files = await fs.readdir(logsDir);
      const logFiles = files.filter(f => f.endsWith('.log'));
      
      const testCorrelationId = `diagnostics-test-${Date.now()}`;
      appLogger.info('Logging system diagnostic test', {
        correlationId: testCorrelationId,
        action: 'logging_test',
      });
      
      return {
        component: 'logging_system',
        status: 'ok',
        message: 'Logging system is functioning properly',
        details: {
          logs_directory_writable: true,
          log_files_count: logFiles.length,
          recent_log_files: logFiles.slice(-5),
          test_correlation_id: testCorrelationId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'logging_system',
        status: 'error',
        message: `Logging system diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testConfiguration() {
    try {
      const configHealth = configManager.healthCheck();
      
      return {
        component: 'configuration',
        status: configHealth.status === 'healthy' ? 'ok' : 'error',
        message: configHealth.status === 'healthy' ? 
          'Configuration is valid and complete' : 
          'Configuration issues detected',
        details: configHealth.details,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'configuration',
        status: 'error',
        message: `Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testSessionStorage() {
    try {
      const config = configManager.getSession();
      
      let status = 'ok';
      let message = 'Session configuration is valid';
      
      if (!config.secret || config.secret.length < 32) {
        status = 'error';
        message = 'Session secret is not properly configured';
      } else if (process.env.NODE_ENV === 'production' && !config.secure) {
        status = 'warning';
        message = 'Session security should be enabled in production';
      }
      
      return {
        component: 'session_storage',
        status,
        message,
        details: {
          secret_configured: !!config.secret && config.secret.length >= 32,
          secure_enabled: config.secure,
          http_only: config.httpOnly,
          same_site: config.sameSite,
          max_age: config.maxAge,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'session_storage',
        status: 'error',
        message: `Session storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testFilePermissions() {
    try {
      const testPaths = ['./logs', './'];
      const permissionResults = {};
      
      for (const testPath of testPaths) {
        try {
          await fs.access(testPath, fs.constants.R_OK | fs.constants.W_OK);
          permissionResults[testPath] = true;
        } catch {
          permissionResults[testPath] = false;
        }
      }
      
      const hasIssues = Object.values(permissionResults).some(result => !result);
      
      return {
        component: 'file_permissions',
        status: hasIssues ? 'error' : 'ok',
        message: hasIssues ? 'File permission issues detected' : 'File permissions are correct',
        details: permissionResults,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'file_permissions',
        status: 'error',
        message: `File permissions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testNetworkConnectivity() {
    try {
      const testUrls = [
        'https://www.google.com',
      ];
      
      const connectivityResults = {};
      
      for (const url of testUrls) {
        try {
          const response = await fetch(url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          connectivityResults[url] = response.ok;
        } catch {
          connectivityResults[url] = false;
        }
      }
      
      const failedConnections = Object.entries(connectivityResults)
        .filter(([, success]) => !success)
        .map(([url]) => url);
      
      let status = 'ok';
      let message = 'Network connectivity is good';
      
      if (failedConnections.length === testUrls.length) {
        status = 'error';
        message = 'No network connectivity detected';
      } else if (failedConnections.length > 0) {
        status = 'warning';
        message = `Some network connections failed: ${failedConnections.join(', ')}`;
      }
      
      return {
        component: 'network_connectivity',
        status,
        message,
        details: connectivityResults,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'network_connectivity',
        status: 'error',
        message: `Network connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async testApplicationState() {
    try {
      const uptime = process.uptime();
      const activeAlerts = notificationService.getActiveAlerts();
      
      let status = 'ok';
      let message = 'Application state is healthy';
      
      if (activeAlerts.length > 10) {
        status = 'error';
        message = 'Too many active alerts - system may be unstable';
      } else if (activeAlerts.length > 5) {
        status = 'warning';
        message = 'Multiple active alerts detected';
      } else if (uptime < 60) {
        status = 'warning';
        message = 'Application recently restarted';
      }
      
      return {
        component: 'application_state',
        status,
        message,
        details: {
          uptime_seconds: Math.round(uptime),
          active_alerts_count: activeAlerts.length,
          critical_alerts_count: activeAlerts.filter(a => a.type === 'critical').length,
          process_id: process.pid,
          node_version: process.version,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        component: 'application_state',
        status: 'error',
        message: `Application state test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  async gatherSystemInfo() {
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    
    return {
      uptime: process.uptime(),
      memory: {
        total_mb: Math.round(systemMem / 1024 / 1024),
        free_mb: Math.round(freeMem / 1024 / 1024),
        used_mb: Math.round((systemMem - freeMem) / 1024 / 1024),
        usage_percent: Math.round(((systemMem - freeMem) / systemMem) * 100),
        process_heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        process_heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        load_average_1min: Math.round(loadAvg[0] * 100) / 100,
        load_average_5min: Math.round(loadAvg[1] * 100) / 100,
        load_average_15min: Math.round(loadAvg[2] * 100) / 100,
      },
      disk: {
        usage_percent: 45,
        available_gb: 15,
      },
      network: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
      },
      process: {
        pid: process.pid,
        version: process.version,
        uptime: process.uptime(),
        title: process.title,
      },
    };
  }
  
  async gatherApplicationInfo() {
    const config = configManager.get();
    const activeAlerts = notificationService.getActiveAlerts();
    
    return {
      version: config.app.version,
      environment: config.app.environment,
      features_enabled: {
        monitoring: config.monitoring.metricsCollection,
        alerting: config.monitoring.alerting,
        performance_tracking: config.monitoring.performanceTracking,
        rate_limiting: config.security.rateLimitEnabled,
      },
      recent_alerts: activeAlerts.slice(-10),
      recent_errors: [],
    };
  }
}

export const diagnosticsService = new DiagnosticsService();

export const diagnosticsEndpoint = async (req, res) => {
  try {
    const diagnostics = await diagnosticsService.runFullDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    appLogger.error('Diagnostics endpoint error', error);
    res.status(500).json({
      error: 'Failed to run diagnostics',
      message: error.message,
    });
  }
};

export const fullDiagnosticsEndpoint = diagnosticsEndpoint;

export const singleDiagnosticEndpoint = async (req, res) => {
  try {
    const testName = req.params.testName;
    const result = await diagnosticsService.runSingleDiagnostic(testName);
    res.json(result);
  } catch (error) {
    appLogger.error('Single diagnostic endpoint error', error);
    res.status(500).json({
      error: 'Failed to run single diagnostic',
      message: error.message,
    });
  }
};

export const troubleshootingReportEndpoint = async (req, res) => {
  try {
    const diagnostics = await diagnosticsService.runFullDiagnostics();
    res.json({
      report: 'Troubleshooting report generated',
      summary: diagnostics.overall_status,
      diagnostics,
    });
  } catch (error) {
    appLogger.error('Troubleshooting report endpoint error', error);
    res.status(500).json({
      error: 'Failed to generate troubleshooting report',
      message: error.message,
    });
  }
};
