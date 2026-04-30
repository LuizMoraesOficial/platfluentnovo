import { errorLogger } from './errorLogger';

class ErrorQueue {
  constructor(
    options = {
      maxConcurrentOperations: 3,
      processingIntervalMs: 1000,
      maxQueueSize: 100,
    }
  ) {
    this.queue = [];
    this.processing = new Map();
    this.isProcessing = false;
    this.processingInterval = null;
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queuedOperations: 0,
      processingOperations: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0,
    };
    this.options = options;
    this.startProcessing();
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      errorLogger.logSystemError(
        'Network came online, resuming queue processing',
        undefined,
        {
          component: 'ErrorQueue',
          action: 'network_online',
        },
        {
          queueSize: this.queue.length,
          processingSize: this.processing.size,
        }
      );
      
      this.resumeProcessing();
    });

    window.addEventListener('offline', () => {
      errorLogger.logSystemError(
        'Network went offline, pausing queue processing',
        undefined,
        {
          component: 'ErrorQueue',
          action: 'network_offline',
        },
        {
          queueSize: this.queue.length,
          processingSize: this.processing.size,
        }
      );
    });
  }

  add(
    operation,
    options = {}
  ) {
    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest low priority items to make room
      this.queue = this.queue.filter(op => op.priority !== 'low').slice(0, this.options.maxQueueSize - 1);
    }

    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const queuedOperation = {
      id,
      operation,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 'medium',
      timestamp: Date.now(),
      timeout: options.timeout ?? 30000,
      onSuccess: options.onSuccess,
      onFailure: options.onFailure,
      onMaxRetriesReached: options.onMaxRetriesReached,
      retryDelay: options.retryDelay ?? 1000,
      exponentialBackoff: options.exponentialBackoff ?? true,
      context: options.context,
    };

    this.queue.push(queuedOperation);
    this.sortQueue();
    this.updateStats();

    errorLogger.logSystemError(
      'Operation added to error queue',
      undefined,
      {
        component: 'ErrorQueue',
        action: 'operation_queued',
      },
      {
        operationId: id,
        priority: queuedOperation.priority,
        queueSize: this.queue.length,
        context: options.context,
      }
    );

    return id;
  }

  sortQueue() {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // If same priority, sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  startProcessing() {
    if (this.processingInterval) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.options.processingIntervalMs);
  }

  async processQueue() {
    if (!navigator.onLine || this.processing.size >= this.options.maxConcurrentOperations) {
      return;
    }

    const operation = this.queue.shift();
    if (!operation) {
      return;
    }

    this.processing.set(operation.id, operation);
    this.updateStats();

    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), operation.timeout)
      );

      const result = await Promise.race([operation.operation(), timeoutPromise]);
      
      const processingTime = Date.now() - startTime;
      const waitTime = startTime - operation.timestamp;
      
      this.onOperationSuccess(operation, result, processingTime, waitTime);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onOperationFailure(operation, err);
    } finally {
      this.processing.delete(operation.id);
      this.updateStats();
    }
  }

  onOperationSuccess(
    operation, 
    result, 
    processingTime, 
    waitTime
  ) {
    this.stats.successfulOperations++;
    this.updateAverages(waitTime, processingTime);

    errorLogger.logSystemError(
      'Queued operation completed successfully',
      undefined,
      {
        component: 'ErrorQueue',
        action: 'operation_success',
      },
      {
        operationId: operation.id,
        retryCount: operation.retryCount,
        processingTime,
        waitTime,
        context: operation.context,
      }
    );

    if (operation.onSuccess) {
      operation.onSuccess(result);
    }
  }

  onOperationFailure(operation, error) {
    operation.retryCount++;

    errorLogger.logSystemError(
      `Queued operation failed (attempt ${operation.retryCount}/${operation.maxRetries + 1})`,
      error.stack,
      {
        component: 'ErrorQueue',
        action: 'operation_failed',
      },
      {
        operationId: operation.id,
        error: error.message,
        retryCount: operation.retryCount,
        maxRetries: operation.maxRetries,
        context: operation.context,
      }
    );

    if (operation.retryCount <= operation.maxRetries) {
      // Calculate retry delay
      const delay = operation.exponentialBackoff
        ? operation.retryDelay * Math.pow(2, operation.retryCount - 1)
        : operation.retryDelay;

      // Add back to queue with delay
      setTimeout(() => {
        this.queue.unshift(operation);
        this.sortQueue();
      }, Math.min(delay, 30000));
      
    } else {
      // Max retries reached
      this.stats.failedOperations++;
      
      errorLogger.logSystemError(
        'Queued operation max retries reached',
        error.stack,
        {
          component: 'ErrorQueue',
          action: 'operation_max_retries',
        },
        {
          operationId: operation.id,
          error: error.message,
          totalRetries: operation.retryCount,
          context: operation.context,
        }
      );

      if (operation.onMaxRetriesReached) {
        operation.onMaxRetriesReached(error);
      } else if (operation.onFailure) {
        operation.onFailure(error);
      }
    }
  }

  updateAverages(waitTime, processingTime) {
    const total = this.stats.successfulOperations + this.stats.failedOperations;
    
    this.stats.averageWaitTime = 
      (this.stats.averageWaitTime * (total - 1) + waitTime) / total;
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (total - 1) + processingTime) / total;
  }

  updateStats() {
    this.stats.queuedOperations = this.queue.length;
    this.stats.processingOperations = this.processing.size;
    this.stats.totalOperations = 
      this.stats.successfulOperations + this.stats.failedOperations + 
      this.stats.queuedOperations + this.stats.processingOperations;
  }

  // Public methods
  pauseProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    
    errorLogger.logSystemError(
      'Error queue processing paused',
      undefined,
      {
        component: 'ErrorQueue',
        action: 'processing_paused',
      },
      {
        queueSize: this.queue.length,
        processingSize: this.processing.size,
      }
    );
  }

  resumeProcessing() {
    if (!this.isProcessing) {
      this.startProcessing();
      
      errorLogger.logSystemError(
        'Error queue processing resumed',
        undefined,
        {
          component: 'ErrorQueue',
          action: 'processing_resumed',
        },
        {
          queueSize: this.queue.length,
          processingSize: this.processing.size,
        }
      );
    }
  }

  getStats() {
    this.updateStats();
    return { ...this.stats };
  }

  getQueuedOperations() {
    const now = Date.now();
    return this.queue.map(op => ({
      id: op.id,
      priority: op.priority,
      retryCount: op.retryCount,
      maxRetries: op.maxRetries,
      waitTime: now - op.timestamp,
    }));
  }

  getProcessingOperations() {
    const now = Date.now();
    return Array.from(this.processing.values()).map(op => ({
      id: op.id,
      priority: op.priority,
      retryCount: op.retryCount,
      processingTime: now - op.timestamp,
    }));
  }

  remove(operationId) {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.updateStats();
      return true;
    }
    return false;
  }

  clear() {
    this.queue = [];
    this.updateStats();
    
    errorLogger.logSystemError(
      'Error queue cleared',
      undefined,
      {
        component: 'ErrorQueue',
        action: 'queue_cleared',
      }
    );
  }

  destroy() {
    this.pauseProcessing();
    this.clear();
    this.processing.clear();
  }
}

// Singleton instance
export const errorQueue = new ErrorQueue();

// Helper function to add operations to queue
export function queueOperation(
  operation,
  options
) {
  return new Promise((resolve, reject) => {
    errorQueue.add(operation, {
      ...options,
      onSuccess: (result) => {
        resolve(result);
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
      },
      onFailure: (error) => {
        reject(error);
        if (options?.onFailure) {
          options.onFailure(error);
        }
      },
      onMaxRetriesReached: (error) => {
        reject(error);
        if (options?.onMaxRetriesReached) {
          options.onMaxRetriesReached(error);
        }
      },
    });
  });
}
