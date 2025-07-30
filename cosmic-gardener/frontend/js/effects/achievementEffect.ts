import * as THREE from 'three';
import { scene, camera, renderer } from '../threeSetup.js';

export interface AchievementEffectOptions {
  title: string;
  description: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

class AchievementEffect {
  private container: HTMLDivElement;
  private startTime: number;
  private duration: number = 5000;
  private glowEffect?: THREE.Mesh;

  constructor(options: AchievementEffectOptions) {
    const { title, description, icon = '🏆', rarity = 'common' } = options;
    this.startTime = Date.now();

    // Create achievement UI
    this.container = document.createElement('div');
    this.container.className = `achievement-popup achievement-${rarity}`;
    this.container.innerHTML = `
      <div class="achievement-icon">${icon}</div>
      <div class="achievement-content">
        <div class="achievement-title">実績解除！</div>
        <div class="achievement-name">${title}</div>
        <div class="achievement-description">${description}</div>
      </div>
    `;

    // Add to page
    document.body.appendChild(this.container);

    // Create 3D glow effect
    this.createGlowEffect(rarity);

    // Trigger animation
    requestAnimationFrame(() => {
      this.container.classList.add('achievement-show');
    });

    // Play sound if available
    this.playAchievementSound(rarity);
  }

  private createGlowEffect(rarity: string): void {
    const colors: { [key: string]: number } = {
      common: 0xffffff,
      rare: 0x0099ff,
      epic: 0x9900ff,
      legendary: 0xffaa00
    };

    const geometry = new THREE.SphereGeometry(50, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: colors[rarity] || colors.common,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });

    this.glowEffect = new THREE.Mesh(geometry, material);
    this.glowEffect.position.set(0, 0, 0);
    scene.add(this.glowEffect);
  }

  private playAchievementSound(rarity: string): void {
    // Sound will be implemented in the sound system
    const event = new CustomEvent('playSound', {
      detail: { type: 'achievement', rarity }
    });
    window.dispatchEvent(event);
  }

  update(): boolean {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // Update glow effect
    if (this.glowEffect) {
      // Expand and fade
      const scale = 1 + progress * 2;
      this.glowEffect.scale.setScalar(scale);
      this.glowEffect.material.opacity = 0.3 * (1 - progress);
      
      // Rotate
      this.glowEffect.rotation.y += 0.01;
    }

    // Start fade out at 80%
    if (progress > 0.8) {
      const fadeProgress = (progress - 0.8) / 0.2;
      this.container.style.opacity = String(1 - fadeProgress);
    }

    // Clean up when done
    if (progress >= 1) {
      this.dispose();
      return false;
    }

    return true;
  }

  dispose(): void {
    if (this.glowEffect) {
      scene.remove(this.glowEffect);
      this.glowEffect.geometry.dispose();
      this.glowEffect.material.dispose();
    }
    
    this.container.remove();
  }
}

// Achievement manager
class AchievementEffectManager {
  private activeEffects: AchievementEffect[] = [];
  private queue: AchievementEffectOptions[] = [];
  private isProcessing: boolean = false;

  showAchievement(options: AchievementEffectOptions): void {
    this.queue.push(options);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const options = this.queue.shift()!;
    
    const effect = new AchievementEffect(options);
    this.activeEffects.push(effect);

    // Process next after delay
    setTimeout(() => {
      this.isProcessing = false;
      this.processQueue();
    }, 1500);
  }

  update(): void {
    this.activeEffects = this.activeEffects.filter(effect => effect.update());
  }

  dispose(): void {
    this.activeEffects.forEach(effect => effect.dispose());
    this.activeEffects = [];
    this.queue = [];
  }
}

export const achievementEffectManager = new AchievementEffectManager();

// CSS for achievement popups
const style = document.createElement('style');
style.textContent = `
.achievement-popup {
  position: fixed;
  top: 100px;
  right: -400px;
  width: 350px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #fff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 10000;
}

.achievement-popup.achievement-show {
  right: 20px;
}

.achievement-popup.achievement-rare {
  border-color: #0099ff;
  box-shadow: 0 0 40px rgba(0, 153, 255, 0.6);
}

.achievement-popup.achievement-epic {
  border-color: #9900ff;
  box-shadow: 0 0 40px rgba(153, 0, 255, 0.6);
}

.achievement-popup.achievement-legendary {
  border-color: #ffaa00;
  box-shadow: 0 0 50px rgba(255, 170, 0, 0.8);
  animation: legendary-pulse 2s infinite;
}

@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 50px rgba(255, 170, 0, 0.8); }
  50% { box-shadow: 0 0 80px rgba(255, 170, 0, 1); }
}

.achievement-icon {
  font-size: 48px;
  animation: achievement-bounce 0.6s ease-out;
}

@keyframes achievement-bounce {
  0% { transform: scale(0) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}

.achievement-content {
  flex: 1;
}

.achievement-title {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 5px;
}

.achievement-name {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.achievement-description {
  color: #aaa;
  font-size: 14px;
  line-height: 1.4;
}

.achievement-legendary .achievement-title {
  background: linear-gradient(45deg, #ffaa00, #ffdd00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: legendary-text 2s linear infinite;
}

@keyframes legendary-text {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
`;
document.head.appendChild(style);