export class UIOptimizer {
  private static instance: UIOptimizer;
  private updateTimers: Map<string, number> = new Map();
  private throttledFunctions: Map<string, Function> = new Map();
  private debouncedFunctions: Map<string, Function> = new Map();
  private rafCallbacks: Map<string, number> = new Map();
  
  private constructor() {
    console.log('[UI_OPTIMIZER] UI optimization system initialized');
  }
  
  static getInstance(): UIOptimizer {
    if (!UIOptimizer.instance) {
      UIOptimizer.instance = new UIOptimizer();
    }
    return UIOptimizer.instance;
  }
  
  // Throttle function calls (limit execution frequency)
  throttle(key: string, fn: Function, delay: number): Function {
    if (this.throttledFunctions.has(key)) {
      return this.throttledFunctions.get(key)!;
    }
    
    let lastCall = 0;
    let timeout: number | null = null;
    
    const throttled = (...args: any[]) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= delay) {
        lastCall = now;
        fn(...args);
      } else if (!timeout) {
        timeout = window.setTimeout(() => {
          lastCall = Date.now();
          fn(...args);
          timeout = null;
        }, delay - timeSinceLastCall);
      }
    };
    
    this.throttledFunctions.set(key, throttled);
    return throttled;
  }
  
  // Debounce function calls (delay execution until idle)
  debounce(key: string, fn: Function, delay: number): Function {
    if (this.debouncedFunctions.has(key)) {
      return this.debouncedFunctions.get(key)!;
    }
    
    let timeout: number | null = null;
    
    const debounced = (...args: any[]) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = window.setTimeout(() => {
        fn(...args);
        timeout = null;
      }, delay);
    };
    
    this.debouncedFunctions.set(key, debounced);
    return debounced;
  }
  
  // Request animation frame with key (prevents duplicate RAF calls)
  requestAnimationFrame(key: string, callback: FrameRequestCallback): void {
    // Cancel existing RAF for this key
    if (this.rafCallbacks.has(key)) {
      cancelAnimationFrame(this.rafCallbacks.get(key)!);
    }
    
    const rafId = requestAnimationFrame((time) => {
      this.rafCallbacks.delete(key);
      callback(time);
    });
    
    this.rafCallbacks.set(key, rafId);
  }
  
  // Batch DOM updates
  batchDOMUpdates(updates: (() => void)[]): void {
    requestAnimationFrame(() => {
      // Use DocumentFragment for multiple insertions
      const fragment = document.createDocumentFragment();
      
      updates.forEach(update => {
        update();
      });
      
      // Force layout recalculation only once
      void document.body.offsetHeight;
    });
  }
  
  // Optimize scroll performance
  optimizeScroll(element: HTMLElement): void {
    // Add will-change for better performance
    element.style.willChange = 'transform';
    
    // Use passive event listeners
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Handle scroll event
          ticking = false;
        });
        ticking = true;
      }
    };
    
    element.addEventListener('scroll', handleScroll, { passive: true });
  }
  
  // Virtual scrolling for large lists
  createVirtualScroller(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderItem: (item: any, index: number) => HTMLElement
  ): void {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    
    // Create spacer
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    container.appendChild(spacer);
    
    // Create viewport
    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.right = '0';
    container.appendChild(viewport);
    
    const updateVisibleItems = () => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
      
      // Clear viewport
      viewport.innerHTML = '';
      
      // Render visible items
      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        itemElement.style.position = 'absolute';
        itemElement.style.top = `${i * itemHeight}px`;
        viewport.appendChild(itemElement);
      }
    };
    
    // Initial render
    updateVisibleItems();
    
    // Update on scroll
    this.optimizeScroll(container);
    container.addEventListener('scroll', () => {
      this.requestAnimationFrame('virtual-scroll', updateVisibleItems);
    });
  }
  
  // Lazy load images
  lazyLoadImages(container: HTMLElement): void {
    const images = container.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
  
  // Reduce paint areas
  optimizePaintAreas(element: HTMLElement): void {
    // Isolate element's painting
    element.style.contain = 'layout style paint';
    
    // Use transform instead of position changes
    element.style.willChange = 'transform';
  }
  
  // Clear all optimizations
  clear(): void {
    this.updateTimers.forEach(timer => clearTimeout(timer));
    this.updateTimers.clear();
    
    this.rafCallbacks.forEach(id => cancelAnimationFrame(id));
    this.rafCallbacks.clear();
    
    this.throttledFunctions.clear();
    this.debouncedFunctions.clear();
  }
}

export const uiOptimizer = UIOptimizer.getInstance();