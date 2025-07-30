/**
 * Celestial Body Visual Effects System
 * 天体タイプ別のビジュアルエフェクト
 */

import * as THREE from 'three';
import { gameStateManager } from '../state.js';

export interface CelestialEffectConfig {
  coronaEffect?: boolean;
  solarFlares?: boolean;
  pulsation?: boolean;
  colorTemperature?: 'dynamic' | 'static';
  atmosphereGlow?: boolean;
  cloudAnimation?: boolean;
  nightLights?: boolean;
  rings?: 'always' | 'conditional' | 'never';
  accretionDisk?: boolean;
  gravitationalLensing?: boolean;
  jetStream?: boolean;
  eventHorizon?: boolean;
}

export class CelestialEffects {
  private scene: THREE.Scene;
  private effectGroups: Map<string, THREE.Group> = new Map();
  private activeEffects: Map<string, any[]> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('[EFFECTS] Celestial effects system initialized');
  }
  
  // 恒星のコロナエフェクト
  createCoronaEffect(star: THREE.Mesh): THREE.Mesh {
    // 安全に半径を取得
    const radius = this.getBodyRadius(star);
    const coronaGeometry = new THREE.SphereGeometry(
      radius * 1.5,
      32,
      32
    );
    
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        innerRadius: { value: 0.8 },
        outerRadius: { value: 1.5 },
        color: { value: new THREE.Color(0xffcc00) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float innerRadius;
        uniform float outerRadius;
        uniform vec3 color;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float noise = sin(time * 2.0 + length(vPosition) * 10.0) * 0.05;
          intensity += noise;
          
          vec3 glow = color * intensity;
          float alpha = intensity * 0.6;
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    corona.position.copy(star.position);
    
    return corona;
  }
  
  // 太陽フレアエフェクト
  createSolarFlare(star: THREE.Mesh): THREE.Group {
    const flareGroup = new THREE.Group();
    const starRadius = this.getBodyRadius(star);
    
    // フレアのパーティクル
    const flareCount = 8;
    const flareGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(flareCount * 3);
    const colors = new Float32Array(flareCount * 3);
    const sizes = new Float32Array(flareCount);
    
    for (let i = 0; i < flareCount; i++) {
      const angle = (i / flareCount) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * starRadius * 1.2;
      positions[i * 3 + 1] = Math.sin(angle) * starRadius * 1.2;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.0;
      
      sizes[i] = Math.random() * 20 + 10;
    }
    
    flareGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    flareGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    flareGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const flareMaterial = new THREE.PointsMaterial({
      size: 15,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      map: this.createFlareTexture()
    });
    
    const flares = new THREE.Points(flareGeometry, flareMaterial);
    flareGroup.add(flares);
    flareGroup.position.copy(star.position);
    
    return flareGroup;
  }
  
  // 惑星の大気グローエフェクト
  createAtmosphereGlow(planet: THREE.Mesh): THREE.Mesh {
    const radius = this.getBodyRadius(planet);
    const glowGeometry = new THREE.SphereGeometry(
      radius * 1.15,
      32,
      32
    );
    
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.5 },
        p: { value: 4.0 },
        glowColor: { value: new THREE.Color(0x00aaff) },
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(c - dot(vNormal, vNormel), p);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.5);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    const atmosphere = new THREE.Mesh(glowGeometry, glowMaterial);
    atmosphere.position.copy(planet.position);
    
    return atmosphere;
  }
  
  // ブラックホールの降着円盤
  createAccretionDisk(blackHole: THREE.Mesh): THREE.Mesh {
    const blackHoleRadius = this.getBodyRadius(blackHole);
    const diskRadius = blackHoleRadius * 8; // より大きな降着円盤
    const diskGeometry = new THREE.RingGeometry(blackHoleRadius * 2, diskRadius, 128, 16); // より高解像度
    
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        innerRadius: { value: blackHoleRadius * 2 },
        outerRadius: { value: diskRadius },
        rotationSpeed: { value: 0.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vRadius;
        
        void main() {
          vUv = uv;
          vRadius = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float innerRadius;
        uniform float outerRadius;
        uniform float rotationSpeed;
        
        varying vec2 vUv;
        varying float vRadius;
        
        void main() {
          float normalizedRadius = (vRadius - innerRadius) / (outerRadius - innerRadius);
          float heat = 1.0 - normalizedRadius;
          
          vec3 color = mix(
            vec3(0.1, 0.0, 0.2),
            vec3(1.0, 0.5, 0.0),
            heat
          );
          
          // 渦巻きパターン
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float spiral = sin(angle * 6.0 - normalizedRadius * 12.0 + time * rotationSpeed * 2.0) * 0.2;
          float turbulence = sin(vRadius * 20.0 + time * 3.0) * 0.05;
          
          float opacity = pow(1.0 - normalizedRadius, 1.5) * 0.9 + spiral + turbulence;
          opacity = clamp(opacity, 0.0, 1.0);
          
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    disk.position.copy(blackHole.position);
    
    // 90度回転させて正しい向きに
    disk.rotation.x = Math.PI * 0.5; // 90度回転
    
    return disk;
  }
  
  // フレアテクスチャ生成
  private createFlareTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 180, 50, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  // 惑星の環を作成
  private createPlanetaryRings(planet: THREE.Mesh): THREE.Mesh {
    const planetRadius = this.getBodyRadius(planet);
    const innerRadius = planetRadius * 1.5;
    const outerRadius = planetRadius * 2.5;
    
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      emissive: 0x222222,
      emissiveIntensity: 0.2
    });
    
    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.position.copy(planet.position);
    rings.rotation.x = Math.PI * 0.5 + (Math.random() - 0.5) * 0.3;
    
    return rings;
  }
  
  // 動的色温度の適用
  private applyDynamicColorTemperature(star: THREE.Mesh): void {
    const material = star.material as THREE.MeshStandardMaterial;
    if (!material.userData) {
      material.userData = {};
    }
    
    // 恒星の温度情報を保存
    const temperature = star.userData.temperature || 5000;
    material.userData.baseTemperature = temperature;
    material.userData.baseColor = material.color.clone();
  }
  
  // 動的色の更新
  private updateDynamicColor(star: THREE.Mesh, time: number): void {
    const material = star.material as THREE.MeshStandardMaterial;
    if (!material.userData.baseTemperature) return;
    
    const baseTemp = material.userData.baseTemperature;
    const variation = Math.sin(time * 0.5) * 200; // ±200Kの変動
    const currentTemp = baseTemp + variation;
    
    // 温度からRGBに変換（簡易版）
    const color = this.temperatureToColor(currentTemp);
    material.color.copy(color);
    material.emissive.copy(color).multiplyScalar(0.3);
  }
  
  // 温度から色への変換
  private temperatureToColor(temperature: number): THREE.Color {
    // 簡易的な温度-色変換
    let r, g, b;
    
    if (temperature < 3000) {
      // 赤色の恒星
      r = 1.0;
      g = 0.3;
      b = 0.0;
    } else if (temperature < 5000) {
      // オレンジ色の恒星
      r = 1.0;
      g = 0.6;
      b = 0.2;
    } else if (temperature < 6500) {
      // 黄色の恒星
      r = 1.0;
      g = 1.0;
      b = 0.6;
    } else if (temperature < 10000) {
      // 白色の恒星
      r = 0.9;
      g = 0.9;
      b = 1.0;
    } else {
      // 青色の恒星
      r = 0.7;
      g = 0.8;
      b = 1.0;
    }
    
    return new THREE.Color(r, g, b);
  }
  
  // 天体の半径を安全に取得
  private getBodyRadius(body: THREE.Mesh): number {
    // userDataから半径を取得（推奨）
    if (body.userData && body.userData.radius) {
      return body.userData.radius;
    }
    
    // ジオメトリから半径を取得（フォールバック）
    const geometry = body.geometry as THREE.SphereGeometry;
    if (geometry && geometry.parameters && geometry.parameters.radius) {
      return geometry.parameters.radius;
    }
    
    // バウンディングスフィアから推定（最終手段）
    if (body.geometry) {
      body.geometry.computeBoundingSphere();
      const boundingSphere = body.geometry.boundingSphere;
      if (boundingSphere) {
        return boundingSphere.radius;
      }
    }
    
    // デフォルト値
    console.warn('[EFFECTS] Could not determine body radius, using default');
    return 10;
  }
  
  // 天体にエフェクトを適用
  applyEffects(celestialBody: THREE.Mesh): void {
    // 入力の検証
    if (!celestialBody || !celestialBody.userData) {
      console.warn('[EFFECTS] Invalid celestial body provided');
      return;
    }
    
    const bodyType = celestialBody.userData.type;
    const bodyId = celestialBody.userData.id;
    
    if (!bodyType || !bodyId) {
      console.warn('[EFFECTS] Celestial body missing type or id');
      return;
    }
    
    // 既存のエフェクトをクリア
    this.removeEffects(bodyId);
    
    const effectGroup = new THREE.Group();
    const effects: any[] = [];
    
    const config = CELESTIAL_EFFECTS[bodyType];
    if (!config) return;
    
    switch (bodyType) {
      case 'star':
        if (config.coronaEffect) {
          const corona = this.createCoronaEffect(celestialBody);
          effectGroup.add(corona);
          effects.push({ type: 'corona', object: corona });
        }
        if (config.solarFlares) {
          const flares = this.createSolarFlare(celestialBody);
          effectGroup.add(flares);
          effects.push({ type: 'flares', object: flares });
        }
        if (config.pulsation) {
          effects.push({ type: 'pulsation', object: celestialBody, originalScale: celestialBody.scale.clone() });
        }
        if (config.colorTemperature === 'dynamic') {
          this.applyDynamicColorTemperature(celestialBody);
          effects.push({ type: 'dynamicColor', object: celestialBody });
        }
        break;
        
      case 'planet':
        if (config.atmosphereGlow) {
          const atmosphere = this.createAtmosphereGlow(celestialBody);
          effectGroup.add(atmosphere);
          effects.push({ type: 'atmosphere', object: atmosphere });
        }
        if (config.rings === 'conditional' && Math.random() > 0.7) {
          const rings = this.createPlanetaryRings(celestialBody);
          effectGroup.add(rings);
          effects.push({ type: 'rings', object: rings });
        }
        break;
        
      case 'black_hole':
        if (config.accretionDisk) {
          const disk = this.createAccretionDisk(celestialBody);
          effectGroup.add(disk);
          effects.push({ type: 'accretion', object: disk });
        }
        if (config.gravitationalLensing) {
          // TODO: 重力レンズ効果の実装
          effects.push({ type: 'lensing', object: celestialBody });
        }
        break;
    }
    
    this.scene.add(effectGroup);
    this.effectGroups.set(bodyId, effectGroup);
    this.activeEffects.set(bodyId, effects);
  }
  
  // エフェクトの更新
  update(deltaTime: number): void {
    const time = Date.now() * 0.001;
    
    this.activeEffects.forEach((effects, bodyId) => {
      effects.forEach(effect => {
        if (effect.type === 'corona' && effect.object.material.uniforms) {
          effect.object.material.uniforms.time.value = time;
        }
        
        if (effect.type === 'flares') {
          effect.object.rotation.z += deltaTime * 0.1;
        }
        
        if (effect.type === 'accretion' && effect.object.material.uniforms) {
          effect.object.material.uniforms.time.value = time;
          effect.object.rotation.z += deltaTime * 0.2;
        }
        
        if (effect.type === 'atmosphere') {
          // 大気の揺らぎ
          const scale = 1.15 + Math.sin(time * 2) * 0.02;
          effect.object.scale.setScalar(scale);
        }
        
        if (effect.type === 'pulsation' && effect.originalScale) {
          // 恒星の脈動
          const pulseFactor = 1 + Math.sin(time * 3) * 0.05;
          effect.object.scale.copy(effect.originalScale).multiplyScalar(pulseFactor);
        }
        
        if (effect.type === 'dynamicColor') {
          // 動的色温度変化
          this.updateDynamicColor(effect.object, time);
        }
        
        if (effect.type === 'rings') {
          // 惑星の環の回転
          effect.object.rotation.z += deltaTime * 0.05;
        }
      });
    });
  }
  
  // エフェクトの削除
  removeEffects(bodyId: string): void {
    const effectGroup = this.effectGroups.get(bodyId);
    if (effectGroup) {
      this.scene.remove(effectGroup);
      effectGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.effectGroups.delete(bodyId);
    }
    
    this.activeEffects.delete(bodyId);
  }
  
  // 全エフェクトのクリア
  dispose(): void {
    this.effectGroups.forEach((group, bodyId) => {
      this.removeEffects(bodyId);
    });
  }
}

export const CELESTIAL_EFFECTS: Record<string, CelestialEffectConfig> = {
  star: {
    coronaEffect: true,
    solarFlares: true,
    pulsation: true,
    colorTemperature: 'dynamic'
  },
  planet: {
    atmosphereGlow: true,
    cloudAnimation: true,
    nightLights: true,
    rings: 'conditional'
  },
  moon: {
    atmosphereGlow: false,
    rings: 'never'
  },
  asteroid: {
    atmosphereGlow: false,
    rings: 'never'
  },
  comet: {
    atmosphereGlow: true,
    rings: 'never'
  },
  black_hole: {
    accretionDisk: true,
    gravitationalLensing: true,
    jetStream: true,
    eventHorizon: true
  }
};