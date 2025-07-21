import * as THREE from 'three';
import { gameState, CelestialBody, StarUserData, PlanetUserData, BlackHoleUserData, CelestialBodyUserData } from './state.js';
import { celestialObjectPools, starGeometry } from './utils.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';
import { CelestialBodyFactory, createStar, createPlanet } from './celestialBodyFactory.js';
import { CelestialType, CelestialConfig } from './types/celestial.js';

export function checkLifeSpawn(planetObject: CelestialBody) {
    const userData = planetObject.userData as PlanetUserData;
    if (userData.type !== 'planet' || 
        userData.hasLife || 
        userData.planetType !== 'rocky' ||
        (userData.subType !== 'terran' && userData.subType !== 'ocean_world') ||
        userData.habitability < 70) { 
        return;
    }

    let spawnChance = (userData.habitability / 100) * 0.0001;
    // Apply research multiplier
    if (gameState.research?.lifeSpawnChanceMultiplier) {
        spawnChance *= gameState.research.lifeSpawnChanceMultiplier;
    }
    if (Math.random() < spawnChance) {
        userData.hasLife = true;
        userData.lifeStage = 'microbial';
        userData.population = 10;

        const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
        const radius = (planetObject.children[0] as THREE.Mesh).scale.x;
        const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
        const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
        auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
        auraSphere.name = 'life_aura';
        (auraSphere.userData as any).originalRadius = radius * 1.1;
        (auraSphere.userData as any).materialType = 'lifeAura';
        planetObject.add(auraSphere);

        showMessage(`${userData.name} に生命が誕生しました！`);
        addTimelineLog(`${userData.name}に生命が誕生しました`, 'evolution');
        
        // 生命誕生サウンドの再生
        soundManager.playEvolutionSound('microbial', planetObject.position);
    }
}

export function evolveLife(planetObject: CelestialBody) {
    const userData = planetObject.userData as PlanetUserData;
    if (!userData.hasLife) return;
    const currentStage = userData.lifeStage;
    const ageInYears = gameState.gameYear - userData.creationYear;
    
    // Apply research multiplier to evolution thresholds
    let evolutionMultiplier = 1;
    if (gameState.research?.evolutionSpeedMultiplier) {
        evolutionMultiplier = gameState.research.evolutionSpeedMultiplier;
    }
    
    let nextStage: string | null = null;
    switch (currentStage) {
        case 'microbial': if (ageInYears >= 50 / evolutionMultiplier) nextStage = 'plant'; break;
        case 'plant': if (ageInYears >= 100 / evolutionMultiplier) nextStage = 'animal'; break;
        case 'animal': if (ageInYears >= 200 / evolutionMultiplier) nextStage = 'intelligent'; break;
    }
    if (nextStage) {
        userData.lifeStage = nextStage;
        showMessage(`${userData.name} の生命が ${nextStage} に進化しました！`);
        
        const stageNames: { [key: string]: string } = {
            'plant': '植物',
            'animal': '動物',
            'intelligent': '知的生命体'
        };
        addTimelineLog(`${userData.name}で生命が${stageNames[nextStage]}に進化しました`, 'evolution');
        
        // 進化サウンドの再生
        soundManager.playEvolutionSound(nextStage, planetObject.position);
        
        // パラゴン経験値を追加
        const paragonSystem = (window as any).paragonSystem;
        if (paragonSystem) {
            paragonSystem.addExperience('life_evolution', 1);
        }

        if (nextStage === 'intelligent') {
            const planetMesh = planetObject.children[0] as THREE.Mesh;
            if (planetMesh && planetMesh.material && (planetMesh.material as THREE.MeshStandardMaterial).map) {
                const texture = (planetMesh.material as THREE.MeshStandardMaterial).map as THREE.CanvasTexture;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                        if (brightness < 80 && Math.random() < 0.1) {
                            data[i] = 255;
                            data[i + 1] = 220;
                            data[i + 2] = 180;
                        }
                    }
                    context.putImageData(imageData, 0, 0);
                    texture.needsUpdate = true;
                }
            }
        }
    }
}

export function createCelestialBody(type: string, options: any = {}): CelestialBody {
    // 型の検証と正規化
    const validTypes: CelestialType[] = ['star', 'planet', 'moon', 'asteroid', 'comet', 'dwarfPlanet', 'black_hole'];
    const celestialType = validTypes.includes(type as CelestialType) ? type as CelestialType : 'asteroid';
    
    // パラゴン経験値を追加（セーブデータからのロード時は除く）
    if (!options.isLoading) {
        const paragonSystem = (window as any).paragonSystem;
        if (paragonSystem) {
            paragonSystem.addExperience(`celestial_${celestialType}`, 1);
        }
    }
    
    // セーブデータからのロード時の処理
    if (options.isLoading && options.userData) {
        // userDataから必要な情報を抽出
        const config: CelestialConfig = {
            type: celestialType,
            name: options.userData.name || options.name,
            position: options.position,
            velocity: options.velocity,
            parent: options.parent,
            mass: options.userData.mass || options.mass,
            radius: options.userData.radius || options.radius,
            isLoading: true,
            userData: options.userData
        };
        
        // ファクトリーパターンを使用して天体を作成
        const result = CelestialBodyFactory.create(celestialType, config);
        
        if (!result.ok) {
            const error = (result as { ok: false; error: any }).error;
            console.error('[CELESTIAL] Failed to create celestial body:', error);
            console.error('[CELESTIAL] Config that failed:', config);
            showMessage(`天体の作成に失敗しました: ${error.message}`);
            // フォールバック処理を継続
        } else {
            return (result as { ok: true; value: CelestialBody }).value;
        }
    }
    
    // 通常の作成処理
    const result = CelestialBodyFactory.create(celestialType, {
        type: celestialType,
        name: options.name,
        position: options.position,
        velocity: options.velocity,
        parent: options.parent,
        mass: options.mass,
        radius: options.radius,
        isLoading: options.isLoading,
        userData: options.userData
    });

    if (!result.ok) {
        const error = (result as { ok: false; error: any }).error;
        console.error('[CELESTIAL] Failed to create celestial body:', error);
        console.error('[CELESTIAL] Failed configuration:', {
            type: celestialType,
            options: options
        });
        if (error.details && error.details.errors) {
            console.error('[CELESTIAL] Validation errors:', error.details.errors);
        }
        // メッセージは表示しない（破片生成時にスパムになるため）
        // showMessage(`天体の作成に失敗しました: ${error.message}`);
        
        // フォールバック: デフォルトのメッシュを返す
        const fallbackRadius = options.radius || 1;
        const fallbackMesh = new THREE.Mesh(
            new THREE.SphereGeometry(fallbackRadius, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        fallbackMesh.userData = {
            type: type,
            name: options.name || 'error-body',
            creationYear: gameState.gameYear,
            mass: options.mass || 1,
            radius: fallbackRadius,
            velocity: options.velocity || new THREE.Vector3(0, 0, 0),
            position: options.position || new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            isStatic: false
        };
        return fallbackMesh;
    }

    return result.value;
}

// 後方互換性のため、createStarとcreatePlanetをエクスポート
export { createStar, createPlanet } from './celestialBodyFactory.js';