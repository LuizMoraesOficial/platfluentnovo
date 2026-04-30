// Service Worker registration and management
export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
  }
  
  // Register service worker
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.log('🚫 Service Worker not supported');
      return false;
    }
    
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      
      console.log('✅ Service Worker registered:', this.registration.scope);
      
      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdate();
      });
      
      // Check for updates on focus
      window.addEventListener('focus', () => {
        this.checkForUpdates();
      });
      
      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }
  
  // Handle service worker updates
  handleUpdate() {
    if (!this.registration) return;
    
    const newWorker = this.registration.installing;
    if (!newWorker) return;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available
        this.notifyUpdate();
      }
    });
  }
  
  // Notify user of updates
  notifyUpdate() {
    console.log('🔄 New version available');
    
    // You can integrate this with your toast system
    if (window.confirm('Nova versão disponível! Recarregar página?')) {
      this.skipWaiting();
    }
  }
  
  // Skip waiting and activate new service worker
  skipWaiting() {
    if (!this.registration || !this.registration.waiting) return;
    
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
  
  // Check for service worker updates
  async checkForUpdates() {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }
  
  // Clear all caches
  async clearCache() {
    if (!this.registration || !this.registration.active) return false;
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };
      
      this.registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }
  
  // Get cache statistics
  async getCacheStats() {
    if (!this.registration || !this.registration.active) return {};
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      this.registration.active.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      );
    });
  }
  
  // Unregister service worker
  async unregister() {
    if (!this.registration) return false;
    
    try {
      await this.registration.unregister();
      console.log('🗑️ Service Worker unregistered');
      return true;
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
      return false;
    }
  }
  
  // Check if app is running standalone (PWA)
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  
  // Get installation prompt
  getInstallPrompt() {
    return new Promise((resolve) => {
      let deferredPrompt = null;
      
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        resolve(deferredPrompt);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(deferredPrompt);
      }, 5000);
    });
  }
}

// Utility functions for performance monitoring with service worker
export const serviceWorkerUtils = {
  // Track cache performance
  trackCachePerformance: async (url) => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url);
      const endTime = performance.now();
      const fromCache = response.headers.get('x-cache') === 'HIT' || 
                       response.type === 'basic';
      
      console.log(`${fromCache ? '💾' : '🌐'} ${url}: ${(endTime - startTime).toFixed(2)}ms`);
      
      return {
        url,
        responseTime: endTime - startTime,
        fromCache,
        size: response.headers.get('content-length'),
      };
    } catch (error) {
      console.error('Request failed:', error);
      return null;
    }
  },
  
  // Preload critical resources through service worker
  preloadResources: async (urls) => {
    const promises = urls.map(url => {
      return fetch(url).catch(error => {
        console.error(`Failed to preload ${url}:`, error);
      });
    });
    
    await Promise.allSettled(promises);
    console.log(`⚡ Preloaded ${urls.length} resources`);
  },
};

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register service worker in production
if (typeof window !== 'undefined' && 
    process.env.NODE_ENV === 'production' && 
    'serviceWorker' in navigator) {
  
  // Register after page load
  window.addEventListener('load', () => {
    serviceWorkerManager.register().then((success) => {
      if (success) {
        console.log('🚀 Service Worker ready for caching');
      }
    });
  });
}
