class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
    this.sessionId = this.generateSessionId();
    this.buildVersion = import.meta.env.VITE_APP_VERSION || 'development';
    this.userId = null;
    this.userRole = null;
    this.isOnline = navigator.onLine;
    this.pendingReports = [];
    this.setupNetworkListeners();
    this.setupUnhandledErrorCapture();
    this.startPeriodicCleanup();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingReports();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  setupUnhandledErrorCapture() {
    // Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'system_error',
        severity: 'high',
        message: event.message || 'Unhandled JavaScript error',
        stack: event.error?.stack,
        context: {
          component: 'window',
          action: 'unhandled_error',
          route: window.location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.sessionId,
          buildVersion: this.buildVersion,
        },
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'system_error',
        severity: 'high',
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        context: {
          component: 'window',
          action: 'unhandled_promise_rejection',
          route: window.location.pathname,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.sessionId,
          buildVersion: this.buildVersion,
        },
        metadata: {
          reason: event.reason,
        },
      });
    });
  }

  generateErrorFingerprint(error) {
    const key = `${error.type}-${error.message}-${error.context?.component}`;
    return btoa(key).substring(0, 12);
  }

  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldErrors();
    }, 1000 * 60 * 15);
  }

  cleanupOldErrors() {
    const cutoffTime = Date.now() - (1000 * 60 * 60 * 24);
    this.errors = this.errors.filter(
      error => new Date(error.context.timestamp).getTime() > cutoffTime
    );

    // Keep errors array size manageable
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  logError(errorData) {
    const id = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fingerprint = this.generateErrorFingerprint(errorData);
    
    const error = {
      ...errorData,
      id,
      fingerprint,
    };

    this.errors.push(error);
    
    // Console logging with structured format
    this.logToConsole(error);
    
    // Store in localStorage for persistence
    this.persistError(error);
    
    // Send to external service if available and online
    if (this.isOnline) {
      this.reportError(error);
    } else {
      this.pendingReports.push(error);
    }

    return id;
  }

  logToConsole(error) {
    const logMethod = this.getConsoleMethod(error.severity);
    const prefix = `[BE_FLUENT_ERROR]`;
    
    logMethod(
      `${prefix} ${error.type.toUpperCase()} - ${error.severity.toUpperCase()}`,
      {
        id: error.id,
        message: error.message,
        component: error.context.component,
        route: error.context.route,
        timestamp: error.context.timestamp,
        stack: error.stack,
        metadata: error.metadata,
        fingerprint: error.fingerprint,
      }
    );
  }

  getConsoleMethod(severity) {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error;
      case 'medium':
        return console.warn;
      case 'low':
      default:
        return console.log;
    }
  }

  persistError(error) {
    try {
      const stored = localStorage.getItem('be_fluent_errors') || '[]';
      const errors = JSON.parse(stored);
      errors.push(error);
      
      // Keep only last 100 errors in localStorage
      const recentErrors = errors.slice(-100);
      localStorage.setItem('be_fluent_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.error('Failed to persist error to localStorage:', e);
    }
  }

  async reportError(error) {
    try {
      // Only attempt external reporting in production
      if (import.meta.env.PROD && error.severity !== 'low') {
        // This could be extended to send to external services like Sentry, LogRocket, etc.
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(error),
          credentials: 'include',
        }).catch(() => {
          // Fail silently for error reporting to not create error loops
        });
      }
    } catch (e) {
      // Fail silently for error reporting
    }
  }

  async processPendingReports() {
    const pending = [...this.pendingReports];
    this.pendingReports = [];

    for (const error of pending) {
      await this.reportError(error);
    }
  }

  // Public methods for application use
  logUserError(message, context = {}, metadata) {
    return this.logError({
      type: 'user_error',
      severity: 'low',
      message,
      context: this.buildContext(context),
      metadata,
    });
  }

  logNetworkError(message, context = {}, metadata) {
    return this.logError({
      type: 'network_error',
      severity: 'medium',
      message,
      context: this.buildContext(context),
      metadata,
    });
  }

  logAuthError(message, context = {}, metadata) {
    return this.logError({
      type: 'auth_error',
      severity: 'medium',
      message,
      context: this.buildContext(context),
      metadata,
    });
  }

  logValidationError(message, context = {}, metadata) {
    return this.logError({
      type: 'validation_error',
      severity: 'low',
      message,
      context: this.buildContext(context),
      metadata,
    });
  }

  logSystemError(message, stack, context = {}, metadata) {
    return this.logError({
      type: 'system_error',
      severity: 'high',
      message,
      stack,
      context: this.buildContext(context),
      metadata,
    });
  }

  logCriticalError(message, stack, context = {}, metadata) {
    return this.logError({
      type: 'system_error',
      severity: 'critical',
      message,
      stack,
      context: this.buildContext(context),
      metadata,
    });
  }

  buildContext(partialContext) {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      route: window.location.pathname,
      sessionId: this.sessionId,
      buildVersion: this.buildVersion,
      userId: this.userId,
      userRole: this.userRole,
      ...partialContext,
    };
  }

  // Analytics and monitoring methods
  getErrorStats() {
    const stats = {
      totalErrors: this.errors.length,
      errorsByType: {},
      errorsBySeverity: {},
      lastOccurrence: this.errors.length > 0 ? this.errors[this.errors.length - 1].context.timestamp : '',
    };

    this.errors.forEach(error => {
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  getRecentErrors(limit = 50) {
    return this.errors.slice(-limit);
  }

  getErrorsByType(type) {
    return this.errors.filter(error => error.type === type);
  }

  getErrorsBySeverity(severity) {
    return this.errors.filter(error => error.severity === severity);
  }

  getErrorsByFingerprint(fingerprint) {
    return this.errors.filter(error => error.fingerprint === fingerprint);
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('be_fluent_errors');
  }

  setUserContext(userId, userRole) {
    this.userId = userId ?? null;
    this.userRole = userRole ?? null;

    this.errors.forEach(error => {
      error.context.userId = this.userId;
      error.context.userRole = this.userRole;
    });
  }

  // Export errors for debugging
  exportErrors() {
    return JSON.stringify(this.errors, null, 2);
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();
