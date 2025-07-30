import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';

export class PlanetTextures {
    private scene: BABYLON.Scene;
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    createPlanetMaterial(planetType: PlanetData['type']): BABYLON.StandardMaterial {
        const material = new BABYLON.StandardMaterial(`${planetType}PlanetMat`, this.scene);
        
        // テクスチャサイズ
        const textureSize = 1024;
        
        // ベーステクスチャの生成
        const diffuseTexture = this.createDiffuseTexture(planetType, textureSize);
        material.diffuseTexture = diffuseTexture;
        
        // ノーマルマップの生成
        const normalTexture = this.createNormalTexture(planetType, textureSize);
        material.bumpTexture = normalTexture;
        
        // 惑星タイプごとのマテリアル設定
        switch (planetType) {
            case 'forest':
                material.specularColor = new BABYLON.Color3(0.1, 0.2, 0.1);
                material.specularPower = 10;
                break;
            case 'desert':
                material.specularColor = new BABYLON.Color3(0.3, 0.2, 0.1);
                material.specularPower = 5;
                break;
            case 'ocean':
                material.specularColor = new BABYLON.Color3(0.5, 0.6, 0.8);
                material.specularPower = 64;
                break;
            case 'ice':
                material.specularColor = new BABYLON.Color3(0.9, 0.95, 1.0);
                material.specularPower = 128;
                break;
            case 'volcanic':
                material.specularColor = new BABYLON.Color3(0.1, 0.05, 0.05);
                material.specularPower = 2;
                material.emissiveTexture = this.createEmissiveTexture(planetType, textureSize);
                break;
            case 'alien':
                material.specularColor = new BABYLON.Color3(0.5, 0.3, 0.8);
                material.specularPower = 32;
                material.emissiveTexture = this.createEmissiveTexture(planetType, textureSize);
                break;
        }
        
        return material;
    }
    
    private createDiffuseTexture(planetType: PlanetData['type'], size: number): BABYLON.DynamicTexture {
        const texture = new BABYLON.DynamicTexture(`${planetType}Diffuse`, size, this.scene);
        const context = texture.getContext();
        
        switch (planetType) {
            case 'forest':
                this.drawForestTexture(context, size);
                break;
            case 'desert':
                this.drawDesertTexture(context, size);
                break;
            case 'ocean':
                this.drawOceanTexture(context, size);
                break;
            case 'ice':
                this.drawIceTexture(context, size);
                break;
            case 'volcanic':
                this.drawVolcanicTexture(context, size);
                break;
            case 'alien':
                this.drawAlienTexture(context, size);
                break;
        }
        
        texture.update();
        return texture;
    }
    
    private createNormalTexture(planetType: PlanetData['type'], size: number): BABYLON.DynamicTexture {
        const texture = new BABYLON.DynamicTexture(`${planetType}Normal`, size, this.scene);
        const context = texture.getContext();
        
        // ベースカラー（中間の青紫色）
        context.fillStyle = '#8080FF';
        context.fillRect(0, 0, size, size);
        
        // ノイズを追加して凹凸を表現
        const imageData = context.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // パーリンノイズ風の値を生成
                const noise = this.simpleNoise(x * 0.01, y * 0.01, planetType);
                
                // ノーマルマップの色（R=X軸, G=Y軸, B=Z軸）
                data[index] = 128 + noise * 50;     // R
                data[index + 1] = 128 + noise * 50; // G
                data[index + 2] = 255;              // B (上向き)
                data[index + 3] = 255;              // A
            }
        }
        
        context.putImageData(imageData, 0, 0);
        texture.update();
        return texture;
    }
    
    private createEmissiveTexture(planetType: PlanetData['type'], size: number): BABYLON.DynamicTexture {
        const texture = new BABYLON.DynamicTexture(`${planetType}Emissive`, size, this.scene);
        const context = texture.getContext();
        
        // 黒で塗りつぶし
        context.fillStyle = '#000000';
        context.fillRect(0, 0, size, size);
        
        if (planetType === 'volcanic') {
            // 溶岩の亀裂
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = 5 + Math.random() * 20;
                
                const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(255, 100, 0, 1)');
                gradient.addColorStop(0.5, 'rgba(200, 50, 0, 0.5)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                context.fillStyle = gradient;
                context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            }
        } else if (planetType === 'alien') {
            // 発光する結晶
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = 10 + Math.random() * 30;
                
                const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(150, 50, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(50, 20, 150, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                context.fillStyle = gradient;
                context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            }
        }
        
        texture.update();
        return texture;
    }
    
    private drawForestTexture(context: CanvasRenderingContext2D, size: number): void {
        // ベース地形（土）
        context.fillStyle = '#4a3c28';
        context.fillRect(0, 0, size, size);
        
        // 草地のパッチ
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 20 + Math.random() * 80;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#2d5016');
            gradient.addColorStop(0.7, '#3a6218');
            gradient.addColorStop(1, '#4a3c28');
            
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        // 川や湖
        context.strokeStyle = '#2a4d69';
        context.lineWidth = 5;
        for (let i = 0; i < 3; i++) {
            context.beginPath();
            let x = Math.random() * size;
            let y = Math.random() * size;
            context.moveTo(x, y);
            
            for (let j = 0; j < 10; j++) {
                x += (Math.random() - 0.5) * 100;
                y += (Math.random() - 0.5) * 100;
                context.lineTo(x, y);
            }
            context.stroke();
        }
    }
    
    private drawDesertTexture(context: CanvasRenderingContext2D, size: number): void {
        // ベース砂色
        context.fillStyle = '#d4a574';
        context.fillRect(0, 0, size, size);
        
        // 砂丘のパターン
        for (let y = 0; y < size; y += 20) {
            context.strokeStyle = `rgba(189, 140, 89, ${Math.random() * 0.5})`;
            context.lineWidth = 2 + Math.random() * 3;
            context.beginPath();
            
            for (let x = 0; x < size; x += 10) {
                const offset = Math.sin(x * 0.01) * 10;
                context.lineTo(x, y + offset);
            }
            context.stroke();
        }
        
        // 岩石地帯
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const w = 10 + Math.random() * 30;
            const h = 10 + Math.random() * 30;
            
            context.fillStyle = `rgba(139, 90, 43, ${0.5 + Math.random() * 0.5})`;
            context.fillRect(x, y, w, h);
        }
    }
    
    private drawOceanTexture(context: CanvasRenderingContext2D, size: number): void {
        // 深海のベース
        context.fillStyle = '#1a4d7a';
        context.fillRect(0, 0, size, size);
        
        // 浅瀬と島
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 30 + Math.random() * 100;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, '#8b7355'); // 島の中心（砂）
            gradient.addColorStop(0.3, '#4a90a4'); // 浅瀬
            gradient.addColorStop(0.6, '#2a6d8e'); // 中間
            gradient.addColorStop(1, '#1a4d7a'); // 深海
            
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        // 波のパターン
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.lineWidth = 1;
        for (let y = 0; y < size; y += 10) {
            context.beginPath();
            for (let x = 0; x < size; x++) {
                const wave = Math.sin(x * 0.02 + y * 0.01) * 5;
                context.lineTo(x, y + wave);
            }
            context.stroke();
        }
    }
    
    private drawIceTexture(context: CanvasRenderingContext2D, size: number): void {
        // 氷のベース
        context.fillStyle = '#e6f2ff';
        context.fillRect(0, 0, size, size);
        
        // 氷河の亀裂
        context.strokeStyle = '#b3d9ff';
        context.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            context.beginPath();
            const startX = Math.random() * size;
            const startY = Math.random() * size;
            context.moveTo(startX, startY);
            
            for (let j = 0; j < 5; j++) {
                const x = startX + (Math.random() - 0.5) * 200;
                const y = startY + (Math.random() - 0.5) * 200;
                context.lineTo(x, y);
            }
            context.stroke();
        }
        
        // 雪のパッチ
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 10 + Math.random() * 50;
            
            context.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    private drawVolcanicTexture(context: CanvasRenderingContext2D, size: number): void {
        // 黒い岩のベース
        context.fillStyle = '#1a1a1a';
        context.fillRect(0, 0, size, size);
        
        // 溶岩の流れ
        for (let i = 0; i < 10; i++) {
            context.strokeStyle = '#8b0000';
            context.lineWidth = 5 + Math.random() * 10;
            context.beginPath();
            
            let x = Math.random() * size;
            let y = 0;
            context.moveTo(x, y);
            
            while (y < size) {
                x += (Math.random() - 0.5) * 50;
                y += 20 + Math.random() * 30;
                context.lineTo(x, y);
            }
            context.stroke();
        }
        
        // 冷えた溶岩の地形
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 10 + Math.random() * 40;
            
            context.fillStyle = `rgba(64, 32, 32, ${Math.random()})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    private drawAlienTexture(context: CanvasRenderingContext2D, size: number): void {
        // 奇妙な紫の地形
        context.fillStyle = '#4a148c';
        context.fillRect(0, 0, size, size);
        
        // 六角形パターン
        const hexSize = 30;
        for (let y = 0; y < size; y += hexSize * 1.5) {
            for (let x = 0; x < size; x += hexSize * 2) {
                const offset = (y / (hexSize * 1.5)) % 2 === 0 ? 0 : hexSize;
                this.drawHexagon(context, x + offset, y, hexSize, `rgba(148, 0, 211, ${Math.random()})`);
            }
        }
        
        // 発光する結晶
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 5 + Math.random() * 20;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(148, 0, 211, 0.4)');
            gradient.addColorStop(1, 'rgba(74, 20, 140, 0.2)');
            
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    private drawHexagon(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
        context.fillStyle = color;
        context.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            
            if (i === 0) {
                context.moveTo(px, py);
            } else {
                context.lineTo(px, py);
            }
        }
        
        context.closePath();
        context.fill();
    }
    
    private simpleNoise(x: number, y: number, seed: string): number {
        // シンプルなノイズ関数
        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const n = Math.sin(x * 12.9898 + y * 78.233 + hash) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }
}