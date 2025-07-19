import * as THREE from 'three';
import { scene } from './threeSetup.js';

export class BlackHoleGas {
    private gasParticles: THREE.Points[] = [];
    private gasGroup: THREE.Group;
    private particleCount: number = 3000;
    private blackHole: THREE.Mesh | null = null;
    
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
        
        // カスタムシェーダーマテリアルで中心が明るい効果
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                
                void main() {
                    // 中心からの距離
                    float dist = length(vUv - vec2(0.5, 0.5)) * 2.0;
                    
                    // 内側ほど明るい
                    float intensity = 1.0 - dist;
                    intensity = pow(intensity, 2.0);
                    
                    // 時間で脈動
                    intensity *= 0.8 + 0.2 * sin(time * 2.0);
                    
                    // 青白い光
                    vec3 color = vec3(0.7, 0.8, 1.0) * intensity;
                    
                    gl_FragColor = vec4(color, intensity * 0.3);
                }
            `,
            transparent: true,
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
        
        // パーティクルを初期化
        for (let i = 0; i < this.particleCount; i++) {
            this.resetParticle(i, positions, colors, sizes, velocities, lifetimes, orbitalRadii, orbitalAngles);
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
        orbitalAngles: Float32Array
    ): void {
        const i3 = index * 3;
        
        // ブラックホール周辺のガスの軌道設定
        const minRadius = 600; // イベントホライゾンの外側
        const maxRadius = 3000;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const angle = Math.random() * Math.PI * 2;
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
        
        // 寿命
        lifetimes[index] = 1.0;
        
        // 速度は軌道運動で計算
        velocities[i3] = 0;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = 0;
    }
    
    update(deltaTime: number, blackHolePosition?: THREE.Vector3): void {
        const centerX = blackHolePosition ? blackHolePosition.x : 0;
        const centerY = blackHolePosition ? blackHolePosition.y : 0;
        const centerZ = blackHolePosition ? blackHolePosition.z : 0;
        
        // グループ全体の位置を更新
        this.gasGroup.position.set(centerX, centerY, centerZ);
        
        // グロープレーンのアニメーション
        this.gasGroup.children.forEach((child) => {
            if (child.userData.isGlowPlane && child instanceof THREE.Mesh) {
                const material = child.material as THREE.ShaderMaterial;
                if (material.uniforms && material.uniforms.time) {
                    material.uniforms.time.value += deltaTime;
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
                
                // フェードアウト効果
                const alpha = lifetimes[i];
                sizes[i] *= 0.99; // 徐々に小さくなる
                
                // パーティクルをリセット
                if (lifetimes[i] <= 0 || currentRadius < 550) {
                    this.resetParticle(i, positions, colors, sizes, userData.velocities, lifetimes, orbitalRadii, orbitalAngles);
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
    }
}

// シングルトンインスタンス
export const blackHoleGas = new BlackHoleGas();