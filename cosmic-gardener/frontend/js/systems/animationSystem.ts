// Import anime.js with proper module resolution
const anime = (window as any).anime || await import('animejs/lib/anime.es.js').then(m => m.default || m);

export interface AnimationConfig {
  targets: HTMLElement | HTMLElement[] | string;
  duration?: number;
  easing?: string;
  delay?: number | anime.FunctionBasedParameter;
  complete?: () => void;
}

export class AnimationSystem {
  private static instance: AnimationSystem;
  private activeAnimations: Map<string, anime.AnimeInstance> = new Map();
  
  private constructor() {
    console.log('[ANIMATION] Animation system initialized');
  }
  
  static getInstance(): AnimationSystem {
    if (!AnimationSystem.instance) {
      AnimationSystem.instance = new AnimationSystem();
    }
    return AnimationSystem.instance;
  }
  
  // UI要素のフェードイン
  fadeIn(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      opacity: [0, 1],
      duration: config.duration || 300,
      easing: config.easing || 'easeOutQuad',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // UI要素のフェードアウト
  fadeOut(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      opacity: [1, 0],
      duration: config.duration || 300,
      easing: config.easing || 'easeInQuad',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // スケールアニメーション
  scale(config: AnimationConfig & { scale: number | number[] }): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      scale: config.scale,
      duration: config.duration || 300,
      easing: config.easing || 'easeInOutQuad',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // スライドイン（左から）
  slideInLeft(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      translateX: ['-100%', 0],
      opacity: [0, 1],
      duration: config.duration || 400,
      easing: config.easing || 'easeOutCubic',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // スライドイン（右から）
  slideInRight(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      translateX: ['100%', 0],
      opacity: [0, 1],
      duration: config.duration || 400,
      easing: config.easing || 'easeOutCubic',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // ポップアップアニメーション
  popup(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      scale: [0.8, 1],
      opacity: [0, 1],
      duration: config.duration || 300,
      easing: config.easing || 'easeOutBack',
      delay: config.delay || 0,
      complete: config.complete
    });
    
    return animation;
  }
  
  // 実績アンロックアニメーション
  achievementUnlock(element: HTMLElement): anime.AnimeInstance {
    const timeline = anime.timeline({
      easing: 'easeOutExpo',
      duration: 750
    });
    
    timeline
      .add({
        targets: element,
        scale: [0, 1.2],
        opacity: [0, 1],
        duration: 400
      })
      .add({
        targets: element,
        scale: 1,
        duration: 300
      })
      .add({
        targets: element,
        rotate: '1turn',
        duration: 600
      }, '-=300');
    
    return timeline;
  }
  
  // リソース取得アニメーション
  resourceGain(element: HTMLElement, targetPosition?: { x: number; y: number }): anime.AnimeInstance {
    const timeline = anime.timeline({
      easing: 'easeOutQuad',
      complete: () => {
        element.remove();
      }
    });
    
    timeline
      .add({
        targets: element,
        scale: [0, 1.2],
        opacity: [0, 1],
        duration: 200
      })
      .add({
        targets: element,
        scale: 1,
        duration: 150
      })
      .add({
        targets: element,
        translateY: -50,
        opacity: [1, 0],
        duration: 800,
        easing: 'easeInQuad'
      });
    
    if (targetPosition) {
      timeline.add({
        targets: element,
        translateX: targetPosition.x,
        translateY: targetPosition.y,
        duration: 600,
        easing: 'easeInOutQuad'
      }, '-=800');
    }
    
    return timeline;
  }
  
  // パルスアニメーション（注目を集める）
  pulse(config: AnimationConfig): anime.AnimeInstance {
    const animation = anime({
      targets: config.targets,
      scale: [1, 1.1, 1],
      duration: config.duration || 1000,
      easing: config.easing || 'easeInOutQuad',
      delay: config.delay || 0,
      loop: true,
      complete: config.complete
    });
    
    return animation;
  }
  
  // グロー効果
  glow(element: HTMLElement, color: string = '#4a9eff'): anime.AnimeInstance {
    const animation = anime({
      targets: element,
      boxShadow: [
        `0 0 0 rgba(74, 158, 255, 0)`,
        `0 0 20px ${color}`,
        `0 0 0 rgba(74, 158, 255, 0)`
      ],
      duration: 2000,
      easing: 'easeInOutQuad',
      loop: true
    });
    
    return animation;
  }
  
  // 数値カウントアップアニメーション
  countUp(element: HTMLElement, start: number, end: number, duration: number = 1000): anime.AnimeInstance {
    const obj = { value: start };
    
    const animation = anime({
      targets: obj,
      value: end,
      duration: duration,
      easing: 'easeInOutQuad',
      round: 1,
      update: () => {
        element.textContent = Math.floor(obj.value).toLocaleString();
      }
    });
    
    return animation;
  }
  
  // トーストアニメーション
  toast(element: HTMLElement): anime.AnimeInstance {
    const timeline = anime.timeline({
      complete: () => {
        setTimeout(() => {
          element.remove();
        }, 3000);
      }
    });
    
    timeline
      .add({
        targets: element,
        translateY: [-100, 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutCubic'
      })
      .add({
        targets: element,
        translateY: -100,
        opacity: 0,
        duration: 400,
        easing: 'easeInCubic',
        delay: 3000
      });
    
    return timeline;
  }
  
  // アニメーションを停止
  stop(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.pause();
      this.activeAnimations.delete(animationId);
    }
  }
  
  // 全てのアニメーションを停止
  stopAll(): void {
    this.activeAnimations.forEach(animation => animation.pause());
    this.activeAnimations.clear();
  }
  
  // アニメーションを登録
  register(id: string, animation: anime.AnimeInstance): void {
    this.activeAnimations.set(id, animation);
  }
  
  // グローバル設定
  setDefaultEasing(easing: string): void {
    anime.default.easing = easing;
  }
  
  setDefaultDuration(duration: number): void {
    anime.default.duration = duration;
  }
  
  // 汎用アニメーション実行メソッド
  anime(params: anime.AnimeParams): anime.AnimeInstance {
    return anime(params);
  }
}

// グローバルにエクスポート
export const animationSystem = AnimationSystem.getInstance();