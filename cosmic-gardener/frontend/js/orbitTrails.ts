import * as THREE from 'three';
import { CelestialBody, gameState } from './state.js';
import { scene } from './threeSetup.js';

interface OrbitPoint {
    position: THREE.Vector3;
    timestamp: number;
}

interface OrbitTrail {
    points: OrbitPoint[];
    line: THREE.Line | null;
    geometry: THREE.BufferGeometry | null;
    material: THREE.LineBasicMaterial;
    lastUpdateTime: number;
}

class OrbitTrailSystem {
    private trails: Map<string, OrbitTrail> = new Map();
    private enabled: boolean = false;
    private maxPoints: number = 300;
    private updateInterval: number = 100; // ミリ秒
    private trailGroup: THREE.Group;
    private enabledTypes: Set<string> = new Set(['star', 'planet', 'moon', 'asteroid', 'comet', 'black_hole']);

    constructor() {
        this.trailGroup = new THREE.Group();
        this.trailGroup.name = 'orbitTrails';
        scene.add(this.trailGroup);
    }

    toggle(): boolean {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            // 軌道表示を無効化
            this.clearAllTrails();
        }
        
        return this.enabled;
    }

    update(bodies: CelestialBody[]): void {
        if (!this.enabled) return;

        const currentTime = Date.now();

        bodies.forEach(body => {
            if (body.userData.isStatic) return; // 静的オブジェクトはスキップ
            if (!this.enabledTypes.has(body.userData.type)) return; // フィルターでスキップ

            const id = body.uuid;
            let trail = this.trails.get(id);

            if (!trail) {
                // 新しい軌道を作成
                trail = this.createTrail(body);
                this.trails.set(id, trail);
            }

            // 更新間隔をチェック
            if (currentTime - trail.lastUpdateTime < this.updateInterval) return;

            // 新しい点を追加
            trail.points.push({
                position: body.position.clone(),
                timestamp: currentTime
            });

            // 古い点を削除
            if (trail.points.length > this.maxPoints) {
                trail.points.shift();
            }

            // ラインを更新
            this.updateTrailLine(trail);
            trail.lastUpdateTime = currentTime;
        });

        // 存在しない天体の軌道を削除
        this.cleanupOldTrails(bodies);
    }

    private createTrail(body: CelestialBody): OrbitTrail {
        const color = this.getTrailColor(body.userData.type);
        const material = new THREE.LineBasicMaterial({
            color: color,
            opacity: 0.6,
            transparent: true,
            linewidth: 2
        });

        return {
            points: [{
                position: body.position.clone(),
                timestamp: Date.now()
            }],
            line: null,
            geometry: null,
            material: material,
            lastUpdateTime: Date.now()
        };
    }

    private getTrailColor(type: string): THREE.Color {
        switch (type) {
            case 'star':
                return new THREE.Color(0xffff00); // 黄色
            case 'planet':
                return new THREE.Color(0x0088ff); // 青
            case 'moon':
                return new THREE.Color(0xcccccc); // 灰色
            case 'asteroid':
                return new THREE.Color(0x888888); // 暗い灰色
            case 'comet':
                return new THREE.Color(0x00ffff); // シアン
            case 'black_hole':
                return new THREE.Color(0xff00ff); // マゼンタ
            default:
                return new THREE.Color(0xffffff); // 白
        }
    }

    private updateTrailLine(trail: OrbitTrail): void {
        if (trail.points.length < 2) return;

        // 既存のラインを削除
        if (trail.line) {
            this.trailGroup.remove(trail.line);
            if (trail.geometry) trail.geometry.dispose();
        }

        // 新しいジオメトリを作成
        const positions = new Float32Array(trail.points.length * 3);
        trail.points.forEach((point, i) => {
            positions[i * 3] = point.position.x;
            positions[i * 3 + 1] = point.position.y;
            positions[i * 3 + 2] = point.position.z;
        });

        trail.geometry = new THREE.BufferGeometry();
        trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // 新しいラインを作成
        trail.line = new THREE.Line(trail.geometry, trail.material);
        trail.line.frustumCulled = false; // カリングを無効化
        this.trailGroup.add(trail.line);
    }

    private cleanupOldTrails(currentBodies: CelestialBody[]): void {
        const currentIds = new Set(currentBodies.map(b => b.uuid));
        
        this.trails.forEach((trail, id) => {
            if (!currentIds.has(id)) {
                // 軌道を削除
                if (trail.line) {
                    this.trailGroup.remove(trail.line);
                    if (trail.geometry) trail.geometry.dispose();
                    trail.material.dispose();
                }
                this.trails.delete(id);
            }
        });
    }

    private clearAllTrails(): void {
        this.trails.forEach(trail => {
            if (trail.line) {
                this.trailGroup.remove(trail.line);
                if (trail.geometry) trail.geometry.dispose();
                trail.material.dispose();
            }
        });
        this.trails.clear();
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setMaxPoints(points: number): void {
        this.maxPoints = Math.max(10, Math.min(1000, points));
    }

    setUpdateInterval(interval: number): void {
        this.updateInterval = Math.max(10, Math.min(1000, interval));
    }

    toggleType(type: string): boolean {
        if (this.enabledTypes.has(type)) {
            this.enabledTypes.delete(type);
            // 既存のトレイルを削除
            this.trails.forEach((trail, id) => {
                const body = gameState.stars.find(s => s.uuid === id);
                if (body && body.userData.type === type) {
                    if (trail.line) {
                        this.trailGroup.remove(trail.line);
                        if (trail.geometry) trail.geometry.dispose();
                        trail.material.dispose();
                    }
                    this.trails.delete(id);
                }
            });
            return false;
        } else {
            this.enabledTypes.add(type);
            return true;
        }
    }

    isTypeEnabled(type: string): boolean {
        return this.enabledTypes.has(type);
    }

    getAllTypes(): string[] {
        return ['star', 'planet', 'moon', 'asteroid', 'comet', 'black_hole'];
    }
}

// シングルトンインスタンス
export const orbitTrailSystem = new OrbitTrailSystem();