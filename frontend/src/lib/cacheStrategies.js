// Advanced cache strategies for APIs and static assets
import { performanceMonitor } from './performance';

// Cache strategies for different asset types
export const ASSET_CACHE_RULES = [
  // Images - Cache first with long expiration
  {
    pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i,
    strategy: 'cache-first',
    maxAge: 60 * 60 * 24 * 30,
    maxEntries: 100,
  },
  // Fonts - Cache first, very long expiration
  {
    pattern: /\.(woff|woff2|eot|ttf|otf)$/i,
    strategy: 'cache-first',
    maxAge: 60 * 60 * 24 * 365,
    maxEntries: 30,
  },
  // CSS/JS - Stale while revalidate
  {
    pattern: /\.(css|js)$/i,
    strategy: 'stale-while-revalidate',
    maxAge: 60 * 60 * 24 * 7,
    maxEntries: 50,
  },
  // API responses - Network first
  {
    pattern: /\/api\//,
    strategy: 'network-first',
    maxAge: 60 * 5,
    maxEntries: 200,
  },
];

// Image optimization and lazy loading
export class ImageOptimizer {
  constructor() {
    this.observer = null;
    this.imageCache = new Map();
    this.initializeIntersectionObserver();
  }

  initializeIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );
  }

  // Convert images to WebP format when supported
  getOptimizedImageSrc(originalSrc) {
    if (this.imageCache.has(originalSrc)) {
      return this.imageCache.get(originalSrc);
    }

    // Check if browser supports WebP
    const supportsWebP = this.supportsWebP();
    
    // If it's already a WebP or browser doesn't support WebP, return original
    if (originalSrc.includes('.webp') || !supportsWebP) {
      this.imageCache.set(originalSrc, originalSrc);
      return originalSrc;
    }

    // Try to convert to WebP (assuming server supports it)
    const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    this.imageCache.set(originalSrc, webpSrc);
    
    return webpSrc;
  }

  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  async loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const startTime = performance.now();
    
    try {
      // Get optimized image source
      const optimizedSrc = this.getOptimizedImageSrc(src);
      
      // Preload the image
      const preloadImg = new Image();
      preloadImg.onload = () => {
        img.src = optimizedSrc;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        
        const loadTime = performance.now() - startTime;
        console.log(`🖼️ Image loaded: ${src.split('/').pop()} in ${loadTime.toFixed(2)}ms`);
      };
      
      preloadImg.onerror = () => {
        // Fallback to original image if WebP fails
        img.src = src;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
      };
      
      preloadImg.src = optimizedSrc;
      
    } catch (error) {
      console.error('Image loading error:', error);
      img.src = src;
    }
  }

  // Enable lazy loading for an image element
  enableLazyLoading(img) {
    if (!this.observer) return;

    img.classList.add('lazy-loading');
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    
    // Move src to data-src for lazy loading
    const src = img.src;
    img.removeAttribute('src');
    img.dataset.src = src;
    
    // Add loading placeholder
    img.style.backgroundColor = '#f0f0f0';
    img.style.backgroundImage = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
    img.style.backgroundSize = '200% 100%';
    img.style.animation = 'loading 1.5s infinite';
    
    this.observer.observe(img);
  }

  // Bulk optimize images in a container
  optimizeImagesInContainer(container) {
    const images = container.querySelectorAll('img[src]');
    images.forEach((img) => this.enableLazyLoading(img));
  }
}

// Local storage cache for user preferences and app state
export class LocalStorageCache {
  constructor() {
    this.prefix = 'be-fluent-';
    this.maxAge = {
      'user-preferences': 60 * 60 * 24 * 30,
      'app-settings': 60 * 60 * 24 * 7,
      'dashboard-state': 60 * 60 * 2,
      'theme-settings': 60 * 60 * 24 * 365,
    };
  }

  getKey(key) {
    return `${this.prefix}${key}`;
  }

  isExpired(timestamp, key) {
    const maxAge = this.maxAge[key] || 60 * 60;
    return Date.now() - timestamp > maxAge * 1000;
  }

  set(key, value) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(data));
      console.log(`💾 Cached: ${key}`);
    } catch (error) {
      console.warn('LocalStorage cache set failed:', error);
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const data = JSON.parse(item);
      
      if (this.isExpired(data.timestamp, key)) {
        this.remove(key);
        return null;
      }

      console.log(`💾 Cache HIT: ${key}`);
      return data.value;
    } catch (error) {
      console.warn('LocalStorage cache get failed:', error);
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(this.getKey(key));
    console.log(`🗑️ Cache removed: ${key}`);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cache cleared');
  }

  // Get cache statistics
  getStats() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(this.prefix));
    
    let totalSize = 0;
    const items = cacheKeys.map((key) => {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      totalSize += size;
      
      return {
        key: key.replace(this.prefix, ''),
        size,
        data: JSON.parse(value),
      };
    });

    return {
      totalSize,
      itemCount: items.length,
      items,
    };
  }
}

// HTTP cache headers optimizer
export class HttpCacheOptimizer {
  // Generate cache headers for different asset types
  static getCacheHeaders(url) {
    const headers = {};

    // Find matching cache rule
    const rule = ASSET_CACHE_RULES.find((rule) => rule.pattern.test(url));
    
    if (!rule) {
      return {
        'Cache-Control': 'no-cache',
      };
    }

    switch (rule.strategy) {
      case 'cache-first':
        headers['Cache-Control'] = `public, max-age=${rule.maxAge}, immutable`;
        break;
      case 'network-first':
        headers['Cache-Control'] = `public, max-age=${rule.maxAge}, must-revalidate`;
        break;
      case 'stale-while-revalidate':
        headers['Cache-Control'] = `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.maxAge}`;
        break;
    }

    // Add ETag for versioning
    headers['ETag'] = `"${Date.now()}"`;
    
    return headers;
  }
}

// Cache statistics and monitoring
export class CacheMonitor {
  static instance;

  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  static getInstance() {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  recordHit() {
    this.stats.hits++;
    this.stats.totalRequests++;
  }

  recordMiss() {
    this.stats.misses++;
    this.stats.totalRequests++;
  }

  recordError() {
    this.stats.errors++;
    this.stats.totalRequests++;
  }

  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  logStats() {
    const stats = this.getStats();
    console.group('📊 Cache Statistics');
    console.log(`Cache Hit Rate: ${stats.hitRate}`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Hits: ${stats.hits}`);
    console.log(`Misses: ${stats.misses}`);
    console.log(`Errors: ${stats.errors}`);
    console.groupEnd();
  }
}

// Initialize cache strategies
export const imageOptimizer = new ImageOptimizer();
export const localCache = new LocalStorageCache();
export const cacheMonitor = CacheMonitor.getInstance();

// Add loading animation CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .lazy-loading {
      opacity: 0.7;
    }
    
    .lazy-loaded {
      opacity: 1 !important;
      background: none !important;
      animation: none !important;
    }
    
    .lazy-error {
      opacity: 1;
      background: #f0f0f0 !important;
    }
  `;
  document.head.appendChild(style);
}

// Utility functions for easy integration
export const cacheStrategies = {
  // Cache user preferences
  cacheUserPreferences: (preferences) => {
    localCache.set('user-preferences', preferences);
  },

  // Get cached user preferences
  getCachedUserPreferences: () => {
    return localCache.get('user-preferences');
  },

  // Cache dashboard state
  cacheDashboardState: (state) => {
    localCache.set('dashboard-state', state);
  },

  // Get cached dashboard state
  getCachedDashboardState: () => {
    return localCache.get('dashboard-state');
  },

  // Cache theme settings
  cacheTheme: (theme) => {
    localCache.set('theme-settings', theme);
  },

  // Get cached theme
  getCachedTheme: () => {
    return localCache.get('theme-settings');
  },

  // Optimize all images in a container
  optimizeImages: (container) => {
    imageOptimizer.optimizeImagesInContainer(container);
  },

  // Get cache statistics
  getStats: () => {
    return {
      cache: cacheMonitor.getStats(),
      localStorage: localCache.getStats(),
    };
  },
};
