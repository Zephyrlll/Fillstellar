
import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { gameState } from './state.js';

export const starGeometry = new THREE.SphereGeometry(1, 32, 32);

export function formatNumber(num: number): string {
    const value = (typeof num === 'number' && isFinite(num)) ? num : 0;
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return Math.floor(value).toString();
}

export const vector3Pool = {
    pool: [] as THREE.Vector3[],
    get(): THREE.Vector3 {
        if (this.pool.length > 0) {
            const vector = this.pool.pop();
            if (vector) {
                return vector.set(0, 0, 0);
            }
        }
        return new THREE.Vector3();
    },
    release(vector: THREE.Vector3) {
        if (vector && this.pool.length < 50) {
            this.pool.push(vector);
        }
    }
};

export function disposeThreeObject(object: any) {
    if (!object) return;
    
    if (object.children) {
        object.children.forEach((child: any) => disposeThreeObject(child));
    }
    
    if (object.geometry && typeof object.geometry.dispose === 'function') {
        if (object.geometry.type === 'SphereGeometry' && object.userData.originalRadius) {
            celestialObjectPools.releaseSphereGeometry(object.geometry, object.userData.originalRadius);
        } else {
            object.geometry.dispose();
        }
    }
    
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => {
                if (material && typeof material.dispose === 'function') {
                    ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                        if (material[textureProperty] && typeof material[textureProperty].dispose === 'function') {
                            material[textureProperty].dispose();
                        }
                    });
                    
                    if (object.userData.materialType) {
                        celestialObjectPools.releaseMaterial(material, object.userData.materialType);
                    } else {
                        material.dispose();
                    }
                }
            });
        } else {
            if (typeof object.material.dispose === 'function') {
                ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                    if (object.material[textureProperty] && typeof object.material[textureProperty].dispose === 'function') {
                        object.material[textureProperty].dispose();
                    }
                });
                
                if (object.userData.materialType) {
                    celestialObjectPools.releaseMaterial(object.material, object.userData.materialType);
                } else {
                    object.material.dispose();
                }
            }
        }
    }
}

export function removeAndDispose(object: any) {
    if (object && object.parent) {
        object.parent.remove(object);
    }
    disposeThreeObject(object);
}

export const celestialObjectPools = {
    sphereGeometries: {
        small: [] as THREE.SphereGeometry[],
        medium: [] as THREE.SphereGeometry[],
        large: [] as THREE.SphereGeometry[]
    },
    
    materials: {
        star: [] as THREE.Material[],
        planet: [] as THREE.Material[],
        asteroid: [] as THREE.Material[],
        blackHole: [] as THREE.Material[],
        atmosphere: [] as THREE.Material[],
        lifeAura: [] as THREE.Material[]
    },
    
    meshes: {
        celestialBody: [] as THREE.Mesh[],
        atmosphere: [] as THREE.Mesh[],
        ring: [] as THREE.Mesh[]
    },

    getSphereGeometry(radius: number): THREE.SphereGeometry {
        // 常に半径1のジオメトリを返す（スケールはメッシュで行う）
        const pool = this.sphereGeometries.small;
        
        const geometry = pool.pop();
        if (geometry) {
            return geometry;
        }
        return starGeometry.clone();
    },
    
    releaseSphereGeometry(geometry: THREE.SphereGeometry, radius: number) {
        let pool;
        if (radius <= 5) pool = this.sphereGeometries.small;
        else if (radius <= 20) pool = this.sphereGeometries.medium;
        else pool = this.sphereGeometries.large;
        
        if (pool.length < 20) {
            pool.push(geometry);
        } else {
            geometry.dispose();
        }
    },
    
    getMaterial(type: string, properties: any = {}): THREE.Material {
        const pool = (this.materials as any)[type] || [];
        let material;
        
        if (pool.length > 0) {
            material = pool.pop();
            Object.assign(material, properties);
            return material;
        }
        
        switch (type) {
            case 'star':
                return new THREE.MeshStandardMaterial({ 
                    emissive: new THREE.Color(0xff4444), 
                    emissiveIntensity: 0.3, 
                    ...properties 
                });
            case 'planet':
                return new THREE.MeshStandardMaterial({ 
                    roughness: 0.8, 
                    metalness: 0.2, 
                    ...properties 
                });
            case 'lifeAura':
                return new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.15,
                    blending: THREE.AdditiveBlending,
                    ...properties
                });
            default:
                return new THREE.MeshStandardMaterial(properties);
        }
    },
    
    releaseMaterial(material: THREE.Material, type: string) {
        const pool = (this.materials as any)[type] || [];
        if (pool.length < 10) {
            pool.push(material);
        } else {
            material.dispose();
        }
    },
    
    dispose() {
        Object.values(this.sphereGeometries).forEach((pool: THREE.SphereGeometry[]) => {
            pool.forEach(geometry => geometry.dispose());
            pool.length = 0;
        });
        Object.values(this.materials).forEach((pool: THREE.Material[]) => {
            pool.forEach(material => material.dispose());
            pool.length = 0;
        });
        Object.values(this.meshes).forEach((pool: THREE.Mesh[]) => {
            pool.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) (mesh.material as THREE.Material).dispose();
            });
            pool.length = 0;
        });
    }
};

export const mathCache = {
    dustUpgradeCost: { level: -1, cost: 0 },
    converterCost: { level: -1, cost: 0 },
    thoughtSpeed: { points: -1, speed: 0 },
    softeningFactorSq: 0,
    halfWorldSize: (GALAXY_BOUNDARY * 2) / 2,
    // 生産レートキャッシュ
    energyGenerationRate: { count: -1, rate: 0 },
    organicMatterGenerationRate: { count: -1, rate: 0 },
    biomassGenerationRate: { count: -1, rate: 0 },
    
    init() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    updatePhysicsConstants() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    getDustUpgradeCost() {
        if (this.dustUpgradeCost.level !== gameState.dustUpgradeLevel) {
            this.dustUpgradeCost.cost = Math.floor(gameState.dustUpgradeBaseCost * Math.pow(1.5, gameState.dustUpgradeLevel));
            this.dustUpgradeCost.level = gameState.dustUpgradeLevel;
        }
        return this.dustUpgradeCost.cost;
    },
    
    getConverterCost() {
        if (this.converterCost.level !== gameState.darkMatterConverterLevel) {
            this.converterCost.cost = Math.floor(gameState.darkMatterConverterBaseCost * Math.pow(2, gameState.darkMatterConverterLevel));
            this.converterCost.level = gameState.darkMatterConverterLevel;
        }
        return this.converterCost.cost;
    },
    
    getThoughtSpeed() {
        if (this.thoughtSpeed.points !== gameState.thoughtPoints) {
            const baseSpeed = 1.1;
            this.thoughtSpeed.speed = Math.pow(baseSpeed, gameState.thoughtPoints) - 1;
            this.thoughtSpeed.points = gameState.thoughtPoints;
        }
        return this.thoughtSpeed.speed;
    },
    
    // エネルギー生成レート計算
    getEnergyGenerationRate() {
        const starCount = gameState.stars.length;
        if (this.energyGenerationRate.count !== starCount) {
            let totalRate = 0;
            
            // 恒星からのエネルギー生成
            for (const star of gameState.stars) {
                const userData = star.userData as any;
                if (userData.type === 'star') {
                    // 恒星の温度に基づくエネルギー生成
                    const baseRate = 0.1;
                    const temperatureFactor = (userData.temperature || 5000) / 5000; // 太陽温度を基準
                    totalRate += baseRate * temperatureFactor;
                }
            }
            
            // アップグレードによる倍率
            const upgradeMultiplier = 1 + (gameState.dustUpgradeLevel * 0.2);
            
            this.energyGenerationRate.rate = totalRate * upgradeMultiplier;
            this.energyGenerationRate.count = starCount;
        }
        return this.energyGenerationRate.rate;
    },
    
    // 有機物生成レート計算
    getOrganicMatterGenerationRate() {
        // 惑星をフィルタリング
        const planets = gameState.stars.filter(body => {
            const userData = body.userData as any;
            return userData.type === 'planet';
        });
        
        const planetCount = planets.length;
        if (this.organicMatterGenerationRate.count !== planetCount) {
            let totalRate = 0;
            
            // 惑星からの有機物生成
            for (const planet of planets) {
                const userData = planet.userData as any;
                if (userData.hasLife) {
                    // 生命段階に基づく有機物生成
                    const lifeStageRates: { [key: string]: number } = {
                        'microbial': 0.01,
                        'plant': 0.05,
                        'animal': 0.1,
                        'intelligent': 0.2
                    };
                    totalRate += lifeStageRates[userData.lifeStage || 'microbial'] || 0;
                }
            }
            
            // 研究による倍率
            const researchMultiplier = gameState.research?.organicMatterBonus || 1;
            
            this.organicMatterGenerationRate.rate = totalRate * researchMultiplier;
            this.organicMatterGenerationRate.count = planetCount;
        }
        return this.organicMatterGenerationRate.rate;
    },
    
    // バイオマス生成レート計算
    getBiomassGenerationRate() {
        // 惑星をフィルタリング
        const planets = gameState.stars.filter(body => {
            const userData = body.userData as any;
            return userData.type === 'planet';
        });
        
        const planetCount = planets.length;
        if (this.biomassGenerationRate.count !== planetCount) {
            let totalRate = 0;
            
            // 惑星からのバイオマス生成
            for (const planet of planets) {
                const userData = planet.userData as any;
                if (userData.hasLife) {
                    // 生命段階と人口に基づくバイオマス生成
                    if (userData.lifeStage === 'plant' || userData.lifeStage === 'animal' || userData.lifeStage === 'intelligent') {
                        const populationFactor = Math.log10((userData.population || 10) + 1) / 10;
                        const baseRate = userData.lifeStage === 'plant' ? 0.02 : 
                                       userData.lifeStage === 'animal' ? 0.05 : 0.1;
                        totalRate += baseRate * populationFactor;
                    }
                }
            }
            
            // 研究による倍率
            const researchMultiplier = gameState.research?.biomassBonus || 1;
            
            this.biomassGenerationRate.rate = totalRate * researchMultiplier;
            this.biomassGenerationRate.count = planetCount;
        }
        return this.biomassGenerationRate.rate;
    }
};

export const UnitConverter = {
    SOLAR_MASS_KG: 1.989e30,
    EARTH_MASS_KG: 5.972e24,
    EARTH_RADIUS_M: 6.371e6,
    YEAR_SECONDS: 3.154e7,
    convertStarMass: (mass: number, unitSystem: string) => unitSystem === 'si' ? `${(mass * UnitConverter.SOLAR_MASS_KG).toExponential(2)} kg` : `${mass} M☉`,
    convertStarTemperature: (temp: number, unitSystem: string) => `${temp} K`,
    convertStarLifespan: (lifespan: number, unitSystem: string) => unitSystem === 'si' ? `${(lifespan * 1e9 * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${lifespan} 億年`,
    convertPlanetMass: (mass: number, unitSystem: string) => unitSystem === 'si' ? `${(mass * UnitConverter.EARTH_MASS_KG).toExponential(2)} kg` : `${mass} M⊕`,
    convertPlanetRadius: (radius: number, unitSystem: string) => unitSystem === 'si' ? `${(radius * UnitConverter.EARTH_RADIUS_M).toExponential(2)} m` : `${radius} R⊕`,
    convertPlanetTemperature: (temp: number, unitSystem: string) => unitSystem === 'si' ? `${temp + 273.15} K` : `${temp} ℃`,
    convertPlanetAtmosphere: (atm: number, unitSystem: string) => unitSystem === 'si' ? `${atm.toFixed(2)} (0-1)` : `${(atm * 100).toFixed(0)} %`,
    convertPlanetWater: (water: number, unitSystem: string) => unitSystem === 'si' ? `${water.toFixed(2)} (0-1)` : `${(water * 100).toFixed(0)} %`,
    convertGameYear: (year: number, unitSystem: string) => unitSystem === 'si' ? `${(year * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${Math.floor(year)} 年`
};
