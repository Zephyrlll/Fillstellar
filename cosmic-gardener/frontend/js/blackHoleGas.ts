import * as THREE from 'three';
import { scene } from './threeSetup.js';

export class BlackHoleGas {
    private gasParticles: THREE.Points[] = [];
    private gasGroup: THREE.Group;
    private particleCount: number = 3000;
    private blackHole: THREE.Mesh | null = null;
    private isActive: boolean = true;
    private isDisposed: boolean = false;
    
    constructor() {
        this.gasGroup = new THREE.Group();
        this.gasGroup.name = 'blackHoleGas';
        scene.add(this.gasGroup);
        
        this.createGasParticles();
        this.createVolumetricLayers();
        this.createGlowPlane();
    }
    
    private createGlowPlane(): void {
        // 上から見た時の発光プレーンを追加
        const geometry = new THREE.RingGeometry(700, 2500, 64, 8);
        
        // グラデーションテクスチャを作成
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
            gradient.addColorStop(0, 'rgba(178, 204, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(102, 153, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
        }
        const texture = new THREE.CanvasTexture(canvas);
        
        // 標準マテリアルを使用（シェーダーエラーを回避）
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        const glowPlane = new THREE.Mesh(geometry, material);
        glowPlane.rotation.x = -Math.PI / 2; // 水平に配置
        glowPlane.renderOrder = 1001;
        glowPlane.userData.isGlowPlane = true;
        
        this.gasGroup.add(glowPlane);
    }
    
    private createGasParticles(): void {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const velocities = new Float32Array(this.particleCount * 3);
        const lifetimes = new Float32Array(this.particleCount);
        const orbitalRadii = new Float32Array(this.particleCount);
        const orbitalAngles = new Float32Array(this.particleCount);
        
        // パーティクルを初期化（位相をずらして配置）
        for (let i = 0; i < this.particleCount; i++) {
            // 初期化時に位相をずらす
            const phaseOffset = (i / this.particleCount) * Math.PI * 2;
            this.resetParticle(i, positions, colors, sizes, velocities, lifetimes, orbitalRadii, orbitalAngles);
            
            // 初期半径を段階的に設定
            const t = i / this.particleCount;
            orbitalRadii[i] = 600 + t * 2400; // 600から3000まで均等に分布
            
            // 各パーティクルの寿命も段階的に設定
            lifetimes[i] = t; // 0から1まで
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // カスタム属性を保存
        geometry.userData = {
            velocities,
            lifetimes,
            orbitalRadii,
            orbitalAngles
        };
        
        const material = new THREE.PointsMaterial({
            size: 5,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const gasPoints = new THREE.Points(geometry, material);
        gasPoints.frustumCulled = false;
        this.gasParticles.push(gasPoints);
        this.gasGroup.add(gasPoints);
    }
    
    private createVolumetricLayers(): void {
        // 複数の層を作成して立体感を出す
        const layers = [
            { count: 1000, heightScale: 1.5, opacity: 0.3, size: 8 },
            { count: 800, heightScale: 2.0, opacity: 0.25, size: 10 },
            { count: 600, heightScale: 2.5, opacity: 0.2, size: 12 }
        ];
        
        layers.forEach((layer, layerIndex) => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(layer.count * 3);
            const colors = new Float32Array(layer.count * 3);
            const sizes = new Float32Array(layer.count);
            
            for (let i = 0; i < layer.count; i++) {
                const i3 = i * 3;
                const radius = 800 + Math.random() * 2000;
                const angle = Math.random() * Math.PI * 2;
                const height = (Math.random() - 0.5) * 300 * layer.heightScale * (1 - radius / 2800);
                
                positions[i3] = radius * Math.cos(angle);
                positions[i3 + 1] = height;
                positions[i3 + 2] = radius * Math.sin(angle);
                
                // 高さによって色を変える（上下が明るい）
                const heightFactor = Math.abs(height) / (150 * layer.heightScale);
                const temp = 1 - (radius - 800) / 2000;
                
                // ベース色
                colors[i3] = 0.8 + heightFactor * 0.2;
                colors[i3 + 1] = 0.6 + heightFactor * 0.3;
                colors[i3 + 2] = 1.0;
                
                // サイズも高さで変化
                sizes[i] = layer.size * (0.5 + heightFactor * 0.5) * (0.8 + Math.random() * 0.4);
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            // 各層ごとに異なるマテリアル設定
            const material = new THREE.PointsMaterial({
                size: layer.size,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: layer.opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const layerPoints = new THREE.Points(geometry, material);
            layerPoints.frustumCulled = false;
            layerPoints.renderOrder = 1002 + layerIndex; // ブラックホールの上に描画
            
            // 回転速度を保存
            layerPoints.userData.rotationSpeed = 0.0001 * (1 + layerIndex * 0.2);
            layerPoints.userData.isVolumetricLayer = true;
            
            this.gasParticles.push(layerPoints);
            this.gasGroup.add(layerPoints);
        });
    }
    
    private resetParticle(
        index: number,
        positions: Float32Array,
        colors: Float32Array,
        sizes: Float32Array,
        velocities: Float32Array,
        lifetimes: Float32Array,
        orbitalRadii: Float32Array,
        orbitalAngles: Float32Array,
        continuous: boolean = false
    ): void {
        const i3 = index * 3;
        
        // ブラックホール周辺のガスの軌道設定
        const minRadius = 600; // イベントホライゾンの外側
        const maxRadius = 3000;
        
        let radius: number;
        let angle: number;
        
        if (continuous && orbitalRadii[index] < 650) {
            // 連続的にリセット：外側から再開
            radius = maxRadius - Math.random() * 500; // 外側の領域から
            angle = orbitalAngles[index]; // 同じ角度を維持
        } else {
            // 通常のランダムリセット
            radius = minRadius + Math.random() * (maxRadius - minRadius);
            angle = Math.random() * Math.PI * 2;
        }
        
        const height = (Math.random() - 0.5) * 200 * (1 - radius / maxRadius); // 内側ほど薄い円盤
        
        // 初期位置
        if (this.blackHole) {
            positions[i3] = this.blackHole.position.x + radius * Math.cos(angle);
            positions[i3 + 1] = this.blackHole.position.y + height;
            positions[i3 + 2] = this.blackHole.position.z + radius * Math.sin(angle);
        } else {
            positions[i3] = radius * Math.cos(angle);
            positions[i3 + 1] = height;
            positions[i3 + 2] = radius * Math.sin(angle);
        }
        
        // 軌道情報を保存
        orbitalRadii[index] = radius;
        orbitalAngles[index] = angle;
        
        // 色（内側ほど高温で青白い）
        const temp = 1 - (radius - minRadius) / (maxRadius - minRadius);
        if (temp > 0.7) {
            // 非常に高温（青白い）
            colors[i3] = 0.7 + temp * 0.3;
            colors[i3 + 1] = 0.8 + temp * 0.2;
            colors[i3 + 2] = 1.0;
        } else if (temp > 0.4) {
            // 高温（白〜黄色）
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.9 + temp * 0.1;
            colors[i3 + 2] = 0.7 + temp * 0.3;
        } else {
            // 中温（オレンジ〜赤）
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.5 + temp * 0.5;
            colors[i3 + 2] = 0.3 + temp * 0.4;
        }
        
        // サイズ（内側ほど大きい）
        sizes[index] = (0.5 + temp * 1.5) * (0.8 + Math.random() * 0.4);
        
        // 寿命（連続的な場合はフェードインのため少し低く開始）
        lifetimes[index] = continuous ? 0.8 : 1.0;
        
        // 速度は軌道運動で計算
        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;
    }
    
    update(deltaTime: number, blackHolePosition?: THREE.Vector3): void {
        // Check if the effect is active or disposed
        if (!this.isActive || this.isDisposed || !this.gasGroup) {
            return;
        }
        
        const centerX = blackHolePosition ? blackHolePosition.x : 0;
        const centerY = blackHolePosition ? blackHolePosition.y : 0;
        const centerZ = blackHolePosition ? blackHolePosition.z : 0;
        
        // グループ全体の位置を更新
        this.gasGroup.position.set(centerX, centerY, centerZ);
        
        // グロープレーンのアニメーション
        // グロープレーンのアニメーション（脈動効果）
        this.gasGroup.children.forEach((child) => {
            if (child.userData.isGlowPlane && child instanceof THREE.Mesh) {
                const material = child.material as THREE.MeshBasicMaterial;
                if (material && material.opacity !== undefined) {
                    // 時間に基づいて透明度を変化させて脈動効果を表現
                    const time = performance.now() * 0.001;
                    material.opacity = 0.25 + 0.05 * Math.sin(time * 2.0);
                }
            }
        });
        
        // 各パーティクルシステムを更新
        this.gasParticles.forEach((particleSystem) => {
            // 立体層は回転のみ
            if (particleSystem.userData.isVolumetricLayer) {
                particleSystem.rotation.y += particleSystem.userData.rotationSpeed * deltaTime * 60;
                // 立体層の位置は相対的なのでグループで管理
                return;
            }
            
            // メインのガスパーティクルの更新
            if (!particleSystem.geometry) return;
            
            const positions = particleSystem.geometry.attributes.position.array as Float32Array;
            const colors = particleSystem.geometry.attributes.color.array as Float32Array;
            const sizes = particleSystem.geometry.attributes.size.array as Float32Array;
            const userData = particleSystem.geometry.userData;
            const lifetimes = userData.lifetimes as Float32Array;
            const orbitalRadii = userData.orbitalRadii as Float32Array;
            const orbitalAngles = userData.orbitalAngles as Float32Array;
            
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // 寿命を減らす
                lifetimes[i] -= deltaTime * 0.2;
                
                // 軌道運動
                const radius = orbitalRadii[i];
                const orbitalSpeed = 0.001 / Math.sqrt(radius / 1000); // ケプラー運動（内側ほど速い）
                orbitalAngles[i] += orbitalSpeed * deltaTime * 60;
                
                // スパイラルイン（徐々に中心に向かう）
                orbitalRadii[i] -= deltaTime * 50 * (1 - radius / 3000); // 内側ほど速く落ちる
                
                // 新しい位置を計算
                const currentRadius = orbitalRadii[i];
                const angle = orbitalAngles[i];
                const height = (positions[i3 + 1] - centerY) * 0.99; // 徐々に円盤面に近づく
                
                positions[i3] = centerX + currentRadius * Math.cos(angle);
                positions[i3 + 1] = centerY + height;
                positions[i3 + 2] = centerZ + currentRadius * Math.sin(angle);
                
                // 内側に近づくほど明るくなる
                const temp = 1 - (currentRadius - 600) / 2400;
                if (temp > 0.9) {
                    // イベントホライゾン近くでは非常に明るい
                    colors[i3] = 1.0;
                    colors[i3 + 1] = 1.0;
                    colors[i3 + 2] = 1.0;
                }
                
                // スムーズなフェード効果
                let alpha = 1.0;
                
                // フェードイン（外側の新しいパーティクル）
                if (currentRadius > 2500) {
                    alpha = (3000 - currentRadius) / 500;
                }
                
                // フェードアウト（内側の古いパーティクル）
                if (currentRadius < 700) {
                    alpha = (currentRadius - 550) / 150;
                }
                
                // 寿命に基づくフェード
                alpha *= Math.min(1.0, lifetimes[i] * 2);
                
                // サイズに反映
                sizes[i] = sizes[i] * 0.99 * alpha;
                
                // パーティクルをリセット（連続的に）
                if (lifetimes[i] <= 0 || currentRadius < 550) {
                    this.resetParticle(i, positions, colors, sizes, userData.velocities, lifetimes, orbitalRadii, orbitalAngles, true);
                }
            }
            
            // 更新をGPUに送信
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.geometry.attributes.color.needsUpdate = true;
            particleSystem.geometry.attributes.size.needsUpdate = true;
        });
    }
    
    setBlackHole(blackHole: THREE.Mesh): void {
        this.blackHole = blackHole;
        
        // If the effect was previously disposed, reinitialize it
        if (!this.isActive || this.isDisposed) {
            this.isActive = true;
            this.isDisposed = false;
            
            // Re-add the group to the scene if it was removed
            if (!this.gasGroup.parent) {
                scene.add(this.gasGroup);
            }
            
            // Recreate particles if they were disposed
            if (this.gasParticles.length === 0) {
                this.createGasParticles();
                this.createVolumetricLayers();
                this.createGlowPlane();
            }
        }
    }
    
    dispose(): void {
        // Mark as inactive and disposed to stop updates
        this.isActive = false;
        this.isDisposed = true;
        
        // Dispose all particle systems
        this.gasParticles.forEach((particleSystem) => {
            if (particleSystem.geometry) {
                particleSystem.geometry.dispose();
            }
            if (particleSystem.material) {
                if (particleSystem.material instanceof THREE.Material) {
                    particleSystem.material.dispose();
                }
            }
        });
        this.gasParticles = [];
        
        // Dispose glow plane and other children
        this.gasGroup.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (child.material instanceof THREE.ShaderMaterial) {
                        // Dispose shader material
                        child.material.dispose();
                    } else if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            }
        });
        
        // Remove group from scene
        if (this.gasGroup.parent) {
            this.gasGroup.parent.remove(this.gasGroup);
        }
        
        // Clear all children
        this.gasGroup.clear();
        
        // Clear references
        this.blackHole = null;
    }
    
    isEffectActive(): boolean {
        return this.isActive;
    }
}

// シングルトンインスタンス
export const blackHoleGas = new BlackHoleGas();