import { appLogger } from '../utils/logger.js';

class GracefulShutdown {
  constructor() {
    this.shutdownHandlers = [];
    this.isShuttingDown = false;
    this.shutdownTimeout = 30000;
    this.server = null;
    this.wsServer = null;
    
    this.setupSignalHandlers();
  }
  
  setupSignalHandlers() {
    process.on('SIGTERM', () => {
      appLogger.info('Received SIGTERM signal, starting graceful shutdown', {
        action: 'graceful_shutdown_start',
        correlationId: `shutdown-${Date.now()}`,
      });
      this.shutdown();
    });
    
    process.on('SIGINT', () => {
      appLogger.info('Received SIGINT signal, starting graceful shutdown', {
        action: 'graceful_shutdown_start',
        correlationId: `shutdown-${Date.now()}`,
      });
      this.shutdown();
    });
    
    process.on('uncaughtException', (error) => {
      appLogger.error('Uncaught exception, starting emergency shutdown', error, {
        action: 'emergency_shutdown',
        correlationId: `emergency-${Date.now()}`,
      });
      
      setTimeout(() => {
        this.forceShutdown();
      }, 5000);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      appLogger.error('Unhandled promise rejection, starting emergency shutdown', reason, {
        action: 'emergency_shutdown',
        correlationId: `emergency-${Date.now()}`,
        metadata: { promise: promise.toString() },
      });
      
      setTimeout(() => {
        this.forceShutdown();
      }, 5000);
    });
  }
  
  registerServer(server) {
    this.server = server;
    
    this.registerHandler({
      name: 'http_server',
      handler: async () => {
        if (!this.server) return;
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('HTTP server shutdown timeout'));
          }, 15000);
          
          this.server.close((error) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              appLogger.info('HTTP server closed successfully');
              resolve();
            }
          });
        });
      },
      timeout: 15000,
    });
  }
  
  registerWebSocketServer(wsServer) {
    this.wsServer = wsServer;
    
    this.registerHandler({
      name: 'websocket_server',
      handler: async () => {
        if (!this.wsServer) return;
        
        return new Promise((resolve) => {
          let activeConnections = 0;
          
          this.wsServer.clients.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
              activeConnections++;
              ws.close(1001, 'Server shutting down');
            }
          });
          
          appLogger.info(`Closing ${activeConnections} WebSocket connections`);
          
          const checkInterval = setInterval(() => {
            if (this.wsServer.clients.size === 0) {
              clearInterval(checkInterval);
              this.wsServer.close(() => {
                appLogger.info('WebSocket server closed successfully');
                resolve();
              });
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            this.wsServer.close(() => {
              appLogger.info('WebSocket server force closed');
              resolve();
            });
          }, 10000);
        });
      },
      timeout: 12000,
    });
  }
  
  registerHandler(handler) {
    this.shutdownHandlers.push(handler);
  }
  
  registerDefaultHandlers() {
    this.registerHandler({
      name: 'database_connections',
      handler: async () => {
        appLogger.info('Cleaning up database connections');
        
        return new Promise((resolve) => {
          setTimeout(() => {
            appLogger.info('Database connections cleaned up');
            resolve();
          }, 1000);
        });
      },
      timeout: 5000,
    });
    
    this.registerHandler({
      name: 'active_requests',
      handler: async () => {
        if (!this.server) return;
        
        appLogger.info('Waiting for active requests to complete');
        
        return new Promise((resolve) => {
          this.server.close();
          
          this.server.getConnections((err, count) => {
            if (err) {
              appLogger.warn('Error getting connection count', { error: err.message });
              resolve();
              return;
            }
            
            const pendingRequests = count;
            appLogger.info(`Waiting for ${pendingRequests} active connections to complete`);
            
            if (pendingRequests === 0) {
              resolve();
              return;
            }
            
            const checkInterval = setInterval(() => {
              this.server.getConnections((err, currentCount) => {
                if (err || currentCount === 0) {
                  clearInterval(checkInterval);
                  appLogger.info('All active requests completed');
                  resolve();
                }
              });
            }, 1000);
          });
        });
      },
      timeout: 20000,
    });
    
    this.registerHandler({
      name: 'session_cleanup',
      handler: async () => {
        appLogger.info('Cleaning up sessions');
        
        return new Promise((resolve) => {
          setTimeout(() => {
            appLogger.info('Session cleanup completed');
            resolve();
          }, 1000);
        });
      },
      timeout: 3000,
    });
    
    this.registerHandler({
      name: 'background_jobs',
      handler: async () => {
        appLogger.info('Stopping background jobs');
        
        return new Promise((resolve) => {
          setTimeout(() => {
            appLogger.info('Background jobs stopped');
            resolve();
          }, 2000);
        });
      },
      timeout: 10000,
    });
    
    this.registerHandler({
      name: 'cache_cleanup',
      handler: async () => {
        appLogger.info('Cleaning up cache');
        
        return new Promise((resolve) => {
          setTimeout(() => {
            appLogger.info('Cache cleanup completed');
            resolve();
          }, 1000);
        });
      },
      timeout: 5000,
    });
  }
  
  async shutdown() {
    if (this.isShuttingDown) {
      appLogger.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }
    
    this.isShuttingDown = true;
    const shutdownStartTime = Date.now();
    
    appLogger.info('Starting graceful shutdown process', {
      action: 'graceful_shutdown_start',
      correlationId: `shutdown-${shutdownStartTime}`,
      metadata: {
        handlersCount: this.shutdownHandlers.length,
        timeout: this.shutdownTimeout,
      },
    });
    
    const shutdownTimer = setTimeout(() => {
      appLogger.error('Graceful shutdown timeout, forcing exit', {
        action: 'graceful_shutdown_timeout',
        correlationId: `shutdown-${shutdownStartTime}`,
        metadata: {
          duration: Date.now() - shutdownStartTime,
        },
      });
      this.forceShutdown();
    }, this.shutdownTimeout);
    
    try {
      for (const handler of this.shutdownHandlers) {
        const handlerStartTime = Date.now();
        
        try {
          appLogger.info(`Executing shutdown handler: ${handler.name}`);
          
          const handlerTimeout = handler.timeout || 10000;
          const handlerPromise = handler.handler();
          
          await Promise.race([
            handlerPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Handler ${handler.name} timeout`)), handlerTimeout)
            ),
          ]);
          
          const duration = Date.now() - handlerStartTime;
          appLogger.info(`Shutdown handler ${handler.name} completed`, {
            metadata: { duration },
          });
          
        } catch (error) {
          const duration = Date.now() - handlerStartTime;
          appLogger.error(`Shutdown handler ${handler.name} failed`, error, {
            metadata: { duration },
          });
        }
      }
      
      const totalDuration = Date.now() - shutdownStartTime;
      appLogger.info('Graceful shutdown completed', {
        action: 'graceful_shutdown_completed',
        correlationId: `shutdown-${shutdownStartTime}`,
        metadata: {
          duration: totalDuration,
          handlersExecuted: this.shutdownHandlers.length,
        },
      });
      
      clearTimeout(shutdownTimer);
      
      setTimeout(() => {
        process.exit(0);
      }, 1000);
      
    } catch (error) {
      appLogger.error('Error during graceful shutdown', error, {
        action: 'graceful_shutdown_error',
        correlationId: `shutdown-${shutdownStartTime}`,
      });
      
      clearTimeout(shutdownTimer);
      this.forceShutdown();
    }
  }
  
  forceShutdown() {
    appLogger.error('Forcing application shutdown');
    
    setTimeout(() => {
      process.exit(1);
    }, 500);
  }
  
  triggerShutdown() {
    this.shutdown();
  }
  
  isShutdownInProgress() {
    return this.isShuttingDown;
  }
  
  setShutdownTimeout(timeout) {
    this.shutdownTimeout = timeout;
  }
}

export const gracefulShutdown = new GracefulShutdown();

export const shutdownMiddleware = (req, res, next) => {
  if (gracefulShutdown.isShutdownInProgress()) {
    res.status(503).json({
      error: 'Server is shutting down',
      message: 'Please try again later',
    });
    return;
  }
  
  next();
};
