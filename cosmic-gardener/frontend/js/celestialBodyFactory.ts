import * as THREE from 'three';
import { 
  CelestialType, 
  CelestialConfig, 
  CelestialCreationError,
  Result, 
  Ok, 
  Err,
  ValidationResult 
} from './types/celestial.js';
import { 
  CelestialBody,
  StarUserData,
  PlanetUserData,
  BlackHoleUserData,
  CelestialBodyUserData,
  gameState 
} from './state.js';
import { celestialObjectPools, starGeometry } from './utils.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';

// ファクトリークラスの実装
export class CelestialBodyFactory {
  private static instance: CelestialBodyFactory;

  private constructor() {}

  static getInstance(): CelestialBodyFactory {
    if (!CelestialBodyFactory.instance) {
      CelestialBodyFactory.instance = new CelestialBodyFactory();
    }
    return CelestialBodyFactory.instance;
  }

  // メインのファクトリーメソッド
  static create(type: CelestialType, config: CelestialConfig): Result<CelestialBody, CelestialCreationError> {
    const factory = CelestialBodyFactory.getInstance();
    
    try {
      // パラメータ検証
      const validation = factory.validateConfig(type, config);
      if (!validation.isValid) {
        return Err(new CelestialCreationError(
          'VALIDATION_ERROR',
          'Configuration validation failed',
          { errors: validation.errors }
        ));
      }

      // 天体作成
      const body = factory.createCelestialBody(type, config);
      if (!body) {
        return Err(new CelestialCreationError(
          'CREATION_FAILED',
          `Failed to create celestial body of type: ${type}`
        ));
      }

      // Debug: console.log('[CELESTIAL] Created celestial body:', {
      //   type,
      //   name: body.userData.name,
      //   mass: body.userData.mass
      // });

      return Ok(body);
    } catch (error) {
      console.error('[CELESTIAL] Creation error:', error);
      return Err(new CelestialCreationError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      ));
    }
  }

  // パラメータ検証
  private validateConfig(type: CelestialType, config: CelestialConfig): ValidationResult {
    const errors: string[] = [];

    // 型チェック
    if (!type || !this.isValidCelestialType(type)) {
      errors.push(`Invalid celestial type: ${type}`);
    }

    // 親天体の検証（惑星、衛星などに必要）- ただしロード時はスキップ
    if (!config.isLoading && this.requiresParent(type) && !config.parent) {
      errors.push(`Type ${type} requires a parent celestial body`);
    }

    // 質量の検証
    if (config.mass !== undefined && config.mass <= 0) {
      errors.push('Mass must be positive');
    }

    // 半径の検証
    if (config.radius !== undefined && config.radius <= 0) {
      errors.push('Radius must be positive');
    }

    // ベクトルの検証
    if (config.position && !this.isValidVector(config.position)) {
      errors.push('Invalid position vector');
    }

    if (config.velocity && !this.isValidVector(config.velocity)) {
      errors.push('Invalid velocity vector');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 有効な天体タイプかチェック
  private isValidCelestialType(type: string): type is CelestialType {
    const validTypes: CelestialType[] = [
      'star', 'planet', 'moon', 'asteroid', 
      'comet', 'dwarfPlanet', 'black_hole'
    ];
    return validTypes.includes(type as CelestialType);
  }

  // 親天体が必要かチェック
  private requiresParent(type: CelestialType): boolean {
    // 衛星と準惑星のみ親天体が必要
    // 小惑星と彗星は独立した天体として存在可能
    return ['moon', 'dwarfPlanet'].includes(type);
  }

  // ベクトルの妥当性チェック
  private isValidVector(vector: THREE.Vector3): boolean {
    return vector instanceof THREE.Vector3 &&
           isFinite(vector.x) && 
           isFinite(vector.y) && 
           isFinite(vector.z);
  }

  // 実際の天体作成処理
  private createCelestialBody(type: CelestialType, config: CelestialConfig): CelestialBody | null {
    let body: any;
    const materialParams: any = { 
      color: new THREE.Color(0xffffff), 
      roughness: 0.8, 
      metalness: 0.2, 
      emissive: new THREE.Color(0x000000), 
      emissiveIntensity: 0.2 
    };
    
    let radius = 1;
    let gameMass = 0;
    let specificData: Partial<StarUserData | PlanetUserData | BlackHoleUserData> | null = null;

    // 天体タイプ別の処理
    if (config.isLoading) {
      const data = config.userData;
      gameMass = data.mass;
      radius = data.radius || 1;
      specificData = data;
    } else {
      const creationResult = this.createSpecificCelestialData(type, config);
      if (!creationResult) return null;
      
      gameMass = creationResult.mass;
      // configで指定されたradiusがある場合はそれを優先
      radius = config.radius !== undefined ? config.radius : creationResult.radius;
      specificData = creationResult.data;
      
      // Debug log removed
    }

    // 天体タイプ別の3Dオブジェクト作成
    const objectResult = this.create3DObject(type, { 
      radius, 
      gameMass, 
      materialParams, 
      specificData,
      config 
    });
    
    if (!objectResult) return null;
    
    body = objectResult;

    // 共通のuserData設定
    const finalUserData = this.createUserData(type, {
      gameMass,
      radius,
      config,
      specificData
    });

    body.userData = finalUserData;

    // 位置設定
    if (config.position) {
      body.position.copy(config.position);
    }

    // 恒星の場合は光源を追加
    if (type === 'star' && !config.isLoading) {
      const pointLight = new THREE.PointLight(materialParams.emissive, 2, 4000);
      body.add(pointLight);
    }

    return body;
  }

  // 天体タイプ別のデータ作成
  private createSpecificCelestialData(
    type: CelestialType, 
    config: CelestialConfig
  ): { mass: number; radius: number; data: any } | null {
    switch (type) {
      case 'star':
        return this.createStarData();
      case 'planet':
        return this.createPlanetData(config.parent);
      case 'moon':
        return this.createMoonData(config.parent);
      case 'asteroid':
        return this.createAsteroidData(config.parent, config);
      case 'comet':
        return this.createCometData(config.parent, config);
      case 'dwarfPlanet':
        return this.createDwarfPlanetData(config.parent);
      case 'black_hole':
        return this.createBlackHoleData(config);
      default:
        return null;
    }
  }

  // 恒星データ作成
  private createStarData(): { mass: number; radius: number; data: Partial<StarUserData> } {
    const starTypes = [
      { type: 'red', tempMin: 2400, tempMax: 3700, massMin: 0.08, massMax: 0.45 },
      { type: 'orange', tempMin: 3700, tempMax: 5200, massMin: 0.45, massMax: 0.8 },
      { type: 'yellow', tempMin: 5200, tempMax: 6000, massMin: 0.8, massMax: 1.04 },
      { type: 'white', tempMin: 6000, tempMax: 7500, massMin: 1.04, massMax: 1.4 },
      { type: 'blue', tempMin: 7500, tempMax: 30000, massMin: 1.4, massMax: 16 }
    ];
    
    const selectedType = starTypes[Math.floor(Math.random() * starTypes.length)];
    const age = Math.random() * 500;
    const temperature = Math.floor(Math.random() * (selectedType.tempMax - selectedType.tempMin + 1)) + selectedType.tempMin;
    const mass = Math.random() * (selectedType.massMax - selectedType.massMin) + selectedType.massMin;
    
    const starData: Partial<StarUserData> = {
      age: age.toFixed(2),
      temperature: temperature,
      mass: parseFloat(mass.toFixed(2)),
      spectralType: selectedType.type
    };
    
    starData.lifespan = this.calculateStarLifespan(starData as StarUserData);
    
    const gameMass = (starData.mass as number) * 1000;
    const radius = Math.max(Math.cbrt(gameMass) * 8.0, 15.0);
    
    
    return { mass: gameMass, radius, data: starData };
  }

  // 恒星の寿命計算
  private calculateStarLifespan(starData: StarUserData): number {
    if (starData.mass < 0.1) return 1000;
    if (starData.mass < 0.5) return 500;
    if (starData.mass < 1.0) return 200;
    if (starData.mass < 2.0) return 50;
    if (starData.mass < 5.0) return 10;
    return 5;
  }

  // 惑星データ作成
  private createPlanetData(parent: CelestialBody | undefined): { mass: number; radius: number; data: Partial<PlanetUserData> } | null {
    if (!parent || !parent.userData) return null;
    
    const parentMass = parent.userData.mass as number;
    const mass = parentMass * (Math.random() * 0.005 + 0.0001);
    const radius = Math.cbrt(mass);
    const temperature = Math.floor(Math.random() * 300) - 150;
    const atmosphere = Math.random();
    const water = Math.random();
    let planetType = (mass < parentMass * 0.01) ? 'rocky' : 'gas_giant';
    let subType = 'unknown';
    let geologicalActivity = 0;

    if (planetType === 'rocky') {
      geologicalActivity = Math.random();
      if (water > 0.7 && temperature > -50 && temperature < 50) {
        subType = 'ocean_world';
      } else if (temperature < -50) {
        subType = 'ice_world';
        geologicalActivity *= 0.2;
      } else if (water < 0.1 && temperature > 0) {
        subType = 'desert_world';
      } else {
        subType = 'terran';
      }
    } else {
      subType = (temperature > 0) ? 'jupiter_like' : 'neptune_like';
    }

    const planetData: Partial<PlanetUserData> = {
      mass: parseFloat(mass.toFixed(5)),
      radius: parseFloat(radius.toFixed(5)),
      planetType: planetType,
      subType: subType,
      temperature: temperature,
      atmosphere: atmosphere.toFixed(2),
      water: water.toFixed(2),
      geologicalActivity: geologicalActivity.toFixed(2)
    };
    
    planetData.habitability = this.calculateHabitability(planetData as PlanetUserData);
    
    const visualRadius = Math.max(Math.cbrt(mass) * 2.5, 3.0);
    
    return { mass, radius: visualRadius, data: planetData };
  }

  // 居住性計算
  private calculateHabitability(planetData: PlanetUserData): number {
    let score = 0;
    const temp = planetData.temperature;
    if (temp >= 0 && temp <= 40) score += 40;
    else if (temp > -50 && temp < 90) score += 20;
    
    const atm = parseFloat(planetData.atmosphere);
    if (atm >= 0.5 && atm <= 0.8) score += 30;
    else if (atm > 0.2 && atm < 1.0) score += 15;
    
    const water = parseFloat(planetData.water);
    score += water * 30;
    
    return Math.min(100, Math.max(0, Math.floor(score)));
  }

  // その他の天体データ作成メソッド
  private createMoonData(parent: CelestialBody | undefined): { mass: number; radius: number; data: any } | null {
    if (!parent || !parent.userData) return null;
    const parentMass = parent.userData.mass as number;
    const mass = parentMass * (Math.random() * 0.0002 + 0.00002);
    const radius = Math.max(Math.cbrt(mass) * 1.8, 1.5);
    return { mass, radius, data: {} };
  }

  private createAsteroidData(parent: CelestialBody | undefined, config: CelestialConfig): { mass: number; radius: number; data: any } | null {
    let mass: number;
    let radius: number;
    
    if (parent && parent.userData) {
      // 親天体がある場合は、その質量に基づいて計算
      const parentMass = parent.userData.mass as number;
      mass = parentMass * (Math.random() * 0.00001 + 0.000001);
      radius = Math.max(Math.cbrt(mass) * 1.0, 0.8);
    } else if (config.mass !== undefined && config.radius !== undefined) {
      // 親天体がない場合は、設定値を使用（衝突の破片など）
      mass = config.mass;
      radius = config.radius;
    } else {
      // どちらもない場合はデフォルト値
      mass = 10 + Math.random() * 90;  // 10-100の範囲
      radius = Math.max(Math.cbrt(mass) * 0.5, 0.5);
    }
    
    return { mass, radius, data: {} };
  }

  private createCometData(parent: CelestialBody | undefined, config: CelestialConfig): { mass: number; radius: number; data: any } | null {
    let mass: number;
    let radius: number;
    
    if (parent && parent.userData) {
      // 親天体がある場合は、その質量に基づいて計算
      const parentMass = parent.userData.mass as number;
      mass = parentMass * (Math.random() * 0.000005 + 0.0000005);
      radius = Math.max(Math.cbrt(mass) * 1.2, 1.0);
    } else if (config.mass !== undefined && config.radius !== undefined) {
      // 親天体がない場合は、設定値を使用
      mass = config.mass;
      radius = config.radius;
    } else {
      // どちらもない場合はデフォルト値
      mass = 5 + Math.random() * 45;  // 5-50の範囲（小惑星より小さめ）
      radius = Math.max(Math.cbrt(mass) * 0.8, 0.8);
    }
    
    return { mass, radius, data: {} };
  }

  private createDwarfPlanetData(parent: CelestialBody | undefined): { mass: number; radius: number; data: any } | null {
    if (!parent || !parent.userData) return null;
    const parentMass = parent.userData.mass as number;
    const mass = parentMass * (Math.random() * 0.0005 + 0.00005);
    const radius = Math.max(Math.cbrt(mass) * 2.0, 2.0);
    return { mass, radius, data: {} };
  }

  private createBlackHoleData(config: CelestialConfig): { mass: number; radius: number; data: any } {
    const mass = config.mass || 10000000;
    const radius = config.radius || 500;
    return { mass, radius, data: {} };
  }

  // 3Dオブジェクト作成（天体タイプ別）
  private create3DObject(
    type: CelestialType, 
    params: any
  ): THREE.Object3D | null {
    switch (type) {
      case 'star':
        return this.createStarObject(params);
      case 'planet':
        return this.createPlanetObject(params);
      case 'moon':
        return this.createMoonObject(params);
      case 'asteroid':
        return this.createAsteroidObject(params);
      case 'comet':
        return this.createCometObject(params);
      case 'dwarfPlanet':
        return this.createDwarfPlanetObject(params);
      case 'black_hole':
        return this.createBlackHoleObject(params);
      default:
        return null;
    }
  }

  // 恒星オブジェクト作成
  private createStarObject(params: any): THREE.Mesh {
    const starColors: { [key: string]: THREE.Color } = {
      'red': new THREE.Color(0xFF4000),
      'orange': new THREE.Color(0xFFA500),
      'yellow': new THREE.Color(0xFFFF00),
      'white': new THREE.Color(0xFFFFFF),
      'blue': new THREE.Color(0x87CEEB)
    };
    
    const starColor = starColors[params.specificData.spectralType] || new THREE.Color(0xffffff);
    params.materialParams.color.set(starColor);
    params.materialParams.emissive.set(starColor);
    params.materialParams.emissiveIntensity = 1.8;
    params.materialParams.metalness = 0.0;
    params.materialParams.roughness = 1.0;
    
    
    // ジオメトリは単位サイズ（半径1）で作成
    const starSphereGeometry = celestialObjectPools.getSphereGeometry(1);
    const starMaterial = celestialObjectPools.getMaterial('star', params.materialParams);
    const body = new THREE.Mesh(starSphereGeometry, starMaterial);
    // スケールで実際の半径を設定
    body.scale.set(params.radius, params.radius, params.radius);
    
    
    (body.userData as any).originalRadius = params.radius;
    (body.userData as any).materialType = 'star';
    
    return body;
  }

  // 惑星オブジェクト作成
  private createPlanetObject(params: any): THREE.Group | null {
    const planetData = params.specificData as PlanetUserData;
    const maps = this.createRealisticPlanetMaps(
      planetData.subType, 
      parseFloat(planetData.water), 
      parseFloat(planetData.atmosphere)
    );
    
    if (!maps.map || !maps.normalMap) return null;

    const planetMaterial = celestialObjectPools.getMaterial('planet', { 
      map: maps.map, 
      normalMap: maps.normalMap, 
      normalScale: new THREE.Vector2(0.8, 0.8), 
      emissive: new THREE.Color(0x001133), 
      emissiveIntensity: 0.15, 
      roughness: 0.6,
      metalness: 0.1,
      envMapIntensity: 0.5 
    });
    
    // ジオメトリは単位サイズ（半径1）で作成
    const planetGeometry = celestialObjectPools.getSphereGeometry(1);
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    // スケールで実際の半径を設定
    planetMesh.scale.set(params.radius, params.radius, params.radius);
    (planetMesh.userData as any).originalRadius = params.radius;
    (planetMesh.userData as any).materialType = 'planet';
    
    const body = new THREE.Group();
    body.add(planetMesh);
    
    // 大気の追加
    if (parseFloat(planetData.atmosphere) > 0.1) {
      this.addAtmosphere(body, planetData, params.radius);
    }
    
    // ガス惑星の環の追加
    if (planetData.planetType === 'gas_giant' && Math.random() < 0.5) {
      this.addPlanetRings(body, params.radius);
    }
    
    return body;
  }

  // その他の天体オブジェクト作成メソッド（簡略化）
  private createMoonObject(params: any): THREE.Mesh {
    // ジオメトリは単位サイズ（半径1）で作成
    const moonGeometry = celestialObjectPools.getSphereGeometry(1);
    const moonMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x999999, 
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x333333),
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(moonGeometry, moonMaterial);
    // スケールで実際の半径を設定
    body.scale.set(params.radius, params.radius, params.radius);
    
    // アウトライン追加
    this.addOutline(body, params.radius, 0xffffff, 0.2);
    
    return body;
  }

  private createAsteroidObject(params: any): THREE.Mesh {
    // パラメータの検証
    const safeRadius = (isFinite(params.radius) && params.radius > 0) ? params.radius : 1;
    
    // シンプルな球体ジオメトリを使用（NaNエラーを回避）
    const asteroidGeom = celestialObjectPools.getSphereGeometry(1);
    const asteroidMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      roughness: 0.9, 
      metalness: 0.5,
      emissive: new THREE.Color(0x222222),
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(asteroidGeom, asteroidMaterial);
    
    // スケールで実際の半径を設定
    body.scale.set(safeRadius, safeRadius, safeRadius);
    
    // アウトライン追加
    this.addOutline(body, safeRadius, 0xaaaaaa, 0.15);
    
    return body;
  }

  private createCometObject(params: any): THREE.Mesh {
    // ジオメトリは単位サイズ（半径1）で作成
    const coreGeometry = new THREE.SphereGeometry(1, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xaaddff, 
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
    });
    const body = new THREE.Mesh(coreGeometry, coreMaterial);
    // スケールで実際の半径を設定
    body.scale.set(params.radius, params.radius, params.radius);
    
    // コマ効果
    const comaGeometry = new THREE.SphereGeometry(1, 12, 12);
    const comaMaterial = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    const coma = new THREE.Mesh(comaGeometry, comaMaterial);
    // コマは2倍のサイズ
    coma.scale.set(2, 2, 2);
    body.add(coma);
    
    // アウトライン追加
    this.addOutline(body, params.radius * 1.1, 0xffffff, 0.3);
    
    return body;
  }

  private createDwarfPlanetObject(params: any): THREE.Mesh {
    // ジオメトリは単位サイズ（半径1）で作成
    const dwarfGeometry = celestialObjectPools.getSphereGeometry(1);
    const dwarfMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xaa8866, 
      roughness: 0.9,
      metalness: 0.2
    });
    const body = new THREE.Mesh(dwarfGeometry, dwarfMaterial);
    // スケールで実際の半径を設定
    body.scale.set(params.radius, params.radius, params.radius);
    return body;
  }

  private createBlackHoleObject(params: any): THREE.Group {
    const blackHoleGroup = new THREE.Group();
    
    // イベントホライズン
    const horizonMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.9,
      depthTest: false,
      fog: false
    });
    const horizon = new THREE.Mesh(starGeometry.clone(), horizonMaterial);
    horizon.scale.set(params.radius, params.radius, params.radius);
    horizon.renderOrder = 1000;
    horizon.frustumCulled = false;
    blackHoleGroup.add(horizon);
    
    // アウトライン
    const outlineMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x444444, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.BackSide,
      depthTest: false,
      fog: false
    });
    const outline = new THREE.Mesh(starGeometry.clone(), outlineMaterial);
    outline.scale.set(params.radius * 1.05, params.radius * 1.05, params.radius * 1.05);
    outline.renderOrder = 999;
    outline.frustumCulled = false;
    blackHoleGroup.add(outline);

    // エッジグロー
    const edgeGlowGeometry = new THREE.TorusGeometry(params.radius * 1.02, params.radius * 0.05, 16, 100);
    const edgeGlowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffd700, 
      blending: THREE.AdditiveBlending, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 1.0,
      depthTest: false,
      fog: false
    });
    const edgeGlow = new THREE.Mesh(edgeGlowGeometry, edgeGlowMaterial);
    edgeGlow.name = 'black_hole_edge_glow';
    edgeGlow.renderOrder = 1001;
    edgeGlow.frustumCulled = false;
    blackHoleGroup.add(edgeGlow);

    // 降着円盤
    this.addAccretionDisk(blackHoleGroup, params.radius);
    
    blackHoleGroup.frustumCulled = false;
    return blackHoleGroup;
  }

  // ヘルパーメソッド
  private addOutline(body: THREE.Object3D, radius: number, color: number, opacity: number): void {
    // ジオメトリは単位サイズ（半径1）で作成
    const outlineGeometry = celestialObjectPools.getSphereGeometry(1);
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.BackSide
    });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    // アウトラインはオリジナルの1.05倍のサイズ
    outline.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
    body.add(outline);
  }

  private addAtmosphere(body: THREE.Group, planetData: PlanetUserData, radius: number): void {
    let atmosphereColor: any = 0xffffff;
    if (planetData.subType === 'neptune_like') atmosphereColor = 0x4169E1;
    else if (planetData.subType === 'terran' || planetData.subType === 'ocean_world') atmosphereColor = 0x87ceeb;
    
    const atmosphereMaterial = celestialObjectPools.getMaterial('atmosphere', { 
      color: atmosphereColor, 
      transparent: true, 
      opacity: parseFloat(planetData.atmosphere) * 0.3, 
      blending: THREE.AdditiveBlending 
    });
    // ジオメトリは単位サイズ（半径1）で作成
    const atmosphereGeometry = celestialObjectPools.getSphereGeometry(1);
    const atmosphereSphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereSphere.name = 'atmosphere';
    // 大気はオリジナルの1.05倍のサイズ
    atmosphereSphere.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
    (atmosphereSphere.userData as any).originalRadius = radius * 1.05;
    (atmosphereSphere.userData as any).materialType = 'atmosphere';
    body.add(atmosphereSphere);
  }

  private addPlanetRings(body: THREE.Group, radius: number): void {
    const ringTexture = new THREE.CanvasTexture(document.createElement('canvas'));
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      map: ringTexture, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.6 
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64), 
      ringMaterial
    );
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
    body.add(ring);
  }

  private addAccretionDisk(blackHoleGroup: THREE.Group, radius: number): void {
    const diskGeometry = new THREE.RingGeometry(radius * 1.1, radius * 2.5, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    if (context) {
      const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
      
      const diskTexture = new THREE.CanvasTexture(canvas);
      const diskMaterial = new THREE.MeshBasicMaterial({ 
        map: diskTexture, 
        side: THREE.DoubleSide, 
        transparent: true, 
        blending: THREE.AdditiveBlending,
        depthTest: false,
        opacity: 0.9,
        fog: false
      });
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      disk.rotation.x = Math.PI / 2;
      disk.renderOrder = 998;
      disk.frustumCulled = false;
      blackHoleGroup.add(disk);
    }
  }

  private createRealisticAsteroid(radius: number): THREE.BufferGeometry {
    // 半径の検証とデフォルト値
    const safeRadius = (isFinite(radius) && radius > 0) ? radius : 1;
    
    // デバッグ情報
    if (!isFinite(safeRadius)) {
      console.error('[ASTEROID] Invalid radius for asteroid:', radius, 'using default: 1');
    }
    
    // 単位サイズ（半径1）でジオメトリを作成
    const geometry = new THREE.SphereGeometry(1, 16, 16); // 頂点数を減らしてパフォーマンス向上
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < position.count; i++){
      vertex.fromBufferAttribute(position, i);
      
      // ランダムな凹凸を追加
      const randomScale = 1 + (Math.random() - 0.5) * 0.4;
      vertex.multiplyScalar(randomScale);
      
      // 時々深いクレーターを作成
      if (Math.random() < 0.1) {
        vertex.multiplyScalar(0.85 + Math.random() * 0.1);
      }
      
      // 最終的にradius倍する
      vertex.multiplyScalar(safeRadius);
      
      // NaNチェック
      if (!isFinite(vertex.x) || !isFinite(vertex.y) || !isFinite(vertex.z)) {
        console.error('[ASTEROID] NaN vertex detected at index:', i);
        vertex.set(safeRadius, 0, 0); // フォールバック
      }
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  private createRealisticPlanetMaps(
    subType: string, 
    water: number, 
    atmosphere: number
  ): { map: THREE.CanvasTexture | null, normalMap: THREE.CanvasTexture | null } {
    const width = 512, height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width; 
    canvas.height = height;
    const context = canvas.getContext('2d');
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width; 
    normalCanvas.height = height;
    const normalContext = normalCanvas.getContext('2d');

    if (!context || !normalContext) {
      return { map: null, normalMap: null };
    }

    let baseColor, landColor, oceanColor;

    switch (subType) {
      case 'jupiter_like':
        baseColor = new THREE.Color(0xD2B48C);
        for (let y = 0; y < height; y++) {
          const bandFactor = Math.sin(y / (height / (Math.random() * 12 + 6))) * 0.5 + 0.5;
          const c = baseColor.clone().offsetHSL(0, bandFactor * 0.2 - 0.1, bandFactor * 0.1 - 0.05);
          context.fillStyle = c.getStyle();
          context.fillRect(0, y, width, 1);
        }
        break;
      case 'neptune_like':
        baseColor = new THREE.Color(0x4169E1);
        for (let y = 0; y < height; y++) {
          const bandFactor = Math.sin(y / (height / (Math.random() * 8 + 4))) * 0.5 + 0.5;
          const c = baseColor.clone().offsetHSL(0, 0, bandFactor * 0.3 - 0.15);
          context.fillStyle = c.getStyle();
          context.fillRect(0, y, width, 1);
        }
        break;
      case 'ocean_world':
        oceanColor = new THREE.Color(0x1e90ff);
        landColor = new THREE.Color(0x32cd32);
        context.fillStyle = oceanColor.getStyle();
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 1000; i++) {
          context.fillStyle = landColor.getStyle();
          context.fillRect(Math.random() * width, Math.random() * height, 3, 3);
        }
        break;
      case 'ice_world':
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 50; i++) {
          context.strokeStyle = '#cccccc';
          context.beginPath();
          context.moveTo(Math.random() * width, Math.random() * height);
          context.lineTo(Math.random() * width, Math.random() * height);
          context.stroke();
        }
        break;
      case 'desert_world':
        context.fillStyle = new THREE.Color(0xF4A460).getStyle();
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < height; i += 4) {
          context.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
          context.fillRect(0, i, width, 2);
        }
        break;
      case 'terran':
      default:
        oceanColor = new THREE.Color(0x4682b4);
        landColor = new THREE.Color(0x228b22);
        context.fillStyle = oceanColor.getStyle();
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 50000; i++) {
          if (Math.random() > water) {
            context.fillStyle = landColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2).getStyle();
            context.fillRect(Math.random() * width, Math.random() * height, 2, 2);
          }
        }
        break;
    }
    
    // ノーマルマップ生成
    normalContext.drawImage(canvas, 0, 0);
    const imgData = context.getImageData(0, 0, width, height);
    const normalData = normalContext.createImageData(width, height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const tx = (imgData.data[i - 4] - imgData.data[i + 4]) / 255;
        const ty = (imgData.data[i - width * 4] - imgData.data[i + width * 4]) / 255;
        const normal = new THREE.Vector3(tx, ty, 1).normalize();
        normalData.data[i] = (normal.x * 0.5 + 0.5) * 255;
        normalData.data[i + 1] = (normal.y * 0.5 + 0.5) * 255;
        normalData.data[i + 2] = (normal.z * 0.5 + 0.5) * 255;
        normalData.data[i + 3] = 255;
      }
    }
    
    normalContext.putImageData(normalData, 0, 0);
    
    return { 
      map: new THREE.CanvasTexture(canvas), 
      normalMap: new THREE.CanvasTexture(normalCanvas) 
    };
  }

  // 共通のuserData作成
  private createUserData(
    type: CelestialType,
    params: any
  ): CelestialBodyUserData {
    const finalUserData: CelestialBodyUserData = {
      type: type,
      name: params.config.name || `${type}-${Math.random().toString(16).slice(2, 8)}`,
      creationYear: gameState.gameYear,
      mass: params.gameMass,
      velocity: params.config.velocity ? params.config.velocity.clone() : new THREE.Vector3(0, 0, 0),
      acceleration: new THREE.Vector3(0, 0, 0),
      isStatic: type === 'black_hole',
      radius: params.radius
    };

    const additionalData = params.config.isLoading ? params.config.userData : params.specificData;
    if (additionalData) {
      Object.assign(finalUserData, additionalData);
      
      // 型変換と検証
      if (typeof finalUserData.mass === 'string') {
        finalUserData.mass = parseFloat(finalUserData.mass) || 0;
      }
      finalUserData.mass = params.gameMass;
      
      if (Array.isArray(finalUserData.velocity)) {
        finalUserData.velocity = new THREE.Vector3().fromArray(finalUserData.velocity);
      }
      
      if (!finalUserData.acceleration) {
        finalUserData.acceleration = new THREE.Vector3(0, 0, 0);
      } else if (Array.isArray(finalUserData.acceleration)) {
        finalUserData.acceleration = new THREE.Vector3().fromArray(finalUserData.acceleration);
      }
      
      // 無効な値のチェック
      if (!isFinite(finalUserData.velocity.x) || 
          !isFinite(finalUserData.velocity.y) || 
          !isFinite(finalUserData.velocity.z)) {
        console.warn(`[CELESTIAL] Invalid velocity detected for ${finalUserData.name}, resetting to zero.`);
        finalUserData.velocity.set(0, 0, 0);
      }
      
      if (!isFinite(finalUserData.acceleration.x) || 
          !isFinite(finalUserData.acceleration.y) || 
          !isFinite(finalUserData.acceleration.z)) {
        console.warn(`[CELESTIAL] Invalid acceleration detected for ${finalUserData.name}, resetting to zero.`);
        finalUserData.acceleration.set(0, 0, 0);
      }
    }

    return finalUserData;
  }
}

// 既存のcreateStarやcreatePlanet関数をエクスポート（後方互換性のため）
export function createStar(): Partial<StarUserData> {
  const factory = CelestialBodyFactory.getInstance();
  const result = factory['createStarData']();
  return result.data;
}

export function createPlanet(parentStar: CelestialBody): Partial<PlanetUserData> | null {
  const factory = CelestialBodyFactory.getInstance();
  const result = factory['createPlanetData'](parentStar);
  return result ? result.data : null;
}

// 生命関連の関数は変更なし
export { checkLifeSpawn, evolveLife } from './celestialBody.js';