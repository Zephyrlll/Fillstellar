import * as THREE from 'three';
import { scene, camera } from '../threeSetup.js';

export interface ResearchCompleteEffectOptions {
  name: string;
  icon: string;
  category: string;
  unlocks?: string[];
}

class ResearchCompleteEffect {
  private particles: THREE.Points[] = [];
  private light: THREE.PointLight;
  private startTime: number;
  private duration: number = 3000;
  private container: HTMLDivElement;

  constructor(options: ResearchCompleteEffectOptions) {
    const { name, icon, category, unlocks = [] } = options;
    this.startTime = Date.now();

    // Create UI notification
    this.container = document.createElement('div');
    this.container.className = 'research-complete-notification';
    this.container.innerHTML = `
      <div class="research-complete-header">
        <div class="research-complete-icon">${icon}</div>
        <div class="research-complete-text">
          <div class="research-complete-title">研究完了！</div>
          <div class="research-complete-name">${name}</div>
        </div>
      </div>
      ${unlocks.length > 0 ? `
        <div class="research-complete-unlocks">
          <div class="unlocks-label">新しくアンロック:</div>
          <div class="unlocks-list">${unlocks.join(', ')}</div>
        </div>
      ` : ''}
    `;

    document.body.appendChild(this.container);

    // Create 3D particle burst
    this.createParticleBurst();

    // Create flash light
    this.light = new THREE.PointLight(0x00ff00, 5, 100);
    this.light.position.set(0, 0, 0);
    scene.add(this.light);

    // Trigger animation
    requestAnimationFrame(() => {
      this.container.classList.add('research-complete-show');
    });

    // Play sound
    this.playResearchSound();
  }

  private createParticleBurst(): void {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at center
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      // Random velocity in all directions
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.5;

      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i3 + 2] = Math.cos(phi) * speed;

      // Random green-blue colors
      colors[i3] = 0;
      colors[i3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i3 + 2] = 0.5 + Math.random() * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.velocities = velocities;
    scene.add(particles);
    this.particles.push(particles);
  }

  private playResearchSound(): void {
    const event = new CustomEvent('playSound', {
      detail: { type: 'research-complete' }
    });
    window.dispatchEvent(event);
  }

  update(): boolean {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // Update particles
    this.particles.forEach(particles => {
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const velocities = particles.userData.velocities as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * 0.1;
        positions[i + 1] += velocities[i + 1] * 0.1;
        positions[i + 2] += velocities[i + 2] * 0.1;

        // Apply gravity
        velocities[i + 1] -= 0.01;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = 1 - progress;
    });

    // Update light
    this.light.intensity = 5 * (1 - progress);

    // Fade out notification
    if (progress > 0.7) {
      const fadeProgress = (progress - 0.7) / 0.3;
      this.container.style.opacity = String(1 - fadeProgress);
    }

    // Clean up
    if (progress >= 1) {
      this.dispose();
      return false;
    }

    return true;
  }

  dispose(): void {
    this.particles.forEach(particles => {
      scene.remove(particles);
      particles.geometry.dispose();
      (particles.material as THREE.PointsMaterial).dispose();
    });

    scene.remove(this.light);
    this.container.remove();
  }
}

// Manager
class ResearchCompleteEffectManager {
  private activeEffects: ResearchCompleteEffect[] = [];

  showResearchComplete(options: ResearchCompleteEffectOptions): void {
    const effect = new ResearchCompleteEffect(options);
    this.activeEffects.push(effect);
  }

  update(): void {
    this.activeEffects = this.activeEffects.filter(effect => effect.update());
  }

  dispose(): void {
    this.activeEffects.forEach(effect => effect.dispose());
    this.activeEffects = [];
  }
}

export const researchCompleteEffectManager = new ResearchCompleteEffectManager();

// CSS
const style = document.createElement('style');
style.textContent = `
.research-complete-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  background: linear-gradient(135deg, #0a4d0a 0%, #0d660d 100%);
  border: 3px solid #00ff00;
  border-radius: 15px;
  padding: 30px;
  min-width: 400px;
  box-shadow: 0 0 50px rgba(0, 255, 0, 0.5);
  z-index: 10001;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.research-complete-notification.research-complete-show {
  transform: translate(-50%, -50%) scale(1);
}

.research-complete-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.research-complete-icon {
  font-size: 64px;
  animation: research-spin 2s linear infinite;
}

@keyframes research-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.research-complete-text {
  flex: 1;
}

.research-complete-title {
  color: #00ff00;
  font-size: 16px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 5px;
}

.research-complete-name {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.research-complete-unlocks {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-top: 15px;
}

.unlocks-label {
  color: #00ff00;
  font-size: 14px;
  margin-bottom: 5px;
}

.unlocks-list {
  color: #fff;
  font-size: 16px;
}
`;
document.head.appendChild(style);