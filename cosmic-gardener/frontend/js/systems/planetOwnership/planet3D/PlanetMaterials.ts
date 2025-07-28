/**
 * Planet Materials
 * 惑星タイプごとのマテリアル定義
 */

import * as THREE from 'three';

export class PlanetMaterials {
    /**
     * 惑星タイプに応じたマテリアルを取得
     */
    static getMaterial(type: string): THREE.Material {
        switch (type) {
            case 'desert':
                return this.createDesertMaterial();
            case 'ocean':
                return this.createOceanMaterial();
            case 'forest':
                return this.createForestMaterial();
            case 'ice':
                return this.createIceMaterial();
            case 'volcanic':
                return this.createVolcanicMaterial();
            case 'gas':
                return this.createGasMaterial();
            default:
                return this.createDefaultMaterial();
        }
    }
    
    /**
     * 砂漠惑星のマテリアル
     */
    private static createDesertMaterial(): THREE.Material {
        const texture = this.generateDesertTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            bumpMap: texture,
            bumpScale: 0.02,
            specular: new THREE.Color(0x222222),
            shininess: 10
        });
    }
    
    /**
     * 海洋惑星のマテリアル
     */
    private static createOceanMaterial(): THREE.Material {
        const texture = this.generateOceanTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            specular: new THREE.Color(0x4488FF),
            shininess: 100,
            bumpMap: texture,
            bumpScale: 0.01
        });
    }
    
    /**
     * 森林惑星のマテリアル
     */
    private static createForestMaterial(): THREE.Material {
        const texture = this.generateForestTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            bumpMap: texture,
            bumpScale: 0.03,
            specular: new THREE.Color(0x111111),
            shininess: 20
        });
    }
    
    /**
     * 氷惑星のマテリアル
     */
    private static createIceMaterial(): THREE.Material {
        const texture = this.generateIceTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            specular: new THREE.Color(0xCCDDFF),
            shininess: 200,
            bumpMap: texture,
            bumpScale: 0.01
        });
    }
    
    /**
     * 火山惑星のマテリアル
     */
    private static createVolcanicMaterial(): THREE.Material {
        const texture = this.generateVolcanicTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            emissive: new THREE.Color(0x331100),
            emissiveIntensity: 0.3,
            bumpMap: texture,
            bumpScale: 0.05,
            specular: new THREE.Color(0x111111),
            shininess: 5
        });
    }
    
    /**
     * ガス惑星のマテリアル
     */
    private static createGasMaterial(): THREE.Material {
        const texture = this.generateGasTexture();
        return new THREE.MeshPhongMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            specular: new THREE.Color(0x444444),
            shininess: 50
        });
    }
    
    /**
     * デフォルトマテリアル
     */
    private static createDefaultMaterial(): THREE.Material {
        return new THREE.MeshPhongMaterial({
            color: 0x888888,
            specular: 0x111111,
            shininess: 30
        });
    }
    
    /**
     * 砂漠テクスチャを生成
     */
    private static generateDesertTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // ベースカラー
        context.fillStyle = '#CD853F';
        context.fillRect(0, 0, 1024, 512);
        
        // 砂丘のパターン
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 50 + 20;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, '#DEB887');
            gradient.addColorStop(1, '#CD853F');
            
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // 岩石地帯
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 30 + 10;
            
            context.fillStyle = '#8B7355';
            context.fillRect(x, y, size, size * 0.6);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    /**
     * 海洋テクスチャを生成
     */
    private static generateOceanTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // 海のベースカラー
        context.fillStyle = '#006994';
        context.fillRect(0, 0, 1024, 512);
        
        // 深海部分
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const width = Math.random() * 200 + 100;
            const height = Math.random() * 100 + 50;
            
            context.fillStyle = '#004466';
            context.fillRect(x, y, width, height);
        }
        
        // 島々
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 40 + 20;
            
            // 島の本体
            context.fillStyle = '#8B7355';
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
            
            // 緑地
            context.fillStyle = '#228B22';
            context.beginPath();
            context.arc(x, y, size * 0.7, 0, Math.PI * 2);
            context.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    /**
     * 森林テクスチャを生成
     */
    private static generateForestTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // ベースの緑
        context.fillStyle = '#228B22';
        context.fillRect(0, 0, 1024, 512);
        
        // 森林パッチ
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 60 + 30;
            
            const greenVariant = Math.random() < 0.5 ? '#006400' : '#32CD32';
            context.fillStyle = greenVariant;
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }
        
        // 川や湖
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const width = Math.random() * 100 + 50;
            const height = Math.random() * 30 + 10;
            
            context.fillStyle = '#4682B4';
            context.fillRect(x, y, width, height);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    /**
     * 氷テクスチャを生成
     */
    private static generateIceTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // ベースの氷
        context.fillStyle = '#E0FFFF';
        context.fillRect(0, 0, 1024, 512);
        
        // 氷河
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const width = Math.random() * 150 + 50;
            const height = Math.random() * 100 + 50;
            
            const gradient = context.createLinearGradient(x, y, x + width, y + height);
            gradient.addColorStop(0, '#B0E0E6');
            gradient.addColorStop(0.5, '#ADD8E6');
            gradient.addColorStop(1, '#87CEEB');
            
            context.fillStyle = gradient;
            context.fillRect(x, y, width, height);
        }
        
        // クレバス
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const length = Math.random() * 100 + 50;
            
            context.strokeStyle = '#4682B4';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + length, y + Math.random() * 50 - 25);
            context.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    /**
     * 火山テクスチャを生成
     */
    private static generateVolcanicTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // ベースの岩石
        context.fillStyle = '#2F4F4F';
        context.fillRect(0, 0, 1024, 512);
        
        // 溶岩流
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const width = Math.random() * 80 + 20;
            const height = Math.random() * 200 + 100;
            
            const gradient = context.createLinearGradient(x, y, x, y + height);
            gradient.addColorStop(0, '#FF4500');
            gradient.addColorStop(0.5, '#FF6347');
            gradient.addColorStop(1, '#8B0000');
            
            context.fillStyle = gradient;
            context.fillRect(x, y, width, height);
        }
        
        // 火山口
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 40 + 30;
            
            context.fillStyle = '#FF0000';
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = '#FF6347';
            context.beginPath();
            context.arc(x, y, size * 0.6, 0, Math.PI * 2);
            context.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    /**
     * ガステクスチャを生成
     */
    private static generateGasTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // ベースカラー
        context.fillStyle = '#FFE4B5';
        context.fillRect(0, 0, 1024, 512);
        
        // 帯状の雲
        const bands = [
            { y: 50, color: '#FFA500', height: 40 },
            { y: 120, color: '#FFB6C1', height: 60 },
            { y: 200, color: '#DDA0DD', height: 50 },
            { y: 280, color: '#FFE4B5', height: 40 },
            { y: 350, color: '#FFA07A', height: 70 },
            { y: 450, color: '#FFB6C1', height: 40 }
        ];
        
        bands.forEach(band => {
            const gradient = context.createLinearGradient(0, band.y, 1024, band.y);
            
            for (let i = 0; i < 10; i++) {
                const pos = i / 9;
                const alpha = Math.sin(pos * Math.PI);
                gradient.addColorStop(pos, band.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
            }
            
            context.fillStyle = gradient;
            context.fillRect(0, band.y, 1024, band.height);
        });
        
        // 渦巻き模様
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const size = Math.random() * 50 + 30;
            
            context.save();
            context.translate(x, y);
            context.rotate(Math.random() * Math.PI * 2);
            
            const spiralGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
            spiralGradient.addColorStop(0, '#FFFFFF88');
            spiralGradient.addColorStop(0.5, '#FFE4B544');
            spiralGradient.addColorStop(1, '#FFE4B500');
            
            context.fillStyle = spiralGradient;
            context.fillRect(-size, -size, size * 2, size * 2);
            context.restore();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
}