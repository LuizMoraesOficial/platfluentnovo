// Performance monitoring utilities

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      componentLoadTimes: new Map(),
    };
    this.startTime = performance.now();
    this.initializeCoreWebVitals();
    this.trackBundleMetrics();
  }

  initializeCoreWebVitals() {
    // Safely access performance APIs
    if (typeof window === 'undefined' || !('performance' in window)) return;

    // Track First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
          console.log(`🎨 First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Track Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.largestContentfulPaint = lastEntry.startTime;
      console.log(`🖼️ Largest Contentful Paint: ${lastEntry.startTime.toFixed(2)}ms`);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.metrics.cumulativeLayoutShift = clsValue;
      console.log(`📐 Cumulative Layout Shift: ${clsValue.toFixed(4)}`);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Track First Input Delay (FID)
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        console.log(`⚡ First Input Delay: ${this.metrics.firstInputDelay.toFixed(2)}ms`);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }

  trackBundleMetrics() {
    if (typeof window === 'undefined') return;

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const resource = entry;
        
        // Track JavaScript bundle sizes
        if (resource.name.includes('.js') && resource.transferSize) {
          console.log(`📦 Bundle loaded: ${resource.name.split('/').pop()} - ${(resource.transferSize / 1024).toFixed(2)}KB`);
        }
        
        // Track CSS files
        if (resource.name.includes('.css') && resource.transferSize) {
          console.log(`🎨 CSS loaded: ${resource.name.split('/').pop()} - ${(resource.transferSize / 1024).toFixed(2)}KB`);
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  // Track component lazy loading performance
  trackComponentLoad(componentName, startTime) {
    const loadTime = performance.now() - startTime;
    this.metrics.componentLoadTimes?.set(componentName, loadTime);
    
    console.log(`🔄 Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    
    // Warn if component takes too long to load
    if (loadTime > 1000) {
      console.warn(`⚠️ Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  // Track route changes and navigation performance
  trackNavigation(route) {
    const navigationTime = performance.now() - this.startTime;
    console.log(`🗺️ Navigation to ${route}: ${navigationTime.toFixed(2)}ms`);
    this.startTime = performance.now(); // Reset for next navigation
  }

  // Get comprehensive performance report
  getPerformanceReport() {
    return {
      timeToInteractive: this.calculateTTI(),
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      loadTime: performance.now(),
      componentLoadTimes: this.metrics.componentLoadTimes || new Map(),
    };
  }

  calculateTTI() {
    // Simplified TTI calculation
    if (typeof window === 'undefined') return 0;
    
    const navigation = performance.getEntriesByType('navigation')[0];
    return navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
  }

  // Performance optimization suggestions
  getOptimizationSuggestions() {
    const suggestions = [];
    const report = this.getPerformanceReport();

    if (report.firstContentfulPaint > 2000) {
      suggestions.push('🎨 Consider optimizing First Contentful Paint - current value is above 2s');
    }

    if (report.largestContentfulPaint > 4000) {
      suggestions.push('🖼️ Largest Contentful Paint needs optimization - current value is above 4s');
    }

    if (report.cumulativeLayoutShift > 0.1) {
      suggestions.push('📐 Cumulative Layout Shift is high - consider stabilizing layout');
    }

    if (report.firstInputDelay > 100) {
      suggestions.push('⚡ First Input Delay is high - consider code splitting or reducing JS execution time');
    }

    // Analyze component load times
    report.componentLoadTimes.forEach((time, component) => {
      if (time > 500) {
        suggestions.push(`🔄 Component "${component}" is loading slowly (${time.toFixed(2)}ms)`);
      }
    });

    return suggestions;
  }

  // Cache performance monitoring
  trackCachePerformance(endpoint, fromCache, responseTime) {
    const cacheStatus = fromCache ? '💾 Cache HIT' : '🌐 Cache MISS';
    console.log(`${cacheStatus} - ${endpoint}: ${responseTime.toFixed(2)}ms`);
    
    if (!fromCache && responseTime > 1000) {
      console.warn(`⚠️ Slow API response: ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance tracking hooks for React components
export const usePerformanceTracker = (componentName) => {
  const startTime = performance.now();
  
  return {
    trackLoad: () => performanceMonitor.trackComponentLoad(componentName, startTime),
    trackNavigation: (route) => performanceMonitor.trackNavigation(route),
  };
};

// Network-aware performance optimizations
export const getNetworkInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) return null;
  
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
};

// Performance optimization recommendations based on network
export const getNetworkOptimizations = () => {
  const networkInfo = getNetworkInfo();
  
  if (!networkInfo) return [];
  
  const optimizations = [];
  
  if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
    optimizations.push('📱 Slow connection detected - enabling aggressive caching');
    optimizations.push('📦 Reducing bundle size recommendations');
    optimizations.push('🖼️ Consider image optimization');
  }
  
  if (networkInfo.saveData) {
    optimizations.push('💾 Data saver mode detected - minimizing resource usage');
  }
  
  return optimizations;
};

// Initialize performance monitoring when module loads
if (typeof window !== 'undefined') {
  // Log performance report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const report = performanceMonitor.getPerformanceReport();
      console.group('📊 Performance Report');
      console.log('Core Web Vitals:', {
        FCP: `${report.firstContentfulPaint.toFixed(2)}ms`,
        LCP: `${report.largestContentfulPaint.toFixed(2)}ms`,
        CLS: report.cumulativeLayoutShift.toFixed(4),
        FID: `${report.firstInputDelay.toFixed(2)}ms`,
        TTI: `${report.timeToInteractive.toFixed(2)}ms`,
      });
      
      const suggestions = performanceMonitor.getOptimizationSuggestions();
      if (suggestions.length > 0) {
        console.log('🚀 Optimization Suggestions:', suggestions);
      }
      
      const networkOpts = getNetworkOptimizations();
      if (networkOpts.length > 0) {
        console.log('🌐 Network Optimizations:', networkOpts);
      }
      
      console.groupEnd();
    }, 2000); // Wait 2s after load for accurate measurements
  });
}
