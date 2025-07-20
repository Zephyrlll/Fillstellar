// Simple animation system without anime.js dependency
export interface AnimationConfig {
  targets: HTMLElement | HTMLElement[] | string;
  duration?: number;
  easing?: string;
  delay?: number | ((el: HTMLElement, i: number) => number);
  complete?: () => void;
}

export class SimpleAnimationSystem {
  private static instance: SimpleAnimationSystem;
  
  private constructor() {
    console.log('[ANIMATION] Simple animation system initialized');
  }
  
  static getInstance(): SimpleAnimationSystem {
    if (!SimpleAnimationSystem.instance) {
      SimpleAnimationSystem.instance = new SimpleAnimationSystem();
    }
    return SimpleAnimationSystem.instance;
  }
  
  // Helper to get elements
  private getElements(targets: HTMLElement | HTMLElement[] | string): HTMLElement[] {
    if (typeof targets === 'string') {
      return Array.from(document.querySelectorAll(targets));
    } else if (targets instanceof HTMLElement) {
      return [targets];
    } else {
      return targets;
    }
  }
  
  // Apply CSS transition
  private applyTransition(element: HTMLElement, duration: number, easing: string = 'ease-out'): void {
    element.style.transition = `all ${duration}ms ${easing}`;
  }
  
  // UI要素のフェードイン
  fadeIn(config: AnimationConfig): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 300;
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      el.style.opacity = '0';
      el.style.display = 'block';
      this.applyTransition(el, duration);
      
      setTimeout(() => {
        el.style.opacity = '1';
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(config.complete, duration);
        }
      }, delay);
    });
  }
  
  // UI要素のフェードアウト
  fadeOut(config: AnimationConfig): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 300;
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      this.applyTransition(el, duration);
      
      setTimeout(() => {
        el.style.opacity = '0';
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(() => {
            config.complete!();
          }, duration);
        }
      }, delay);
    });
  }
  
  // スケールアニメーション
  scale(config: AnimationConfig & { scale: number | number[] }): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 300;
    const scales = Array.isArray(config.scale) ? config.scale : [1, config.scale];
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      if (scales.length > 1) {
        el.style.transform = `scale(${scales[0]})`;
      }
      
      this.applyTransition(el, duration, config.easing || 'ease-out');
      
      setTimeout(() => {
        el.style.transform = `scale(${scales[scales.length - 1]})`;
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(config.complete, duration);
        }
      }, delay);
    });
  }
  
  // スライドイン（左から）
  slideInLeft(config: AnimationConfig): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 400;
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      el.style.transform = 'translateX(-100%)';
      el.style.opacity = '0';
      el.style.display = 'block';
      this.applyTransition(el, duration, config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)');
      
      setTimeout(() => {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(config.complete, duration);
        }
      }, delay);
    });
  }
  
  // スライドイン（右から）
  slideInRight(config: AnimationConfig): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 400;
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      el.style.transform = 'translateX(100%)';
      el.style.opacity = '0';
      el.style.display = 'block';
      this.applyTransition(el, duration, config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)');
      
      setTimeout(() => {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(config.complete, duration);
        }
      }, delay);
    });
  }
  
  // ポップアップアニメーション
  popup(config: AnimationConfig): void {
    const elements = this.getElements(config.targets);
    const duration = config.duration || 300;
    
    elements.forEach((el, i) => {
      const delay = typeof config.delay === 'function' ? config.delay(el, i) : (config.delay || 0);
      
      el.style.transform = 'scale(0.8)';
      el.style.opacity = '0';
      el.style.display = 'block';
      this.applyTransition(el, duration, config.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)');
      
      setTimeout(() => {
        el.style.transform = 'scale(1)';
        el.style.opacity = '1';
        
        if (config.complete && i === elements.length - 1) {
          setTimeout(config.complete, duration);
        }
      }, delay);
    });
  }
  
  // 実績アンロックアニメーション
  achievementUnlock(element: HTMLElement): void {
    element.style.transform = 'scale(0) rotate(0deg)';
    element.style.opacity = '0';
    element.style.display = 'block';
    
    // Use CSS animation
    element.style.animation = 'achievementUnlock 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  }
  
  // リソース取得アニメーション
  resourceGain(element: HTMLElement): void {
    element.style.transform = 'scale(0)';
    element.style.opacity = '0';
    element.style.display = 'block';
    
    // Use CSS animation
    element.style.animation = 'resourceGain 1.5s ease-out forwards';
    
    setTimeout(() => {
      element.remove();
    }, 1500);
  }
  
  // 数値カウントアップアニメーション
  countUp(element: HTMLElement, start: number, end: number, duration: number = 1000): void {
    const startTime = Date.now();
    const diff = end - start;
    
    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const current = start + diff * easedProgress;
      element.textContent = Math.floor(current).toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = Math.floor(end).toLocaleString();
      }
    };
    
    update();
  }
  
  // トーストアニメーション
  toast(element: HTMLElement): void {
    element.style.transform = 'translateY(-100px)';
    element.style.opacity = '0';
    element.style.display = 'block';
    
    this.applyTransition(element, 400, 'cubic-bezier(0.4, 0, 0.2, 1)');
    
    setTimeout(() => {
      element.style.transform = 'translateY(0)';
      element.style.opacity = '1';
    }, 10);
    
    // Auto hide
    setTimeout(() => {
      element.style.transform = 'translateY(-100px)';
      element.style.opacity = '0';
      
      setTimeout(() => {
        element.remove();
      }, 400);
    }, 3400);
  }
  
  // 汎用アニメーション実行メソッド
  animate(params: any): void {
    const elements = this.getElements(params.targets);
    const duration = params.duration || 300;
    const easing = params.easing || 'ease-out';
    const delay = params.delay || 0;
    
    elements.forEach((el, i) => {
      const elementDelay = typeof delay === 'function' ? delay(el, i) : delay;
      
      this.applyTransition(el, duration, easing);
      
      setTimeout(() => {
        // Apply all properties
        Object.keys(params).forEach(key => {
          if (key !== 'targets' && key !== 'duration' && key !== 'easing' && 
              key !== 'delay' && key !== 'complete' && el.style.hasOwnProperty(key)) {
            (el.style as any)[key] = params[key];
          }
        });
        
        // Handle transform properties
        const transforms = [];
        
        if (params.translateX !== undefined || params.translateY !== undefined) {
          const x = Array.isArray(params.translateX) ? params.translateX[params.translateX.length - 1] : (params.translateX || 0);
          const y = Array.isArray(params.translateY) ? params.translateY[params.translateY.length - 1] : (params.translateY || 0);
          transforms.push(`translate(${x}px, ${y}px)`);
        }
        
        if (params.scale !== undefined) {
          const scale = Array.isArray(params.scale) ? params.scale[params.scale.length - 1] : params.scale;
          transforms.push(`scale(${scale})`);
        }
        
        if (transforms.length > 0) {
          el.style.transform = transforms.join(' ');
        }
        
        if (params.opacity !== undefined) {
          el.style.opacity = params.opacity;
        }
        
        if (params.complete && i === elements.length - 1) {
          setTimeout(params.complete, duration);
        }
      }, elementDelay);
    });
  }
  
  // Stagger utility
  stagger(value: number): (el: HTMLElement, i: number) => number {
    return (el: HTMLElement, i: number) => i * value;
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes achievementUnlock {
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(180deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(360deg);
      opacity: 1;
    }
  }
  
  @keyframes resourceGain {
    0% {
      transform: scale(0) translateY(0);
      opacity: 0;
    }
    20% {
      transform: scale(1.2) translateY(0);
      opacity: 1;
    }
    40% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    100% {
      transform: scale(1) translateY(-50px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// グローバルにエクスポート
export const animationSystem = SimpleAnimationSystem.getInstance();