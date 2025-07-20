import { formatNumber } from '../utils.js';
import * as THREE from 'three';

export interface ToastOptions {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export class FeedbackSystem {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private toastContainer: HTMLDivElement;
  private popupContainer: HTMLDivElement;
  private activeToasts: Set<HTMLElement> = new Set();
  
  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.camera = camera;
    this.renderer = renderer;
    
    // Create toast container
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    document.body.appendChild(this.toastContainer);
    
    // Create popup container for resource gains
    this.popupContainer = document.createElement('div');
    this.popupContainer.className = 'popup-container';
    document.body.appendChild(this.popupContainer);
  }
  
  // Show resource gain popup at 3D position
  showResourceGain(
    amount: number, 
    resourceType: string, 
    worldPosition: THREE.Vector3
  ): void {
    const screenPos = this.worldToScreen(worldPosition);
    
    const popup = document.createElement('div');
    popup.className = `resource-popup ${resourceType.toLowerCase().replace(/\s+/g, '-')}`;
    popup.textContent = `+${formatNumber(amount)}`;
    
    // Set initial position
    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y}px`;
    
    this.popupContainer.appendChild(popup);
    
    // Trigger animation after next frame
    requestAnimationFrame(() => {
      popup.classList.add('animate');
    });
    
    // Remove after animation
    setTimeout(() => {
      popup.remove();
    }, 1500);
  }
  
  // Show toast notification
  showToast(options: ToastOptions): void {
    const {
      message,
      type,
      duration = 3000,
      position = 'top-right'
    } = options;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-${position}`;
    toast.innerHTML = `
      <div class="toast-icon">${this.getToastIcon(type)}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close">×</button>
    `;
    
    // Position based on other toasts
    const existingToasts = Array.from(this.activeToasts);
    const offset = existingToasts.length * 70; // 60px height + 10px gap
    
    if (position.includes('top')) {
      toast.style.top = `${20 + offset}px`;
    } else {
      toast.style.bottom = `${20 + offset}px`;
    }
    
    this.toastContainer.appendChild(toast);
    this.activeToasts.add(toast);
    
    // Fade in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
    
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.removeToast(toast));
    }
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }
  }
  
  // Show achievement unlock notification
  showAchievementUnlocked(achievement: {
    name: string;
    description: string;
    icon?: string;
  }): void {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <div class="achievement-content">
        <div class="achievement-title">実績解除！</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-description">${achievement.description}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('visible');
    });
    
    // Play sound if enabled
    if ((window as any).gameSettings?.soundEnabled) {
      this.playSound('achievement_unlocked');
    }
    
    // Remove after animation
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }
  
  // Show important event banner
  showEventBanner(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'critical' = 'info'
  ): void {
    const banner = document.createElement('div');
    banner.className = `event-banner event-banner-${type}`;
    banner.innerHTML = `
      <div class="event-banner-content">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <button class="event-banner-close">×</button>
    `;
    
    document.body.appendChild(banner);
    
    // Animate in
    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });
    
    // Close button
    const closeBtn = banner.querySelector('.event-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 300);
      });
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 300);
    }, 5000);
  }
  
  // Convert 3D world position to screen coordinates
  private worldToScreen(position: THREE.Vector3): { x: number; y: number } {
    const vector = position.clone();
    vector.project(this.camera);
    
    const widthHalf = this.renderer.domElement.width / 2;
    const heightHalf = this.renderer.domElement.height / 2;
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    };
  }
  
  private removeToast(toast: HTMLElement): void {
    toast.classList.remove('visible');
    this.activeToasts.delete(toast);
    
    // Reposition remaining toasts
    const toasts = Array.from(this.activeToasts);
    toasts.forEach((t, index) => {
      const position = t.className.includes('top') ? 'top' : 'bottom';
      if (position === 'top') {
        t.style.top = `${20 + index * 70}px`;
      } else {
        t.style.bottom = `${20 + index * 70}px`;
      }
    });
    
    setTimeout(() => toast.remove(), 300);
  }
  
  private getToastIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': 
      default: return 'ℹ';
    }
  }
  
  private playSound(soundName: string): void {
    // Sound implementation would go here
    // For now, just log
    console.log(`[SOUND] Playing: ${soundName}`);
  }
  
  // Update camera/renderer references if they change
  updateReferences(camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.camera = camera;
    this.renderer = renderer;
  }
  
  // Clean up
  destroy(): void {
    this.toastContainer.remove();
    this.popupContainer.remove();
    this.activeToasts.clear();
  }
}