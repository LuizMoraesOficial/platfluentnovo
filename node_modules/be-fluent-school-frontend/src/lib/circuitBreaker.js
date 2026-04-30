import { errorLogger } from './errorLogger';

export const CircuitBreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  constructor(options) {
    this.options = options;
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: this.state,
      stateChanges: 0,
    };
    this.monitoringInterval = null;
    this.startMonitoring();
  }

  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkHealthAndLog();
    }, this.options.monitoringPeriodMs);
  }

  checkHealthAndLog() {
    const healthStatus = this.getHealthStatus();
    
    errorLogger.logSystemError(
      `Circuit breaker health check for ${this.options.name}`,
      undefined,
      {
        component: 'CircuitBreaker',
        action: 'health_check',
      },
      {
        name: this.options.name,
        state: this.state,
        stats: this.stats,
        healthStatus,
      }
    );
  }

  async execute(operation) {
    this.stats.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.setState(CircuitBreakerState.HALF_OPEN);
      } else {
        this.stats.failedRequests++;
        const error = new Error(
          `Circuit breaker is OPEN for ${this.options.name}. Requests are being blocked.`
        );
        
        errorLogger.logNetworkError(
          'Circuit breaker blocked request',
          {
            component: 'CircuitBreaker',
            action: 'request_blocked',
          },
          {
            name: this.options.name,
            state: this.state,
            stats: this.stats,
          }
        );

        if (this.options.fallbackFn) {
          try {
            return await this.options.fallbackFn();
          } catch (fallbackError) {
            errorLogger.logSystemError(
              'Circuit breaker fallback failed',
              fallbackError instanceof Error ? fallbackError.stack : undefined,
              {
                component: 'CircuitBreaker',
                action: 'fallback_failed',
              },
              {
                name: this.options.name,
                originalError: error.message,
                fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              }
            );
            throw error;
          }
        }

        throw error;
      }
    }

    try {
      const startTime = Date.now();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.options.timeoutThreshold)
      );

      const result = await Promise.race([operation(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      this.onSuccess(duration);
      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (err.message === 'Operation timeout') {
        this.stats.timeouts++;
        errorLogger.logNetworkError(
          `Circuit breaker timeout for ${this.options.name}`,
          {
            component: 'CircuitBreaker',
            action: 'timeout',
          },
          {
            name: this.options.name,
            timeoutThreshold: this.options.timeoutThreshold,
            stats: this.stats,
          }
        );
      }

      this.onFailure(err);
      throw err;
    }
  }

  onSuccess(duration) {
    this.stats.successfulRequests++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.setState(CircuitBreakerState.CLOSED);
      
      errorLogger.logSystemError(
        `Circuit breaker reset to CLOSED for ${this.options.name}`,
        undefined,
        {
          component: 'CircuitBreaker',
          action: 'state_reset',
        },
        {
          name: this.options.name,
          duration,
          stats: this.stats,
        }
      );
    }
  }

  onFailure(error) {
    this.stats.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    errorLogger.logNetworkError(
      `Circuit breaker failure for ${this.options.name}: ${error.message}`,
      {
        component: 'CircuitBreaker',
        action: 'operation_failed',
      },
      {
        name: this.options.name,
        error: error.message,
        failureCount: this.failureCount,
        failureThreshold: this.options.failureThreshold,
        stats: this.stats,
      }
    );

    if (this.state === CircuitBreakerState.HALF_OPEN || 
        this.failureCount >= this.options.failureThreshold) {
      this.setState(CircuitBreakerState.OPEN);
    }
  }

  shouldAttemptReset() {
    return this.lastFailureTime !== null &&
           Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs;
  }

  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stats.state = newState;
      this.stats.stateChanges++;

      errorLogger.logSystemError(
        `Circuit breaker state changed for ${this.options.name}: ${oldState} -> ${newState}`,
        undefined,
        {
          component: 'CircuitBreaker',
          action: 'state_change',
        },
        {
          name: this.options.name,
          oldState,
          newState,
          stats: this.stats,
        }
      );
    }
  }

  getState() {
    return this.state;
  }

  getStats() {
    return { ...this.stats };
  }

  getHealthStatus() {
    const successRate = this.stats.totalRequests > 0 
      ? this.stats.successfulRequests / this.stats.totalRequests 
      : 1;

    const uptime = this.lastSuccessTime 
      ? Date.now() - this.lastSuccessTime 
      : 0;

    return {
      isHealthy: this.state !== CircuitBreakerState.OPEN && successRate > 0.5,
      successRate,
      avgResponseTime: 0,
      uptime,
    };
  }

  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: this.state,
      stateChanges: 0,
    };

    errorLogger.logSystemError(
      `Circuit breaker manually reset for ${this.options.name}`,
      undefined,
      {
        component: 'CircuitBreaker',
        action: 'manual_reset',
      },
      {
        name: this.options.name,
      }
    );
  }

  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Circuit breaker manager for multiple endpoints
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  getOrCreate(name, options) {
    if (this.breakers.has(name)) {
      return this.breakers.get(name);
    }

    const defaultOptions = {
      failureThreshold: 5,
      timeoutThreshold: 10000,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 30000,
      name,
      ...options,
    };

    const breaker = new CircuitBreaker(defaultOptions);
    this.breakers.set(name, breaker);
    return breaker;
  }

  get(name) {
    return this.breakers.get(name);
  }

  getAllStats() {
    const stats = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }

  destroy() {
    this.breakers.forEach(breaker => breaker.destroy());
    this.breakers.clear();
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();

// Enhanced fetch with circuit breaker
export async function fetchWithCircuitBreaker(
  url,
  options = {},
  circuitBreakerOptions
) {
  const breakerName = `api-${url.split('/')[1] || 'default'}`;
  const breaker = circuitBreakerManager.getOrCreate(breakerName, {
    fallbackFn: async () => {
      // Return cached data if available
      const cached = localStorage.getItem(`cache_${url}`);
      if (cached) {
        return new Response(cached, { status: 200 });
      }
      throw new Error('No cached data available');
    },
    ...circuitBreakerOptions,
  });

  return breaker.execute(async () => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Cache successful responses
    if (response.status === 200) {
      const clonedResponse = response.clone();
      clonedResponse.text().then(text => {
        localStorage.setItem(`cache_${url}`, text);
      }).catch(() => {
        // Ignore cache errors
      });
    }

    return response;
  });
}
