// CSS optimization and unused code removal utilities
export class CSSOptimizer {
  static usedClasses = new Set();
  static observer = null;
  
  // Track CSS classes that are actually used
  static trackUsedClasses() {
    if (typeof document === 'undefined') return;
    
    // Initial scan of existing elements
    this.scanForUsedClasses(document.body);
    
    // Set up mutation observer to track dynamically added classes
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          this.extractClassesFromElement(target);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForUsedClasses(node);
            }
          });
        }
      });
    });
    
    this.observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });
  }
  
  static scanForUsedClasses(element) {
    // Extract classes from current element
    this.extractClassesFromElement(element);
    
    // Recursively scan child elements
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      this.scanForUsedClasses(children[i]);
    }
  }
  
  static extractClassesFromElement(element) {
    const className = element.className;
    if (typeof className === 'string' && className.trim()) {
      const classes = className.trim().split(/\s+/);
      classes.forEach((cls) => {
        if (cls) this.usedClasses.add(cls);
      });
    }
  }
  
  // Get list of used CSS classes
  static getUsedClasses() {
    return Array.from(this.usedClasses).sort();
  }
  
  // Analyze unused CSS (would need to be run against the actual CSS files)
  static generateUnusedCSSReport() {
    const usedClasses = this.getUsedClasses();
    
    const report = `
CSS Usage Analysis Report
========================

Total unique classes found: ${usedClasses.length}

Most commonly used patterns:
${this.analyzeClassPatterns(usedClasses)}

Recommendations:
- Review CSS files to remove unused classes
- Consider purging CSS in build process
- Implement CSS-in-JS for component-specific styles
- Use CSS modules for better tree shaking

Used Classes (first 50):
${usedClasses.slice(0, 50).join(', ')}
${usedClasses.length > 50 ? `... and ${usedClasses.length - 50} more` : ''}
    `;
    
    return report;
  }
  
  static analyzeClassPatterns(classes) {
    const patterns = new Map();
    
    classes.forEach((cls) => {
      // Analyze Tailwind patterns
      if (cls.startsWith('text-')) {
        patterns.set('text-*', (patterns.get('text-*') || 0) + 1);
      } else if (cls.startsWith('bg-')) {
        patterns.set('bg-*', (patterns.get('bg-*') || 0) + 1);
      } else if (cls.startsWith('p-') || cls.startsWith('px-') || cls.startsWith('py-')) {
        patterns.set('padding-*', (patterns.get('padding-*') || 0) + 1);
      } else if (cls.startsWith('m-') || cls.startsWith('mx-') || cls.startsWith('my-')) {
        patterns.set('margin-*', (patterns.get('margin-*') || 0) + 1);
      } else if (cls.startsWith('flex') || cls.startsWith('grid')) {
        patterns.set('layout-*', (patterns.get('layout-*') || 0) + 1);
      } else if (cls.startsWith('w-') || cls.startsWith('h-')) {
        patterns.set('sizing-*', (patterns.get('sizing-*') || 0) + 1);
      }
    });
    
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => `  ${pattern}: ${count} classes`)
      .join('\n');
  }
  
  // Critical CSS extraction
  static extractCriticalCSS() {
    const criticalClasses = [
      // Layout classes that are likely critical
      'flex', 'grid', 'block', 'inline', 'hidden',
      // Essential spacing
      'p-0', 'p-1', 'p-2', 'p-4', 'm-0', 'm-1', 'm-2', 'm-4',
      // Common colors
      'text-black', 'text-white', 'bg-white', 'bg-black',
      // Typography basics
      'text-sm', 'text-base', 'text-lg', 'font-normal', 'font-bold',
    ];
    
    const usedClasses = this.getUsedClasses();
    const criticalUsedClasses = criticalClasses.filter((cls) => usedClasses.includes(cls));
    
    return `/* Critical CSS Classes */\n${criticalUsedClasses.join(', ')}`;
  }
  
  // Font optimization suggestions
  static getFontOptimizations() {
    const usedClasses = this.getUsedClasses();
    const fontClasses = usedClasses.filter((cls) => 
      cls.startsWith('font-') || cls.startsWith('text-')
    );
    
    const optimizations = [];
    
    if (fontClasses.length > 20) {
      optimizations.push('📝 Consider consolidating font variants - found many font classes');
    }
    
    const hasFontWeights = fontClasses.some((cls) => cls.includes('font-'));
    if (hasFontWeights) {
      optimizations.push('🔤 Preload critical font weights in <head>');
    }
    
    return optimizations;
  }
  
  // Stop tracking (cleanup)
  static stopTracking() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// CSS loading optimization
export class CSSLoader {
  static loadedCSS = new Set();
  
  // Load CSS asynchronously
  static async loadCSS(href, critical = false) {
    if (this.loadedCSS.has(href)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      if (!critical) {
        link.media = 'print';
        link.onload = () => {
          link.media = 'all';
          this.loadedCSS.add(href);
          resolve();
        };
      } else {
        link.onload = () => {
          this.loadedCSS.add(href);
          resolve();
        };
      }
      
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  // Preload CSS for later use
  static preloadCSS(href) {
    if (this.loadedCSS.has(href)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  }
  
  // Remove unused CSS link
  static removeCSS(href) {
    const links = document.querySelectorAll(`link[href="${href}"]`);
    links.forEach((link) => link.remove());
    this.loadedCSS.delete(href);
  }
}

// Initialize CSS optimization
if (typeof window !== 'undefined') {
  // Start tracking CSS usage after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      CSSOptimizer.trackUsedClasses();
      
      // Log CSS analysis after 5 seconds
      setTimeout(() => {
        console.group('🎨 CSS Optimization Analysis');
        console.log(CSSOptimizer.generateUnusedCSSReport());
        
        const fontOptimizations = CSSOptimizer.getFontOptimizations();
        if (fontOptimizations.length > 0) {
          console.log('Font Optimizations:', fontOptimizations);
        }
        
        console.groupEnd();
      }, 5000);
    }, 1000);
  });
}

export const cssOptimization = {
  // Easy-to-use utilities
  startTracking: () => CSSOptimizer.trackUsedClasses(),
  getReport: () => CSSOptimizer.generateUnusedCSSReport(),
  getCriticalCSS: () => CSSOptimizer.extractCriticalCSS(),
  getFontOptimizations: () => CSSOptimizer.getFontOptimizations(),
  loadCSS: (href, critical) => CSSLoader.loadCSS(href, critical),
  preloadCSS: (href) => CSSLoader.preloadCSS(href),
};
