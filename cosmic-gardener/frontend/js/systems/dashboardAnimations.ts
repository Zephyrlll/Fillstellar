import { animationSystem } from './simpleAnimations.js';

export class DashboardAnimations {
  private previousValues: Map<string, number> = new Map();
  
  // Animate resource value changes
  animateResourceValue(element: HTMLElement, newValue: number, resourceKey: string): void {
    const previousValue = this.previousValues.get(resourceKey) || 0;
    
    if (Math.abs(newValue - previousValue) > 0.01) {
      // Animate the number
      animationSystem.countUp(element, previousValue, newValue, 1000);
      
      // Flash effect on change
      animationSystem.animate({
        targets: element,
        color: ['#4a9eff', '#ffffff'],
        duration: 1000,
        easing: 'easeOutQuad'
      });
      
      this.previousValues.set(resourceKey, newValue);
    }
  }
  
  // Animate progress bar
  animateProgressBar(element: HTMLElement, progress: number): void {
    const currentWidth = parseFloat(element.style.width) || 0;
    
    if (Math.abs(progress - currentWidth) > 0.1) {
      animationSystem.animate({
        targets: element,
        width: `${progress}%`,
        duration: 1000,
        easing: 'easeOutQuad'
      });
    }
  }
  
  // Animate production rate change
  animateRateChange(element: HTMLElement, rate: number): void {
    if (rate > 0) {
      // Positive rate - pulse green
      animationSystem.animate({
        targets: element,
        color: ['#4fff4f', '#ffffff'],
        scale: [1, 1.1, 1],
        duration: 800,
        easing: 'easeOutQuad'
      });
    } else if (rate < 0) {
      // Negative rate - pulse red
      animationSystem.animate({
        targets: element,
        color: ['#ff4f4f', '#ffffff'],
        scale: [1, 1.1, 1],
        duration: 800,
        easing: 'easeOutQuad'
      });
    }
  }
  
  // Animate milestone achievement
  animateMilestoneAchieved(container: HTMLElement): void {
    animationSystem.animate({
      targets: container,
      scale: [1, 1.2, 1],
      backgroundColor: ['rgba(74, 158, 255, 0.2)', 'rgba(74, 158, 255, 0)', 'rgba(74, 158, 255, 0.2)'],
      duration: 1500,
      easing: 'easeInOutQuad',
      complete: () => {
        // Show celebration effect
        const celebration = document.createElement('div');
        celebration.className = 'milestone-celebration';
        celebration.innerHTML = '🎉 目標達成！';
        container.appendChild(celebration);
        
        animationSystem.popup({
          targets: celebration,
          duration: 500,
          complete: () => {
            setTimeout(() => {
              animationSystem.fadeOut({
                targets: celebration,
                duration: 500,
                complete: () => celebration.remove()
              });
            }, 2000);
          }
        });
      }
    });
  }
  
  // Animate dashboard panel show
  animatePanelShow(panel: HTMLElement): void {
    // Stagger children animations
    const children = panel.querySelectorAll('.dashboard-section');
    
    animationSystem.animate({
      targets: children,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: animationSystem.stagger(100),
      duration: 600,
      easing: 'easeOutQuad'
    });
  }
  
  // Reset stored values
  reset(): void {
    this.previousValues.clear();
  }
}

export const dashboardAnimations = new DashboardAnimations();