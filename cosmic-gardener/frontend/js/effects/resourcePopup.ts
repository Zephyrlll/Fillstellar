import * as THREE from 'three';
import { scene, camera } from '../threeSetup.js';

export interface ResourcePopupOptions {
  amount: number;
  resourceType: string;
  color?: string;
  position?: THREE.Vector3;
  duration?: number;
  fontSize?: number;
}

class ResourcePopup {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private sprite: THREE.Sprite;
  private startTime: number;
  private duration: number;
  private startY: number;
  private endY: number;
  private opacity: number = 1;

  constructor(options: ResourcePopupOptions) {
    const {
      amount,
      resourceType,
      color = '#00ff00',
      position = new THREE.Vector3(0, 0, 0),
      duration = 2000,
      fontSize = 64
    } = options;

    this.duration = duration;
    this.startTime = Date.now();

    // Create canvas for text
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.context = this.canvas.getContext('2d')!;

    // Set up text
    this.context.font = `bold ${fontSize}px Arial`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Add glow effect
    this.context.shadowColor = color;
    this.context.shadowBlur = 20;
    
    // Draw text
    const text = `+${this.formatNumber(amount)}`;
    this.context.fillText(text, 256, 64);

    // Create texture and sprite
    this.texture = new THREE.CanvasTexture(this.canvas);
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.sprite = new THREE.Sprite(material);
    this.sprite.scale.set(4, 1, 1);
    this.sprite.position.copy(position);
    
    // Set animation parameters
    this.startY = position.y;
    this.endY = position.y + 5;

    scene.add(this.sprite);
  }

  private formatNumber(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(0);
  }

  update(): boolean {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // Animate position (float upward)
    const easeOut = 1 - Math.pow(1 - progress, 2);
    this.sprite.position.y = this.startY + (this.endY - this.startY) * easeOut;

    // Animate opacity (fade out in last 30%)
    if (progress > 0.7) {
      this.opacity = 1 - ((progress - 0.7) / 0.3);
      this.sprite.material.opacity = this.opacity;
    }

    // Scale pulse effect in first 20%
    if (progress < 0.2) {
      const pulse = 1 + Math.sin(progress * 5 * Math.PI) * 0.2;
      this.sprite.scale.setScalar(4 * pulse);
    }

    // Keep sprite facing camera
    this.sprite.lookAt(camera.position);

    // Return false when animation is complete
    if (progress >= 1) {
      this.dispose();
      return false;
    }

    return true;
  }

  dispose(): void {
    scene.remove(this.sprite);
    this.texture.dispose();
    this.sprite.material.dispose();
    this.canvas.remove();
  }
}

// Resource type to color mapping
const RESOURCE_COLORS: { [key: string]: string } = {
  cosmicDust: '#FFE4B5',
  energy: '#FFFF00',
  organicMatter: '#90EE90',
  biomass: '#228B22',
  darkMatter: '#4B0082',
  thoughtPoints: '#FF69B4',
  // Derived resources
  ironDust: '#CD853F',
  carbonDust: '#696969',
  siliconDust: '#87CEEB',
  rareDust: '#FF6347',
  // Add more as needed
};

// Popup manager
class ResourcePopupManager {
  private activePopups: ResourcePopup[] = [];
  private lastUpdate: number = 0;

  createPopup(options: ResourcePopupOptions): void {
    // Apply default color based on resource type
    if (!options.color && options.resourceType && RESOURCE_COLORS[options.resourceType]) {
      options.color = RESOURCE_COLORS[options.resourceType];
    }

    // Add random horizontal offset to prevent overlap
    if (options.position) {
      options.position.x += (Math.random() - 0.5) * 2;
      options.position.z += (Math.random() - 0.5) * 2;
    }

    const popup = new ResourcePopup(options);
    this.activePopups.push(popup);
  }

  update(): void {
    const now = Date.now();
    if (now - this.lastUpdate < 16) return; // 60 FPS limit
    this.lastUpdate = now;

    // Update all popups and remove finished ones
    this.activePopups = this.activePopups.filter(popup => popup.update());
  }

  // Create popup at world position
  createWorldPopup(amount: number, resourceType: string, worldPosition: THREE.Vector3): void {
    this.createPopup({
      amount,
      resourceType,
      position: worldPosition.clone()
    });
  }

  // Create popup at screen position (useful for UI elements)
  createScreenPopup(amount: number, resourceType: string, screenX: number, screenY: number): void {
    const vector = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();

    // Convert screen coordinates to normalized device coordinates
    const x = (screenX / window.innerWidth) * 2 - 1;
    const y = -(screenY / window.innerHeight) * 2 + 1;

    // Project to world position
    vector.set(x, y, 0.5);
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = 10;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    this.createPopup({
      amount,
      resourceType,
      position: pos
    });
  }

  dispose(): void {
    this.activePopups.forEach(popup => popup.dispose());
    this.activePopups = [];
  }
}

export const resourcePopupManager = new ResourcePopupManager();