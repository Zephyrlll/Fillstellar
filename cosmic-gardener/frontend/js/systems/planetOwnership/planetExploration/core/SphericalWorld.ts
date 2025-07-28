/**
 * Spherical World
 * 球面座標系での世界管理
 */

import * as THREE from 'three';
import { OwnedPlanet } from '../../planetShop.js';

export class SphericalWorld {
    private planet: OwnedPlanet;
    private radius: number;
    private gravity = 9.8;
    
    // 世界設定
    private settings = {
        chunkSize: 64,          // チャンクのサイズ
        viewDistance: 5,        // 表示チャンク数
        seaLevel: 0.3,         // 海面レベル
        mountainHeight: 50,     // 山の最大高さ
    };
    
    constructor(planet: OwnedPlanet) {
        this.planet = planet;
        this.radius = this.getPlanetRadius();
    }
    
    /**
     * 惑星タイプに応じた半径を取得
     */
    private getPlanetRadius(): number {
        // 惑星タイプごとにサイズを変える
        const radiusMap: Record<string, number> = {
            'desert': 800,
            'ocean': 1000,
            'forest': 900,
            'ice': 850,
            'volcanic': 950,
            'gas': 1200,
        };
        
        return radiusMap[this.planet.type] || 1000;
    }
    
    /**
     * スポーン位置を取得
     */
    getSpawnPosition(): THREE.Vector3 {
        // 北極点から少し下がった位置
        const lat = Math.PI / 4; // 45度
        const lon = 0;
        
        return this.sphericalToCartesian(lat, lon, this.radius + 2);
    }
    
    /**
     * 球面座標をデカルト座標に変換
     */
    sphericalToCartesian(lat: number, lon: number, altitude: number): THREE.Vector3 {
        const r = this.radius + altitude;
        const x = r * Math.sin(lat) * Math.cos(lon);
        const y = r * Math.cos(lat);
        const z = r * Math.sin(lat) * Math.sin(lon);
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * デカルト座標を球面座標に変換
     */
    cartesianToSpherical(position: THREE.Vector3): { lat: number; lon: number; altitude: number } {
        const r = position.length();
        const lat = Math.acos(position.y / r);
        const lon = Math.atan2(position.z, position.x);
        const altitude = r - this.radius;
        
        return { lat, lon, altitude };
    }
    
    /**
     * 位置の法線ベクトルを取得（重力方向の逆）
     */
    getNormal(position: THREE.Vector3): THREE.Vector3 {
        return position.clone().normalize();
    }
    
    /**
     * 位置の上方向ベクトルを取得
     */
    getUpVector(position: THREE.Vector3): THREE.Vector3 {
        return this.getNormal(position);
    }
    
    /**
     * 位置の前方向ベクトルを取得（北向き）
     */
    getForwardVector(position: THREE.Vector3): THREE.Vector3 {
        const up = this.getUpVector(position);
        const north = new THREE.Vector3(0, 1, 0);
        
        // 北方向を現在位置の接平面に投影
        const forward = north.clone().sub(up.clone().multiplyScalar(north.dot(up)));
        
        if (forward.length() < 0.001) {
            // 極点にいる場合
            forward.set(1, 0, 0);
        }
        
        return forward.normalize();
    }
    
    /**
     * 位置の右方向ベクトルを取得
     */
    getRightVector(position: THREE.Vector3): THREE.Vector3 {
        const up = this.getUpVector(position);
        const forward = this.getForwardVector(position);
        
        return new THREE.Vector3().crossVectors(forward, up).normalize();
    }
    
    /**
     * 地表に投影した位置を取得
     */
    projectToSurface(position: THREE.Vector3, altitude: number = 0): THREE.Vector3 {
        const normal = this.getNormal(position);
        return normal.multiplyScalar(this.radius + altitude);
    }
    
    /**
     * チャンク座標を取得
     */
    getChunkCoordinates(position: THREE.Vector3): { x: number; z: number } {
        const { lat, lon } = this.cartesianToSpherical(position);
        
        // 緯度経度をチャンク座標に変換
        const x = Math.floor((lon + Math.PI) / (2 * Math.PI) * 100);
        const z = Math.floor((lat) / Math.PI * 50);
        
        return { x, z };
    }
    
    /**
     * チャンク座標から中心位置を取得
     */
    getChunkCenter(chunkX: number, chunkZ: number): THREE.Vector3 {
        const lon = (chunkX / 100) * 2 * Math.PI - Math.PI;
        const lat = (chunkZ / 50) * Math.PI;
        
        return this.sphericalToCartesian(lat, lon, 0);
    }
    
    /**
     * 重力を取得
     */
    getGravity(): number {
        return this.gravity;
    }
    
    /**
     * 惑星半径を取得
     */
    getRadius(): number {
        return this.radius;
    }
    
    /**
     * 設定を取得
     */
    getSettings(): typeof this.settings {
        return this.settings;
    }
    
    /**
     * バイオーム情報を取得
     */
    getBiomeAt(position: THREE.Vector3): string {
        const { lat } = this.cartesianToSpherical(position);
        
        // 緯度に基づいた簡易バイオーム
        const latDegrees = lat * 180 / Math.PI;
        
        if (this.planet.type === 'ocean') {
            return 'ocean';
        } else if (this.planet.type === 'desert') {
            return 'desert';
        } else if (this.planet.type === 'ice') {
            return 'ice';
        } else if (this.planet.type === 'volcanic') {
            return 'volcanic';
        } else if (this.planet.type === 'forest') {
            if (latDegrees < 30 || latDegrees > 150) {
                return 'tundra';
            } else if (latDegrees < 60 || latDegrees > 120) {
                return 'temperate_forest';
            } else {
                return 'tropical_forest';
            }
        }
        
        return 'default';
    }
    
    /**
     * 球面上の2点間の距離を計算
     */
    getDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
        const coords1 = this.cartesianToSpherical(pos1);
        const coords2 = this.cartesianToSpherical(pos2);
        
        // 大圏距離の計算
        const dLat = coords2.lat - coords1.lat;
        const dLon = coords2.lon - coords1.lon;
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(coords1.lat) * Math.cos(coords2.lat) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return this.radius * c;
    }
}