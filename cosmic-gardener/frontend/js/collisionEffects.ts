import * as THREE from 'three';
import { scene } from './threeSetup.js';
import { gameState, gameStateManager, CelestialBody } from './state.js';
import { createCelestialBody } from './celestialBody.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';
import { blackHoleGas } from './blackHoleGas.js';

export interface CollisionResult {
    type: 'merge' | 'destruction' | 'bounce' | 'fragmentation';
    survivors: CelestialBody[];
    debris: CelestialBody[];
    message: string;
    energy: number; // 衝突エネルギー
}

export class CollisionEffects {
    // 衝突タイプを判定
    static determineCollisionType(body1: CelestialBody, body2: CelestialBody, relativeVelocity: THREE.Vector3): CollisionResult['type'] {
        // ブラックホールは必ず吸収
        if (body1.userData.type === 'black_hole' || body2.userData.type === 'black_hole') {
            return 'merge';
        }
        
        const massRatio = Math.max(body1.userData.mass, body2.userData.mass) / 
                         Math.min(body1.userData.mass, body2.userData.mass);
        const collisionSpeed = relativeVelocity.length();
        const escapeVelocity1 = Math.sqrt(2 * 100 * body1.userData.mass / body1.userData.radius);
        const escapeVelocity2 = Math.sqrt(2 * 100 * body2.userData.mass / body2.userData.radius);
        const averageEscapeVelocity = (escapeVelocity1 + escapeVelocity2) / 2;
        
        // 質量比が大きく、速度が低い → 合体
        if (massRatio > 10 && collisionSpeed < averageEscapeVelocity) {
            return 'merge';
        }
        
        // 高速衝突 → 破壊
        if (collisionSpeed > averageEscapeVelocity * 2) {
            return 'fragmentation';
        }
        
        // かすり衝突 → バウンス
        const impactParameter = this.calculateImpactParameter(body1, body2);
        if (impactParameter > 0.8) {
            return 'bounce';
        }
        
        // デフォルトは合体
        return 'merge';
    }
    
    // 衝突パラメータ計算（0=正面衝突、1=かすり）
    static calculateImpactParameter(body1: CelestialBody, body2: CelestialBody): number {
        const relativePos = body2.position.clone().sub(body1.position);
        const relativeVel = body2.userData.velocity.clone().sub(body1.userData.velocity);
        
        if (relativeVel.length() === 0) return 0;
        
        const closestApproach = relativePos.clone().sub(
            relativeVel.clone().multiplyScalar(relativePos.dot(relativeVel) / relativeVel.lengthSq())
        );
        
        const combinedRadius = body1.userData.radius + body2.userData.radius;
        return Math.min(closestApproach.length() / combinedRadius, 1);
    }
    
    // 衝突処理
    static processCollision(body1: CelestialBody, body2: CelestialBody): CollisionResult {
        // 入力検証
        if (!body1.userData.velocity) body1.userData.velocity = new THREE.Vector3(0, 0, 0);
        if (!body2.userData.velocity) body2.userData.velocity = new THREE.Vector3(0, 0, 0);
        if (!body1.userData.mass || body1.userData.mass <= 0) body1.userData.mass = 1;
        if (!body2.userData.mass || body2.userData.mass <= 0) body2.userData.mass = 1;
        
        const relativeVelocity = body2.userData.velocity.clone().sub(body1.userData.velocity);
        const collisionType = this.determineCollisionType(body1, body2, relativeVelocity);
        const collisionEnergy = 0.5 * body1.userData.mass * body2.userData.mass / 
                               (body1.userData.mass + body2.userData.mass) * 
                               relativeVelocity.lengthSq();
        
        // エネルギーのNaNチェック
        if (!isFinite(collisionEnergy)) {
            console.warn('[COLLISION] Invalid collision energy, using default');
            const defaultEnergy = 1000;
            return this.processMerge(body1, body2, defaultEnergy);
        }
        
        switch (collisionType) {
            case 'merge':
                return this.processMerge(body1, body2, collisionEnergy);
            case 'fragmentation':
                return this.processFragmentation(body1, body2, collisionEnergy);
            case 'bounce':
                return this.processBounce(body1, body2, collisionEnergy);
            default:
                return this.processDestruction(body1, body2, collisionEnergy);
        }
    }
    
    // 合体処理
    static processMerge(body1: CelestialBody, body2: CelestialBody, energy: number): CollisionResult {
        const larger = body1.userData.mass > body2.userData.mass ? body1 : body2;
        const smaller = larger === body1 ? body2 : body1;
        
        // 運動量保存
        const totalMass = larger.userData.mass + smaller.userData.mass;
        const newVelocity = larger.userData.velocity.clone().multiplyScalar(larger.userData.mass)
            .add(smaller.userData.velocity.clone().multiplyScalar(smaller.userData.mass))
            .divideScalar(totalMass);
        
        // 質量中心
        const newPosition = larger.position.clone().multiplyScalar(larger.userData.mass)
            .add(smaller.position.clone().multiplyScalar(smaller.userData.mass))
            .divideScalar(totalMass);
        
        // 質量更新（ブラックホールの質量を更新する前に古い質量を保存）
        const largerOldMass = larger.userData.mass;
        larger.userData.mass = totalMass;
        larger.userData.velocity.copy(newVelocity);
        larger.position.copy(newPosition);
        
        // ブラックホールは大きさが変わらない（事象の地平線は質量に比例するが、ゲーム的に固定）
        if (larger.userData.type !== 'black_hole') {
            // 質量比率を正しく計算
            const massRatio = totalMass / largerOldMass;
            larger.userData.radius = larger.userData.radius * Math.pow(massRatio, 1/3);
            // ビジュアル更新
            const scaleRatio = Math.pow(massRatio, 1/3);
            larger.scale.multiplyScalar(scaleRatio);
        }
        
        // 小さい天体を削除
        this.removeBody(smaller);
        
        // 通知メッセージ（ブラックホール特別版）
        let message: string;
        if (larger.userData.type === 'black_hole') {
            message = `${smaller.userData.name}がブラックホール${larger.userData.name}に飲み込まれました！`;
            soundManager.playSound('explosion', larger.position); // ブラックホールは爆発音
        } else {
            message = `${larger.userData.name}が${smaller.userData.name}を吸収しました`;
            soundManager.playSound('collision', larger.position);
        }
        
        showMessage(message);
        addTimelineLog(message, 'collision');
        
        return {
            type: 'merge',
            survivors: [larger],
            debris: [],
            message,
            energy
        };
    }
    
    // 破片化処理
    static processFragmentation(body1: CelestialBody, body2: CelestialBody, energy: number): CollisionResult {
        const debris: CelestialBody[] = [];
        const totalMass = body1.userData.mass + body2.userData.mass;
        const collisionPoint = body1.position.clone().add(body2.position).multiplyScalar(0.5);
        
        // デブリの数を計算（エネルギーに基づく）- 更新過多を防ぐため上限を下げる
        const safeEnergy = isFinite(energy) ? energy : 1000;
        const debrisCount = Math.min(Math.floor(Math.sqrt(safeEnergy / 1000)) + 2, 5); // 最大5個に制限
        const debrisMass = totalMass * 0.3 / debrisCount; // 30%がデブリに
        
        // 質量の検証
        if (!isFinite(debrisMass) || debrisMass <= 0) {
            console.warn('[COLLISION] Invalid debris mass, skipping fragmentation');
            return this.processMerge(body1, body2, energy);
        }
        
        // デブリ生成
        const newFragments: CelestialBody[] = [];
        for (let i = 0; i < debrisCount; i++) {
            const angle = (i / debrisCount) * Math.PI * 2;
            const speed = Math.sqrt(energy / totalMass) * (0.5 + Math.random() * 0.5);
            
            const fragmentVelocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                (Math.random() - 0.5) * speed * 0.5,
                Math.sin(angle) * speed
            );
            
            // 位置と速度を計算（NaNチェック付き）
            const fragmentDirection = fragmentVelocity.clone().normalize();
            if (!isFinite(fragmentDirection.x) || !isFinite(fragmentDirection.y) || !isFinite(fragmentDirection.z)) {
                // normalize()が失敗した場合はランダムな方向を使用
                fragmentDirection.set(
                    Math.cos(angle),
                    (Math.random() - 0.5) * 0.5,
                    Math.sin(angle)
                );
            }
            
            const fragmentPosition = collisionPoint.clone().add(
                fragmentDirection.multiplyScalar(
                    (body1.userData.radius + body2.userData.radius) * 0.5
                )
            );
            
            // 親天体の平均速度を計算
            const parentVelocity = body1.userData.velocity.clone().add(body2.userData.velocity).multiplyScalar(0.5);
            const finalVelocity = fragmentVelocity.clone().add(parentVelocity);
            const fragmentRadius = Math.pow(debrisMass / 100, 1/3);
            
            // NaNチェック
            if (!isFinite(fragmentPosition.x) || !isFinite(fragmentPosition.y) || !isFinite(fragmentPosition.z)) {
                console.warn('[COLLISION] Invalid fragment position, using collision point');
                fragmentPosition.copy(collisionPoint);
            }
            
            if (!isFinite(finalVelocity.x) || !isFinite(finalVelocity.y) || !isFinite(finalVelocity.z)) {
                console.warn('[COLLISION] Invalid fragment velocity, using zero velocity');
                finalVelocity.set(0, 0, 0);
            }
            
            if (!isFinite(fragmentRadius) || fragmentRadius <= 0) {
                console.warn('[COLLISION] Invalid fragment radius, using default');
                continue; // この破片をスキップ
            }
            
            const fragment = createCelestialBody('asteroid', {
                name: `${body1.userData.name}の破片`,
                mass: debrisMass,
                radius: fragmentRadius,
                position: fragmentPosition.clone(), // クローンを渡す
                velocity: finalVelocity.clone() // クローンを渡す
            });
            
            if (fragment) {
                debris.push(fragment);
                scene.add(fragment);
                newFragments.push(fragment);
            } else {
                console.error('[COLLISION] Failed to create debris fragment');
            }
        }
        
        // 一度にすべての破片を追加
        if (newFragments.length > 0) {
            gameStateManager.updateState(state => ({
                ...state,
                stars: [...state.stars, ...newFragments]
            }));
        }
        
        // 残存質量で天体を更新
        const survivorMass = totalMass * 0.7;
        if (body1.userData.mass > body2.userData.mass) {
            body1.userData.mass = survivorMass;
            body1.userData.radius *= Math.pow(survivorMass / (body1.userData.mass + body2.userData.mass), 1/3);
            body1.scale.multiplyScalar(Math.pow(survivorMass / (body1.userData.mass + body2.userData.mass), 1/3));
            this.removeBody(body2);
            
            const message = `${body1.userData.name}と${body2.userData.name}が激突！破片が飛び散りました`;
            showMessage(message);
            addTimelineLog(message, 'collision');
            
            return {
                type: 'fragmentation',
                survivors: [body1],
                debris,
                message,
                energy
            };
        } else {
            body2.userData.mass = survivorMass;
            body2.userData.radius *= Math.pow(survivorMass / (body1.userData.mass + body2.userData.mass), 1/3);
            body2.scale.multiplyScalar(Math.pow(survivorMass / (body1.userData.mass + body2.userData.mass), 1/3));
            this.removeBody(body1);
            
            const message = `${body1.userData.name}と${body2.userData.name}が激突！破片が飛び散りました`;
            showMessage(message);
            addTimelineLog(message, 'collision');
            
            return {
                type: 'fragmentation',
                survivors: [body2],
                debris,
                message,
                energy
            };
        }
    }
    
    // バウンス処理
    static processBounce(body1: CelestialBody, body2: CelestialBody, energy: number): CollisionResult {
        // 弾性衝突の計算
        const m1 = body1.userData.mass;
        const m2 = body2.userData.mass;
        const v1 = body1.userData.velocity.clone();
        const v2 = body2.userData.velocity.clone();
        
        // 衝突軸
        const collisionAxis = body2.position.clone().sub(body1.position).normalize();
        
        // 速度を衝突軸方向と垂直方向に分解
        const v1n = collisionAxis.multiplyScalar(v1.dot(collisionAxis));
        const v1t = v1.clone().sub(v1n);
        const v2n = collisionAxis.clone().multiplyScalar(v2.dot(collisionAxis));
        const v2t = v2.clone().sub(v2n);
        
        // 衝突軸方向の新しい速度（弾性衝突）
        const v1n_new = v1n.clone().multiplyScalar((m1 - m2) / (m1 + m2))
            .add(v2n.clone().multiplyScalar(2 * m2 / (m1 + m2)));
        const v2n_new = v2n.clone().multiplyScalar((m2 - m1) / (m1 + m2))
            .add(v1n.clone().multiplyScalar(2 * m1 / (m1 + m2)));
        
        // 新しい速度
        body1.userData.velocity.copy(v1n_new.add(v1t));
        body2.userData.velocity.copy(v2n_new.add(v2t));
        
        // Z軸方向の速度を制限（極端な上下運動を防ぐ）
        const maxZVelocity = 50; // Z方向の最大速度
        body1.userData.velocity.z = Math.max(-maxZVelocity, Math.min(maxZVelocity, body1.userData.velocity.z));
        body2.userData.velocity.z = Math.max(-maxZVelocity, Math.min(maxZVelocity, body2.userData.velocity.z));
        
        // さらにZ方向の速度を減衰
        body1.userData.velocity.z *= 0.3; // 70%減衰
        body2.userData.velocity.z *= 0.3;
        
        // 位置を少し離す（めり込み防止）
        const separation = (body1.userData.radius + body2.userData.radius) * 1.1;
        const currentDistance = body1.position.distanceTo(body2.position);
        if (currentDistance < separation) {
            const pushVector = body2.position.clone().sub(body1.position).normalize();
            const pushDistance = (separation - currentDistance) / 2;
            body1.position.sub(pushVector.clone().multiplyScalar(pushDistance));
            body2.position.add(pushVector.multiplyScalar(pushDistance));
        }
        
        const message = `${body1.userData.name}と${body2.userData.name}が衝突して弾かれました`;
        showMessage(message);
        addTimelineLog(message, 'collision');
        
        return {
            type: 'bounce',
            survivors: [body1, body2],
            debris: [],
            message,
            energy
        };
    }
    
    // 破壊処理
    static processDestruction(body1: CelestialBody, body2: CelestialBody, energy: number): CollisionResult {
        const message = `${body1.userData.name}と${body2.userData.name}が衝突して両方とも破壊されました`;
        showMessage(message);
        addTimelineLog(message, 'collision');
        
        this.removeBody(body1);
        this.removeBody(body2);
        
        return {
            type: 'destruction',
            survivors: [],
            debris: [],
            message,
            energy
        };
    }
    
    // 天体を削除
    static removeBody(body: CelestialBody): void {
        const index = gameState.stars.indexOf(body);
        if (index > -1) {
            gameState.stars.splice(index, 1);
        }
        
        // If the removed body was a black hole, dispose the gas effect
        if (body.userData.type === 'black_hole') {
            blackHoleGas.dispose();
        }
        
        if (body.parent) {
            body.parent.remove(body);
        }
        
        // ジオメトリとマテリアルの破棄（Meshの場合のみ）
        if (body instanceof THREE.Mesh || body instanceof THREE.Group) {
            // グループの場合は、すべての子要素を処理
            body.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        try {
                            child.geometry.dispose();
                        } catch (e) {
                            console.warn('[COLLISION] Failed to dispose geometry:', e);
                        }
                    }
                    if (child.material) {
                        try {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => {
                                    if (m && typeof m.dispose === 'function') {
                                        m.dispose();
                                    }
                                });
                            } else if (typeof child.material.dispose === 'function') {
                                child.material.dispose();
                            }
                        } catch (e) {
                            console.warn('[COLLISION] Failed to dispose material:', e);
                        }
                    }
                }
            });
        }
    }
}

export const collisionEffects = new CollisionEffects();