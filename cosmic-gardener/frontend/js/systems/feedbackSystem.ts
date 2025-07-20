import { formatNumber } from '../utils.js';
import * as THREE from 'three';
import { animationSystem } from './simpleAnimations.js';

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
  
  // Notification queue system
  private notificationQueue: Array<{
    type: 'achievement' | 'toast';
    data: any;
  }> = [];
  private isProcessingQueue: boolean = false;
  private activeNotifications: Set<HTMLElement> = new Set();
  private maxActiveNotifications: number = 3;
  private notificationDelay: number = 300; // Delay between notifications
  private notificationDuration: number = 4000; // How long each notification stays
  
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
    
    // Use animation system for smooth animation
    animationSystem.resourceGain(popup);
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
    
    // Use animation system for toast animation
    animationSystem.slideInRight({
      targets: toast,
      duration: 400,
      easing: 'easeOutCubic'
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
    // Add to queue instead of showing immediately
    this.notificationQueue.push({
      type: 'achievement',
      data: achievement
    });
    
    this.processNotificationQueue();
  }
  
  // Process the notification queue
  private processNotificationQueue(): void {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }
    
    if (this.activeNotifications.size >= this.maxActiveNotifications) {
      // Wait for a notification to finish
      setTimeout(() => this.processNotificationQueue(), 500);
      return;
    }
    
    this.isProcessingQueue = true;
    const item = this.notificationQueue.shift();
    
    if (item) {
      if (item.type === 'achievement') {
        this.showAchievementNotificationImmediate(item.data);
      }
    }
    
    this.isProcessingQueue = false;
    
    // Process next item after a short delay
    if (this.notificationQueue.length > 0) {
      setTimeout(() => this.processNotificationQueue(), this.notificationDelay);
    }
  }
  
  // Actually show the achievement notification
  private showAchievementNotificationImmediate(achievement: {
    name: string;
    description: string;
    icon?: string;
  }): void {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    
    // Calculate position based on active notifications
    const offset = this.activeNotifications.size * 110; // 100px height + 10px gap
    notification.style.top = `${20 + offset}px`;
    
    notification.innerHTML = `
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <div class="achievement-content">
        <div class="achievement-title">実績解除！</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-description">${achievement.description}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    this.activeNotifications.add(notification);
    
    // Use animation system for achievement unlock
    animationSystem.achievementUnlock(notification);
    
    // Play sound if enabled
    if ((window as any).gameSettings?.soundEnabled) {
      this.playSound('achievement_unlocked');
    }
    
    // Remove after animation
    setTimeout(() => {
      animationSystem.fadeOut({
        targets: notification,
        duration: 500,
        complete: () => {
          notification.remove();
          this.activeNotifications.delete(notification);
          this.repositionNotifications();
        }
      });
    }, this.notificationDuration);
  }
  
  // Reposition notifications after one is removed
  private repositionNotifications(): void {
    const notifications = Array.from(this.activeNotifications);
    notifications.forEach((notification, index) => {
      const newTop = 20 + (index * 110);
      animationSystem.animate({
        targets: notification,
        top: `${newTop}px`,
        duration: 300,
        easing: 'easeOutCubic'
      });
    });
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
    animationSystem.fadeOut({
      targets: toast,
      duration: 300,
      complete: () => {
        toast.remove();
        this.activeToasts.delete(toast);
        this.repositionToasts();
      }
    });
  }
  
  private repositionToasts(): void {
    const toasts = Array.from(this.activeToasts);
    toasts.forEach((t, index) => {
      const position = t.className.includes('top') ? 'top' : 'bottom';
      const newPosition = 20 + index * 70;
      
      // Animate repositioning
      const animation: any = {
        targets: t,
        duration: 300,
        easing: 'easeOutQuad'
      };
      
      animation[position] = newPosition;
      animationSystem.animate(animation);
    });
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