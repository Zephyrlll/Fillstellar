import * as BABYLON from '@babylonjs/core';

// 型定義
interface BuildingType {
    id: string;
    name: string;
    cost: { minerals: number; energy: number };
    color: BABYLON.Color3;
}

interface Building {
    id: string;
    type: BuildingType;
    mesh: BABYLON.Mesh;
    position: BABYLON.Vector3;
    productionRate?: number;
    particleSystem?: BABYLON.ParticleSystem;
}

interface Objective {
    id: string;
    description: string;
    completed: boolean;
    reward: { minerals?: number; energy?: number };
}

// シンプルな惑星探査ゲーム
export class SimplePlanetGame {
    private canvas: HTMLCanvasElement;
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private camera: BABYLON.ArcRotateCamera;
    private player: BABYLON.Mesh;
    private ground: BABYLON.Mesh;
    
    // プレイヤーの状態
    private playerSpeed = 0.15; // 歩く速度を大幅に下げる
    private playerRunSpeed = 0.3; // 走る速度も調整
    private playerVelocity = { x: 0, z: 0, y: 0 };
    private targetVelocity = { x: 0, z: 0 }; // スムーズな加速用
    private isJumping = false;
    private isRunning = false;
    
    // リソース
    private resources = { minerals: 100, energy: 50 }; // 初期リソース
    private resourceNodes: BABYLON.Mesh[] = [];
    
    // 建設システム
    private buildings: Map<string, Building> = new Map();
    private buildMode = false;
    private selectedBuildingType: BuildingType | null = null;
    private previewBuilding: BABYLON.Mesh | null = null;
    private placementIndicator: BABYLON.Mesh | null = null;
    private buildClickHandler: ((event: MouseEvent) => void) | null = null;
    private buildingTypes: BuildingType[] = [
        { id: 'base', name: '基地', cost: { minerals: 50, energy: 20 }, color: new BABYLON.Color3(0.5, 0.5, 0.6) },
        { id: 'miner', name: '採掘機', cost: { minerals: 30, energy: 10 }, color: new BABYLON.Color3(0.8, 0.6, 0.2) },
        { id: 'storage', name: 'ストレージ', cost: { minerals: 20, energy: 5 }, color: new BABYLON.Color3(0.3, 0.5, 0.3) }
    ];
    
    // 天候システム
    private timeOfDay = 6; // 0-24時間（朝6時スタート）
    private sunLight: BABYLON.DirectionalLight;
    private skyMaterial: BABYLON.StandardMaterial;
    
    // 目標システム
    private objectives: Objective[] = [
        { id: 'first_base', description: '基地を建設する', completed: false, reward: { minerals: 50 } },
        { id: 'first_miner', description: '採掘機を建設する', completed: false, reward: { energy: 30 } },
        { id: 'collect_200', description: '鉱石を200個集める', completed: false, reward: { energy: 50 } },
        { id: 'build_5', description: '建物を5つ建設する', completed: false, reward: { minerals: 100, energy: 50 } },
        { id: 'survive_night', description: '夜を生き延びる', completed: false, reward: { minerals: 50, energy: 50 } }
    ];
    private currentObjectiveIndex = 0;
    
    // サウンドシステム
    private sounds: { [key: string]: BABYLON.Sound } = {};
    private soundEnabled = true;
    
    // ミニマップ
    private minimapCanvas: HTMLCanvasElement;
    private minimapCtx: CanvasRenderingContext2D;
    
    // インベントリシステム
    private inventory: { [key: string]: number } = {
        minerals: 0,
        energy: 0,
        tools: 1,
        parts: 0
    };
    private inventoryOpen = false;
    
    // 天候システム
    private weather: 'clear' | 'foggy' | 'windy' | 'storm' = 'clear';
    private weatherTimer = 0;
    private weatherParticles: BABYLON.ParticleSystem | null = null;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true);
        window.addEventListener('resize', () => this.engine.resize());
    }
    
    async start() {
        // シーン作成
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.5, 0.7, 0.9, 1);
        
        // ライト
        new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), this.scene);
        this.sunLight = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -1), this.scene);
        this.sunLight.intensity = 0.8;
        
        // スカイボックス
        this.createSkybox();
        
        // カメラ（シンプルな追従カメラ）
        this.camera = new BABYLON.ArcRotateCamera(
            'camera', 
            Math.PI / 2, 
            Math.PI / 3, 
            15, 
            BABYLON.Vector3.Zero(), 
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        
        // カメラの設定を改善
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 50;
        this.camera.lowerBetaLimit = 0.2;
        this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
        this.camera.wheelPrecision = 50; // ズーム感度
        this.camera.panningSensibility = 0; // パンを無効化
        
        // カメラの慣性を調整
        this.camera.inertia = 0.7;
        this.camera.angularSensibilityX = 1000;
        this.camera.angularSensibilityY = 1000;
        
        // 地形（軽く湾曲した地面）
        this.createTerrain();
        
        // プレイヤー
        this.createPlayer();
        
        // リソース配置
        this.placeResources();
        
        // UI作成
        this.createUI();
        
        // サウンドシステム初期化
        this.initializeSounds();
        
        // 入力設定
        this.setupInput();
        
        // ゲームループ
        this.engine.runRenderLoop(() => {
            this.update();
            this.scene.render();
        });
    }
    
    private createTerrain() {
        // メインの地形（プレイエリア）
        const size = 600; // 300 → 600に拡大
        const subdivisions = 80; // より細かいメッシュ
        
        // 頂点データ
        const positions: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        
        // 頂点生成
        for (let z = 0; z <= subdivisions; z++) {
            for (let x = 0; x <= subdivisions; x++) {
                const xPos = (x - subdivisions / 2) * (size / subdivisions);
                const zPos = (z - subdivisions / 2) * (size / subdivisions);
                
                // 軽い湾曲
                const distance = Math.sqrt(xPos * xPos + zPos * zPos);
                
                // より複雑な地形生成
                const curvature = -distance * distance / 12000; // より緩やかな曲率
                
                // 複数のノイズレイヤー
                const noise1 = Math.sin(xPos * 0.02) * Math.cos(zPos * 0.02) * 8;
                const noise2 = Math.sin(xPos * 0.05 + 1.5) * Math.cos(zPos * 0.05 + 1.5) * 3;
                const noise3 = Math.sin(xPos * 0.1) * Math.cos(zPos * 0.1) * 1.5;
                const noise4 = Math.sin(xPos * 0.3) * Math.cos(zPos * 0.3) * 0.5;
                
                // 丘陵地帯を作る
                const hills = Math.sin(xPos * 0.008) * Math.cos(zPos * 0.008) * 15;
                const smallHills = Math.sin(xPos * 0.015) * Math.cos(zPos * 0.015) * 5;
                
                const height = curvature + hills + smallHills + noise1 + noise2 + noise3 + noise4;
                
                positions.push(xPos, height, zPos);
                uvs.push((x / subdivisions) * 5, (z / subdivisions) * 5); // テクスチャタイリング
            }
        }
        
        // インデックス生成
        for (let z = 0; z < subdivisions; z++) {
            for (let x = 0; x < subdivisions; x++) {
                const i = z * (subdivisions + 1) + x;
                indices.push(i, i + 1, i + subdivisions + 1);
                indices.push(i + 1, i + subdivisions + 2, i + subdivisions + 1);
            }
        }
        
        // メッシュ作成
        this.ground = new BABYLON.Mesh('ground', this.scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        vertexData.normals = normals;
        vertexData.applyToMesh(this.ground);
        
        // グラステクスチャ風のマテリアル
        const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.35, 0.65, 0.25);
        groundMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.1);
        groundMat.specularPower = 16;
        
        // プロシージャルテクスチャ
        const grassTexture = new BABYLON.DynamicTexture('grassTexture', 256, this.scene);
        const ctx = grassTexture.getContext();
        
        // 草地パターン
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#4a7c2e');
        gradient.addColorStop(0.5, '#5a8c3e');
        gradient.addColorStop(1, '#3a6c1e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // ノイズを追加
        for (let i = 0; i < 500; i++) {
            ctx.fillStyle = `rgba(100, 150, 50, ${Math.random() * 0.3})`;
            ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 3, Math.random() * 3);
        }
        
        grassTexture.update();
        groundMat.diffuseTexture = grassTexture;
        this.ground.material = groundMat;
        
        // 物理判定用
        this.ground.checkCollisions = true;
        
        // 遠景の地形（装飾用）
        this.createDistantTerrain();
        
        // 境界の視覚的表示
        this.createBoundaryIndicator();
    }
    
    private createDistantTerrain() {
        // 遠景用の大きな地形（惑星の曲率を表現）
        const size = 2000;
        const subdivisions = 40;
        const planetRadius = 1500; // 惑星の曲率半径
        
        // カスタムメッシュで球面の一部を作成
        const positions: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        
        // 頂点生成
        for (let z = 0; z <= subdivisions; z++) {
            for (let x = 0; x <= subdivisions; x++) {
                const xPos = (x - subdivisions / 2) * (size / subdivisions);
                const zPos = (z - subdivisions / 2) * (size / subdivisions);
                
                // 惑星の曲率を計算
                const distance = Math.sqrt(xPos * xPos + zPos * zPos);
                const curvature = -Math.sqrt(Math.max(0, planetRadius * planetRadius - distance * distance)) + planetRadius;
                
                // 地形の起伏を追加
                const terrainNoise = Math.sin(xPos * 0.005) * 15 + Math.cos(zPos * 0.005) * 15 +
                                   Math.sin(xPos * 0.02) * 5 + Math.cos(zPos * 0.02) * 5;
                
                const height = -curvature * 0.15 + terrainNoise - 100; // 基準高さを下げる
                
                positions.push(xPos, height, zPos);
                uvs.push((x / subdivisions) * 10, (z / subdivisions) * 10);
            }
        }
        
        // インデックス生成
        for (let z = 0; z < subdivisions; z++) {
            for (let x = 0; x < subdivisions; x++) {
                const i = z * (subdivisions + 1) + x;
                indices.push(i, i + 1, i + subdivisions + 1);
                indices.push(i + 1, i + subdivisions + 2, i + subdivisions + 1);
            }
        }
        
        // メッシュ作成
        const farGround = new BABYLON.Mesh('farGround', this.scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        vertexData.normals = normals;
        vertexData.applyToMesh(farGround);
        
        // 遠景マテリアル（グラデーション効果）
        const farMat = new BABYLON.StandardMaterial('farMat', this.scene);
        farMat.diffuseColor = new BABYLON.Color3(0.25, 0.45, 0.2);
        farMat.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // 距離に応じたフォグ効果を追加
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = new BABYLON.Color3(0.7, 0.8, 0.9);
        
        farGround.material = farMat;
        
        // さらに遠景の霧を追加
        this.createHorizonFog();
    }
    
    private createHorizonFog() {
        // 地平線の霧効果（惑星の端を隠す）
        const horizonFog = BABYLON.MeshBuilder.CreateCylinder('horizonFog', {
            height: 200,
            diameterTop: 3000,
            diameterBottom: 2000,
            tessellation: 32
        }, this.scene);
        
        horizonFog.position.y = -150;
        
        const fogMat = new BABYLON.StandardMaterial('fogMat', this.scene);
        fogMat.diffuseColor = new BABYLON.Color3(0.7, 0.8, 0.9);
        fogMat.alpha = 0.3;
        fogMat.backFaceCulling = false;
        horizonFog.material = fogMat;
    }
    
    private createBoundaryIndicator() {
        // 境界を示す円形のライン
        const boundary = BABYLON.MeshBuilder.CreateTorus('boundary', {
            diameter: 540, // 180 → 540に拡大
            thickness: 1.0, // より太く
            tessellation: 64
        }, this.scene);
        
        boundary.position.y = 1;
        
        const boundaryMat = new BABYLON.StandardMaterial('boundaryMat', this.scene);
        boundaryMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        boundaryMat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0);
        boundary.material = boundaryMat;
        
        // 境界の点滅アニメーション
        this.scene.registerBeforeRender(() => {
            boundaryMat.emissiveColor = new BABYLON.Color3(
                0.5 + Math.sin(Date.now() * 0.002) * 0.2,
                0.2,
                0
            );
        });
    }
    
    private createPlayer() {
        // シンプルなカプセル型プレイヤー
        this.player = BABYLON.MeshBuilder.CreateCapsule('player', {
            height: 2,
            radius: 0.5
        }, this.scene);
        
        this.player.position.y = 5;
        
        const playerMat = new BABYLON.StandardMaterial('playerMat', this.scene);
        playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8);
        this.player.material = playerMat;
        
        // カメラターゲット
        this.camera.setTarget(this.player.position);
    }
    
    private placeResources() {
        // ランダムにリソースを配置（より多く、広範囲に）
        for (let i = 0; i < 50; i++) { // 20 → 50個に増加
            const type = Math.random() > 0.5 ? 'mineral' : 'energy';
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 230; // より広範囲に配置
            
            const x = Math.sin(angle) * distance;
            const z = Math.cos(angle) * distance;
            const y = this.getGroundHeight(x, z);
            
            let resource: BABYLON.Mesh;
            
            if (type === 'mineral') {
                // 鉱石：結晶のような形状
                const crystal = BABYLON.MeshBuilder.CreatePolyhedron('mineral', {
                    type: 1,
                    size: 0.5
                }, this.scene);
                const base = BABYLON.MeshBuilder.CreateCylinder('mineralBase', {
                    diameter: 1,
                    height: 0.3,
                    tessellation: 8
                }, this.scene);
                base.position.y = -0.4;
                
                resource = BABYLON.Mesh.MergeMeshes([crystal, base], true, true, undefined, false, true) as BABYLON.Mesh;
                resource.position.set(x, y + 0.7, z);
                resource.metadata = { type };
                
                const mat = new BABYLON.StandardMaterial(`mineralMat_${i}`, this.scene);
                mat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
                mat.specularColor = new BABYLON.Color3(1, 1, 1);
                mat.specularPower = 128;
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
                resource.material = mat;
            } else {
                // エネルギー：光る球体
                const core = BABYLON.MeshBuilder.CreateSphere('energyCore', { 
                    diameter: 0.8,
                    segments: 16 
                }, this.scene);
                const outer = BABYLON.MeshBuilder.CreateSphere('energyOuter', {
                    diameter: 1.2,
                    segments: 8
                }, this.scene);
                
                resource = BABYLON.Mesh.MergeMeshes([core, outer], true, true, undefined, false, true) as BABYLON.Mesh;
                resource.position.set(x, y + 1, z);
                resource.metadata = { type };
                
                const mat = new BABYLON.StandardMaterial(`energyMat_${i}`, this.scene);
                mat.diffuseColor = new BABYLON.Color3(1, 0.9, 0);
                mat.emissiveColor = new BABYLON.Color3(1, 0.8, 0);
                mat.alpha = 0.8;
                resource.material = mat;
            }
            
            this.resourceNodes.push(resource);
            
            // 回転とホバリングアニメーション
            const initialY = resource.position.y;
            const rotationSpeed = type === 'mineral' ? 0.01 : 0.03;
            const hoverSpeed = type === 'mineral' ? 0.002 : 0.004;
            const hoverHeight = type === 'mineral' ? 0.2 : 0.4;
            
            this.scene.registerBeforeRender(() => {
                resource.rotation.y += rotationSpeed;
                if (type === 'energy') {
                    resource.position.y = initialY + Math.sin(Date.now() * hoverSpeed) * hoverHeight;
                }
            });
        }
    }
    
    private createUI() {
        // リソース表示
        const resourceUI = document.createElement('div');
        resourceUI.id = 'resourceUI';
        resourceUI.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            font-family: Arial;
            border-radius: 5px;
        `;
        resourceUI.innerHTML = `
            <div>鉱石: <span id="minerals">0</span></div>
            <div>エネルギー: <span id="energy">0</span></div>
        `;
        document.body.appendChild(resourceUI);
        
        // 操作説明
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            font-family: Arial;
            border-radius: 5px;
        `;
        controls.innerHTML = `
            <div>WASD: 移動</div>
            <div>Shift: 走る</div>
            <div>スペース: ジャンプ</div>
            <div>E: リソース採取</div>
            <div>B: 建設メニュー</div>
            <div>F5: セーブ / F9: ロード</div>
            <div>マウス: カメラ回転</div>
        `;
        document.body.appendChild(controls);
        
        // 建設メニュー
        this.createBuildingMenu();
        
        // 目標UI
        this.createObjectiveUI();
        
        // ミニマップ作成
        this.createMinimap();
        
        // インベントリUI作成
        this.createInventoryUI();
    }
    
    private setupInput() {
        const keys: { [key: string]: boolean } = {};
        
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            
            // リソース採取
            if (e.key.toLowerCase() === 'e') {
                this.collectResource();
            }
            
            // 建設メニュー
            if (e.key.toLowerCase() === 'b') {
                this.toggleBuildMenu();
            }
            
            // ESCで建設モードキャンセル
            if (e.key === 'Escape' && this.buildMode) {
                this.cancelBuildMode();
            }
            
            // インベントリ切り替え
            if (e.key.toLowerCase() === 'i') {
                this.toggleInventory();
            }
            
            // セーブ/ロード
            if (e.key.toLowerCase() === 'f5') {
                this.saveGame();
            }
            if (e.key.toLowerCase() === 'f9') {
                this.loadGame();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        // 移動処理
        this.scene.registerBeforeRender(() => {
            // 移動入力
            let moveX = 0;
            let moveZ = 0;
            
            if (keys['w']) moveZ = 1;
            if (keys['s']) moveZ = -1;
            if (keys['a']) moveX = 1;
            if (keys['d']) moveX = -1;
            
            // 走る
            this.isRunning = keys['shift'] || false;
            const currentSpeed = this.isRunning ? this.playerRunSpeed : this.playerSpeed;
            
            // カメラの向きに合わせて移動
            const forward = this.camera.getForwardRay().direction;
            forward.y = 0;
            forward.normalize();
            const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
            
            // ターゲット速度を計算
            this.targetVelocity.x = (forward.x * moveZ + right.x * moveX) * currentSpeed;
            this.targetVelocity.z = (forward.z * moveZ + right.z * moveX) * currentSpeed;
            
            // スムーズな加速・減速（より滑らかに）
            const smoothFactor = 0.08;
            this.playerVelocity.x += (this.targetVelocity.x - this.playerVelocity.x) * smoothFactor;
            this.playerVelocity.z += (this.targetVelocity.z - this.playerVelocity.z) * smoothFactor;
            
            // ジャンプ
            if (keys[' '] && !this.isJumping) {
                this.playerVelocity.y = 0.4;
                this.isJumping = true;
            }
        });
    }
    
    private update() {
        // 重力（より自然に）
        this.playerVelocity.y -= 0.02;
        
        // プレイヤー移動
        this.player.position.x += this.playerVelocity.x;
        this.player.position.z += this.playerVelocity.z;
        this.player.position.y += this.playerVelocity.y;
        
        // 地面との衝突
        const groundHeight = this.getGroundHeight(this.player.position.x, this.player.position.z) + 1;
        if (this.player.position.y <= groundHeight) {
            this.player.position.y = groundHeight;
            this.playerVelocity.y = 0;
            this.isJumping = false;
        }
        
        // 境界制限（拡大）
        const maxDistance = 270; // 90 → 270に拡大
        const distance = Math.sqrt(this.player.position.x ** 2 + this.player.position.z ** 2);
        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            this.player.position.x *= scale;
            this.player.position.z *= scale;
        }
        
        // カメラ追従
        this.camera.setTarget(this.player.position);
        
        // 建設モードの更新
        if (this.buildMode && this.previewBuilding) {
            // マウス位置に建物プレビューを配置
            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (pickResult && pickResult.hit && pickResult.pickedPoint) {
                const pos = pickResult.pickedPoint;
                const height = this.getGroundHeight(pos.x, pos.z);
                this.previewBuilding.position.set(pos.x, height + 1, pos.z);
                
                // 建物を少し回転させてダイナミックに見せる
                this.previewBuilding.rotation.y += 0.02;
                
                // 配置インジケーターも更新
                if (this.placementIndicator) {
                    this.placementIndicator.position.set(pos.x, height + 0.1, pos.z);
                    this.placementIndicator.rotation.x = Math.PI / 2;
                    
                    // パルス効果を追加
                    const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.9;
                    this.placementIndicator.scaling.set(pulse, pulse, pulse);
                }
            }
        }
        
        // 採掘機の自動生産
        let deltaTime = this.engine.getDeltaTime() / 1000;
        for (const [id, building] of this.buildings) {
            if (building.type.id === 'miner' && building.productionRate) {
                this.resources.minerals += building.productionRate * deltaTime;
                this.resources.energy += building.productionRate * 0.5 * deltaTime;
                
                // インベントリにも追加
                this.inventory.minerals += building.productionRate * deltaTime;
                this.inventory.energy += building.productionRate * 0.5 * deltaTime;
                
                // 時々パーツも生成
                if (Math.random() < 0.001) {
                    this.inventory.parts += 1;
                    this.showNotification('パーツを発見しました！', 'success');
                }
                
                // 採掘エフェクトを追加（まだ存在しない場合）
                if (!building.particleSystem) {
                    this.createMinerEffect(building);
                }
            }
        }
        
        // 昼夜サイクルの更新
        this.updateDayNightCycle(deltaTime);
        
        // 天候の更新
        this.updateWeather(deltaTime);
        
        // UI更新（1秒ごと）
        if (Math.floor(Date.now() / 100) % 10 === 0) {
            this.updateResourceUI();
            this.checkObjectives();
        }
        
        // ミニマップ更新（フレームレート制限）
        if (Math.floor(Date.now() / 50) % 2 === 0) {
            this.updateMinimap();
        }
        
        // 環境音（たまに再生）
        this.playSound('ambient');
    }
    
    private getGroundHeight(x: number, z: number): number {
        // 地形の高さを計算（地形生成と同じロジック）
        const distance = Math.sqrt(x * x + z * z);
        
        const curvature = -distance * distance / 12000;
        const noise1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8;
        const noise2 = Math.sin(x * 0.05 + 1.5) * Math.cos(z * 0.05 + 1.5) * 3;
        const noise3 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1.5;
        const noise4 = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.5;
        const hills = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 15;
        const smallHills = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 5;
        
        return curvature + hills + smallHills + noise1 + noise2 + noise3 + noise4;
    }
    
    private collectResource() {
        // 近くのリソースを採取
        const collectRange = 3;
        
        for (let i = this.resourceNodes.length - 1; i >= 0; i--) {
            const resource = this.resourceNodes[i];
            const distance = BABYLON.Vector3.Distance(this.player.position, resource.position);
            
            if (distance < collectRange) {
                // リソース獲得
                const type = resource.metadata.type;
                this.resources[type === 'mineral' ? 'minerals' : 'energy'] += 10;
                
                // インベントリにも追加
                this.inventory[type === 'mineral' ? 'minerals' : 'energy'] += 10;
                
                // UI更新
                document.getElementById('minerals')!.textContent = this.resources.minerals.toString();
                document.getElementById('energy')!.textContent = this.resources.energy.toString();
                
                // リソース削除
                resource.dispose();
                this.resourceNodes.splice(i, 1);
                
                // 採取エフェクト
                this.createCollectionEffect(resource.position, type);
                
                // サウンド再生
                this.playSound(type === 'mineral' ? 'collect' : 'collectEnergy');
                
                console.log(`採取: ${type}`);
                break;
            }
        }
    }
    
    private createCollectionEffect(position: BABYLON.Vector3, type: string) {
        // パーティクルシステムを作成
        const particleSystem = new BABYLON.ParticleSystem('collectionEffect', 100, this.scene);
        
        // テクスチャを作成
        const texture = new BABYLON.DynamicTexture('particleTexture', 16, this.scene);
        const ctx = texture.getContext();
        ctx.beginPath();
        ctx.arc(8, 8, 7, 0, Math.PI * 2);
        ctx.fillStyle = type === 'mineral' ? '#6699ff' : '#ffcc00';
        ctx.fill();
        texture.update();
        
        particleSystem.particleTexture = texture;
        
        // エミッター設定
        particleSystem.emitter = position.clone();
        particleSystem.emitRate = 100;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // パーティクル設定
        particleSystem.minSize = 0.3;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1;
        
        // 動き設定
        particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 3, 1);
        particleSystem.minEmitPower = 2;
        particleSystem.maxEmitPower = 5;
        particleSystem.updateSpeed = 0.02;
        
        // 重力
        particleSystem.gravity = new BABYLON.Vector3(0, -5, 0);
        
        // 色設定
        if (type === 'mineral') {
            particleSystem.color1 = new BABYLON.Color4(0.4, 0.6, 1, 1);
            particleSystem.color2 = new BABYLON.Color4(0.6, 0.8, 1, 0.8);
        } else {
            particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
            particleSystem.color2 = new BABYLON.Color4(1, 1, 0.2, 0.8);
        }
        
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // 開始
        particleSystem.start();
        
        // 1秒後に停止して削除
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => {
                particleSystem.dispose();
            }, 2000);
        }, 300);
    }
    
    private initializeSounds() {
        // サウンドを作成（Web Audio APIを使用した簡易サウンド）
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // サウンド効果を生成する関数
        const createSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
            return () => {
                if (!this.soundEnabled) return;
                
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                
                // エンベロープ
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            };
        };
        
        // 各種サウンドを定義
        this.soundEffects = {
            collect: createSound(800, 0.1, 'square'),
            collectEnergy: createSound(1200, 0.15, 'sine'),
            build: createSound(400, 0.3, 'triangle'),
            complete: () => {
                if (!this.soundEnabled) return;
                // 達成音（複数の音を組み合わせ）
                createSound(523, 0.1)(); // C
                setTimeout(() => createSound(659, 0.1)(), 100); // E
                setTimeout(() => createSound(784, 0.2)(), 200); // G
            },
            error: createSound(200, 0.2, 'sawtooth'),
            ambient: () => {
                // 環境音（定期的に再生）
                if (!this.soundEnabled || Math.random() > 0.02) return;
                createSound(100 + Math.random() * 50, 0.5, 'sine')();
            }
        };
        
        // 音量コントロールを追加
        const soundControl = document.createElement('div');
        soundControl.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            font-family: Arial;
            font-size: 12px;
            border-radius: 5px;
            cursor: pointer;
        `;
        soundControl.textContent = '🔊 サウンド: ON';
        soundControl.onclick = () => {
            this.soundEnabled = !this.soundEnabled;
            soundControl.textContent = this.soundEnabled ? '🔊 サウンド: ON' : '🔇 サウンド: OFF';
        };
        document.body.appendChild(soundControl);
    }
    
    private soundEffects: { [key: string]: () => void } = {};
    
    private playSound(soundName: string) {
        if (this.soundEffects[soundName]) {
            this.soundEffects[soundName]();
        }
    }
    
    private createBuildingEffect(position: BABYLON.Vector3) {
        // パーティクルシステムを作成
        const particleSystem = new BABYLON.ParticleSystem('buildingEffect', 200, this.scene);
        
        // テクスチャを作成
        const texture = new BABYLON.DynamicTexture('buildParticleTexture', 16, this.scene);
        const ctx = texture.getContext();
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        texture.update();
        
        particleSystem.particleTexture = texture;
        
        // エミッター設定（建物の周りから）
        particleSystem.emitter = position.clone();
        particleSystem.emitRate = 200;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // パーティクル設定
        particleSystem.minSize = 0.2;
        particleSystem.maxSize = 0.6;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.5;
        
        // 動き設定（外側から内側へ）
        particleSystem.createSphereEmitter(3);
        particleSystem.minEmitPower = -3;
        particleSystem.maxEmitPower = -1;
        particleSystem.updateSpeed = 0.02;
        
        // 色設定（白から青へ）
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.color2 = new BABYLON.Color4(0.5, 0.8, 1, 0.8);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // 開始
        particleSystem.start();
        
        // リング状のエフェクトも追加
        const ring = BABYLON.MeshBuilder.CreateTorus('buildRing', {
            diameter: 4,
            thickness: 0.1,
            tessellation: 32
        }, this.scene);
        ring.position = position.clone();
        ring.position.y += 0.1;
        
        const ringMat = new BABYLON.StandardMaterial('ringMat', this.scene);
        ringMat.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
        ringMat.alpha = 0.8;
        ring.material = ringMat;
        
        // リングアニメーション
        let scale = 0.1;
        const ringAnimation = this.scene.registerBeforeRender(() => {
            scale += 0.15;
            ring.scaling.set(scale, 1, scale);
            ringMat.alpha = Math.max(0, 0.8 - scale * 0.2);
            
            if (scale > 4) {
                this.scene.unregisterBeforeRender(ringAnimation);
                ring.dispose();
            }
        });
        
        // 1秒後に停止して削除
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => {
                particleSystem.dispose();
            }, 2000);
        }, 500);
    }
    
    private createMinerEffect(building: Building) {
        // 採掘機用の継続的なパーティクルエフェクト
        const particleSystem = new BABYLON.ParticleSystem('minerEffect', 50, this.scene);
        
        // テクスチャを作成
        const texture = new BABYLON.DynamicTexture('minerParticleTexture', 8, this.scene);
        const ctx = texture.getContext();
        ctx.beginPath();
        ctx.arc(4, 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8800';
        ctx.fill();
        texture.update();
        
        particleSystem.particleTexture = texture;
        
        // エミッター設定（採掘機の下部から）
        const emitterPos = building.position.clone();
        emitterPos.y -= 1;
        particleSystem.emitter = emitterPos;
        particleSystem.emitRate = 20;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // パーティクル設定
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1;
        
        // 動き設定（下から上へ螺旋状に）
        particleSystem.direction1 = new BABYLON.Vector3(-0.5, 0, -0.5);
        particleSystem.direction2 = new BABYLON.Vector3(0.5, 1, 0.5);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 2;
        particleSystem.updateSpeed = 0.02;
        
        // 重力なし（上昇させる）
        particleSystem.gravity = new BABYLON.Vector3(0, 0.5, 0);
        
        // 色設定（オレンジから黄色へ）
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 1, 0, 0.8);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // 開始
        particleSystem.start();
        
        // 建物に関連付け
        building.particleSystem = particleSystem;
    }
    
    private createBuildingMenu() {
        const menu = document.createElement('div');
        menu.id = 'buildingMenu';
        menu.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            font-family: Arial;
            border-radius: 10px;
            display: none;
            min-width: 300px;
        `;
        
        let menuHTML = '<h2 style="text-align: center; margin-bottom: 20px;">建設メニュー</h2>';
        
        this.buildingTypes.forEach(type => {
            menuHTML += `
                <div class="building-option" data-type="${type.id}" style="
                    background: rgba(255,255,255,0.1);
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 5px;
                    cursor: pointer;
                ">
                    <h3 style="margin: 0 0 5px 0;">${type.name}</h3>
                    <div>コスト: 鉱石 ${type.cost.minerals}, エネルギー ${type.cost.energy}</div>
                </div>
            `;
        });
        
        menuHTML += '<button id="closeBuildMenu" style="width: 100%; padding: 10px; margin-top: 20px;">閉じる (ESC)</button>';
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        
        // イベントリスナー
        menu.querySelectorAll('.building-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const typeId = (e.currentTarget as HTMLElement).dataset.type;
                const buildingType = this.buildingTypes.find(t => t.id === typeId);
                if (buildingType && this.canAfford(buildingType.cost)) {
                    this.startBuildMode(buildingType);
                } else {
                    alert('リソースが不足しています！');
                }
            });
        });
        
        document.getElementById('closeBuildMenu')?.addEventListener('click', () => {
            this.toggleBuildMenu();
        });
    }
    
    private toggleBuildMenu() {
        const menu = document.getElementById('buildingMenu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    private canAfford(cost: { minerals: number; energy: number }): boolean {
        return this.resources.minerals >= cost.minerals && this.resources.energy >= cost.energy;
    }
    
    private createBuildingMesh(buildingType: BuildingType, isPreview: boolean): BABYLON.Mesh {
        const timestamp = Date.now();
        let buildingMesh: BABYLON.Mesh;
        
        switch (buildingType.id) {
            case 'base':
                // ベース：ドーム型の構造
                const dome = BABYLON.MeshBuilder.CreateSphere(`dome_${timestamp}`, { 
                    diameter: 3, 
                    slice: 0.5,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE
                }, this.scene);
                const foundation = BABYLON.MeshBuilder.CreateCylinder(`foundation_${timestamp}`, {
                    diameter: 4,
                    height: 0.5
                }, this.scene);
                foundation.position.y = -0.25;
                
                // アンテナを追加
                const antenna = BABYLON.MeshBuilder.CreateCylinder(`antenna_${timestamp}`, {
                    diameter: 0.1,
                    height: 2
                }, this.scene);
                antenna.position.y = 2;
                
                // メッシュを結合
                buildingMesh = BABYLON.Mesh.MergeMeshes([dome, foundation, antenna], true, true, undefined, false, true) as BABYLON.Mesh;
                buildingMesh.name = `base_${timestamp}`;
                break;
                
            case 'miner':
                // 採掘機：ドリル付きの機械
                const minerBase = BABYLON.MeshBuilder.CreateBox(`minerBase_${timestamp}`, {
                    width: 2,
                    height: 1.5,
                    depth: 2
                }, this.scene);
                
                const drill = BABYLON.MeshBuilder.CreateCylinder(`drill_${timestamp}`, {
                    diameter: 0.5,
                    height: 2,
                    tessellation: 6
                }, this.scene);
                drill.position.y = -1.5;
                drill.rotation.x = Math.PI;
                
                const supports = [];
                for (let i = 0; i < 4; i++) {
                    const support = BABYLON.MeshBuilder.CreateCylinder(`support_${i}_${timestamp}`, {
                        diameter: 0.2,
                        height: 1
                    }, this.scene);
                    const angle = (i * Math.PI) / 2;
                    support.position.x = Math.cos(angle) * 0.8;
                    support.position.z = Math.sin(angle) * 0.8;
                    support.position.y = -0.5;
                    supports.push(support);
                }
                
                buildingMesh = BABYLON.Mesh.MergeMeshes([minerBase, drill, ...supports], true, true, undefined, false, true) as BABYLON.Mesh;
                buildingMesh.name = `miner_${timestamp}`;
                break;
                
            case 'storage':
                // 貯蔵施設：円筒形のタンク
                const tank = BABYLON.MeshBuilder.CreateCylinder(`tank_${timestamp}`, {
                    diameter: 3,
                    height: 3
                }, this.scene);
                
                const tankTop = BABYLON.MeshBuilder.CreateCylinder(`tankTop_${timestamp}`, {
                    diameter: 3.2,
                    height: 0.3
                }, this.scene);
                tankTop.position.y = 1.65;
                
                const tankBottom = BABYLON.MeshBuilder.CreateCylinder(`tankBottom_${timestamp}`, {
                    diameter: 3.2,
                    height: 0.3
                }, this.scene);
                tankBottom.position.y = -1.65;
                
                // パイプを追加
                const pipes = [];
                for (let i = 0; i < 2; i++) {
                    const pipe = BABYLON.MeshBuilder.CreateCylinder(`pipe_${i}_${timestamp}`, {
                        diameter: 0.3,
                        height: 1
                    }, this.scene);
                    pipe.position.x = i === 0 ? 1.8 : -1.8;
                    pipe.position.y = 0;
                    pipe.rotation.z = Math.PI / 2;
                    pipes.push(pipe);
                }
                
                buildingMesh = BABYLON.Mesh.MergeMeshes([tank, tankTop, tankBottom, ...pipes], true, true, undefined, false, true) as BABYLON.Mesh;
                buildingMesh.name = `storage_${timestamp}`;
                break;
                
            default:
                // デフォルト：シンプルな箱
                buildingMesh = BABYLON.MeshBuilder.CreateBox(`building_${timestamp}`, { size: 2 }, this.scene);
                break;
        }
        
        // マテリアルを設定
        const mat = new BABYLON.StandardMaterial(`buildingMat_${timestamp}`, this.scene);
        mat.diffuseColor = buildingType.color;
        mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        if (isPreview) {
            mat.alpha = 0.5;
            mat.emissiveColor = buildingType.color.scale(0.3);
        } else {
            // 建物に光沢を追加
            mat.specularPower = 32;
            mat.emissiveColor = buildingType.color.scale(0.1);
        }
        
        buildingMesh.material = mat;
        return buildingMesh;
    }
    
    private startBuildMode(buildingType: BuildingType) {
        this.buildMode = true;
        this.selectedBuildingType = buildingType;
        this.toggleBuildMenu();
        
        // プレビュー建物を作成
        this.previewBuilding = this.createBuildingMesh(buildingType, true);
        this.previewBuilding.isPickable = false; // ピッキング対象から除外
        
        // 配置インジケーターを作成
        this.placementIndicator = BABYLON.MeshBuilder.CreateTorus('placementIndicator', {
            diameter: 4,
            thickness: 0.2,
            tessellation: 32
        }, this.scene);
        
        const indicatorMat = new BABYLON.StandardMaterial('indicatorMat', this.scene);
        indicatorMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        indicatorMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        indicatorMat.alpha = 0.7;
        this.placementIndicator.material = indicatorMat;
        this.placementIndicator.isPickable = false; // ピッキング対象から除外
        
        // マウスクリックで配置（建設モード用のクリックハンドラー）
        this.buildClickHandler = (event: MouseEvent) => {
            if (this.buildMode) {
                event.preventDefault();
                event.stopPropagation();
                console.log('[BUILD] マウスクリックを検出');
                this.placeBuilding();
            }
        };
        
        // 少し遅延を入れてから、クリックイベントを登録
        setTimeout(() => {
            this.canvas.addEventListener('click', this.buildClickHandler);
        }, 100);
    }
    
    private cancelBuildMode() {
        this.buildMode = false;
        this.selectedBuildingType = null;
        if (this.previewBuilding) {
            this.previewBuilding.dispose();
            this.previewBuilding = null;
        }
        if (this.placementIndicator) {
            this.placementIndicator.dispose();
            this.placementIndicator = null;
        }
        // クリックハンドラーを削除
        if (this.buildClickHandler) {
            this.canvas.removeEventListener('click', this.buildClickHandler);
            this.buildClickHandler = null;
        }
    }
    
    private placeBuilding() {
        console.log('[BUILD] placeBuilding called');
        if (!this.selectedBuildingType || !this.previewBuilding) {
            console.error('[BUILD] No building type or preview building');
            return;
        }
        
        // リソースを消費
        this.resources.minerals -= this.selectedBuildingType.cost.minerals;
        this.resources.energy -= this.selectedBuildingType.cost.energy;
        this.updateResourceUI();
        
        // 建物を配置
        const building = this.createBuildingMesh(this.selectedBuildingType, false);
        building.position = this.previewBuilding.position.clone();
        console.log('[BUILD] Building placed at:', building.position);
        
        // 建物データを保存
        const buildingData: Building = {
            id: `building_${Date.now()}`,
            type: this.selectedBuildingType,
            mesh: building,
            position: building.position.clone(),
            productionRate: this.selectedBuildingType.id === 'miner' ? 1 : 0
        };
        
        this.buildings.set(buildingData.id, buildingData);
        
        // 建設エフェクト
        this.createBuildingEffect(building.position);
        
        // サウンド再生
        this.playSound('build');
        
        // 建設モードを終了
        this.cancelBuildMode();
        
        console.log(`建設完了: ${this.selectedBuildingType.name}`);
        
        // 目標チェック
        this.checkObjectives();
    }
    
    private updateResourceUI() {
        document.getElementById('minerals')!.textContent = Math.floor(this.resources.minerals).toString();
        document.getElementById('energy')!.textContent = Math.floor(this.resources.energy).toString();
    }
    
    private createSkybox() {
        // スカイドーム（より自然な空）
        const skybox = BABYLON.MeshBuilder.CreateSphere('skyBox', { 
            diameter: 5000,
            slice: 0.5,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE 
        }, this.scene);
        skybox.rotation.x = Math.PI;
        
        this.skyMaterial = new BABYLON.StandardMaterial('skyBox', this.scene);
        this.skyMaterial.backFaceCulling = false;
        this.skyMaterial.disableLighting = true;
        
        // 動的テクスチャでグラデーション空を作成
        const skyTexture = new BABYLON.DynamicTexture('skyTexture', 512, this.scene);
        this.skyMaterial.emissiveTexture = skyTexture;
        skybox.material = this.skyMaterial;
        
        // 初期の空の色
        this.updateSkyColor();
        
        // 星を追加（夜用）
        this.createStars();
    }
    
    private createStars() {
        // 星のパーティクルシステム
        const starCount = 200;
        const stars = new BABYLON.PointsCloudSystem('stars', 1, this.scene);
        
        const starPositions = function(particle: BABYLON.CloudPoint, i: number) {
            const radius = 2000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
            particle.position.y = radius * Math.cos(phi);
            particle.position.z = radius * Math.sin(phi) * Math.sin(theta);
            
            // 上半分の球面のみに配置
            if (particle.position.y < 0) particle.position.y = Math.abs(particle.position.y);
            
            particle.color = new BABYLON.Color4(1, 1, 1, Math.random() * 0.5 + 0.5);
        };
        
        stars.addPoints(starCount, starPositions);
        const starMesh = stars.buildMeshAsync();
        
        starMesh.then(mesh => {
            const starMat = new BABYLON.StandardMaterial('starMat', this.scene);
            starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            starMat.disableLighting = true;
            starMat.pointSize = 2;
            mesh.material = starMat;
            
            // 星のメッシュを保存（昼夜で表示/非表示を切り替えるため）
            (this as any).starMesh = mesh;
        });
    }
    
    private updateDayNightCycle(deltaTime: number) {
        // 時間を進める（ゲーム内の1日 = 実時間5分）
        this.timeOfDay += deltaTime * (24 / 300); // 300秒で1日
        if (this.timeOfDay >= 24) {
            this.timeOfDay -= 24;
        }
        
        // 太陽の位置を更新
        const sunAngle = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
        this.sunLight.direction = new BABYLON.Vector3(
            Math.cos(sunAngle) * 0.5,
            -Math.sin(sunAngle),
            Math.cos(sunAngle) * 0.5
        );
        
        // 光の強度を更新
        const hour = this.timeOfDay;
        let intensity = 0;
        if (hour >= 6 && hour <= 18) {
            // 昼間
            if (hour <= 12) {
                intensity = (hour - 6) / 6;
            } else {
                intensity = (18 - hour) / 6;
            }
        }
        this.sunLight.intensity = Math.max(0.1, intensity * 0.8);
        
        // 空の色を更新
        this.updateSkyColor();
    }
    
    private updateSkyColor() {
        const hour = this.timeOfDay;
        let skyColor: BABYLON.Color3;
        
        if (hour >= 6 && hour < 12) {
            // 朝
            const t = (hour - 6) / 6;
            skyColor = BABYLON.Color3.Lerp(
                new BABYLON.Color3(1, 0.5, 0.3), // 朝焼け
                new BABYLON.Color3(0.5, 0.7, 0.9), // 昼
                t
            );
        } else if (hour >= 12 && hour < 18) {
            // 昼から夕方
            const t = (hour - 12) / 6;
            skyColor = BABYLON.Color3.Lerp(
                new BABYLON.Color3(0.5, 0.7, 0.9), // 昼
                new BABYLON.Color3(1, 0.4, 0.2), // 夕焼け
                t
            );
        } else if (hour >= 18 && hour < 20) {
            // 夕方から夜
            const t = (hour - 18) / 2;
            skyColor = BABYLON.Color3.Lerp(
                new BABYLON.Color3(1, 0.4, 0.2), // 夕焼け
                new BABYLON.Color3(0.1, 0.1, 0.3), // 夜
                t
            );
        } else {
            // 夜
            skyColor = new BABYLON.Color3(0.1, 0.1, 0.3);
        }
        
        this.scene.clearColor = new BABYLON.Color4(skyColor.r, skyColor.g, skyColor.b, 1);
        if (this.skyMaterial && this.skyMaterial.emissiveTexture) {
            // 動的テクスチャにグラデーションを描画
            const texture = this.skyMaterial.emissiveTexture as BABYLON.DynamicTexture;
            const ctx = texture.getContext();
            
            // より複雑なグラデーション
            const gradient = ctx.createLinearGradient(0, 0, 0, 512);
            
            if (hour >= 6 && hour < 12) {
                // 朝のグラデーション
                gradient.addColorStop(0, `rgb(${Math.floor(skyColor.r * 255)}, ${Math.floor(skyColor.g * 255)}, ${Math.floor(skyColor.b * 255)})`);
                gradient.addColorStop(0.3, `rgb(${Math.floor(skyColor.r * 255 * 1.1)}, ${Math.floor(skyColor.g * 255 * 1.1)}, ${Math.floor(skyColor.b * 255)})`);
                gradient.addColorStop(0.6, `rgb(${Math.floor(skyColor.r * 255 * 0.9)}, ${Math.floor(skyColor.g * 255 * 0.85)}, ${Math.floor(skyColor.b * 255 * 0.8)})`);
                gradient.addColorStop(1, `rgb(${Math.floor(skyColor.r * 255 * 0.7)}, ${Math.floor(skyColor.g * 255 * 0.6)}, ${Math.floor(skyColor.b * 255 * 0.5)})`);
            } else if (hour >= 17 && hour < 20) {
                // 夕方のグラデーション
                gradient.addColorStop(0, `rgb(${Math.floor(skyColor.r * 255 * 0.8)}, ${Math.floor(skyColor.g * 255 * 0.7)}, ${Math.floor(skyColor.b * 255 * 1.2)})`);
                gradient.addColorStop(0.4, `rgb(${Math.floor(skyColor.r * 255)}, ${Math.floor(skyColor.g * 255)}, ${Math.floor(skyColor.b * 255)})`);
                gradient.addColorStop(0.7, `rgb(${Math.floor(skyColor.r * 255 * 1.2)}, ${Math.floor(skyColor.g * 255 * 0.8)}, ${Math.floor(skyColor.b * 255 * 0.6)})`);
                gradient.addColorStop(1, `rgb(${Math.floor(skyColor.r * 255 * 0.5)}, ${Math.floor(skyColor.g * 255 * 0.3)}, ${Math.floor(skyColor.b * 255 * 0.4)})`);
            } else {
                // 昼または夜のシンプルなグラデーション
                gradient.addColorStop(0, `rgb(${Math.floor(skyColor.r * 255)}, ${Math.floor(skyColor.g * 255)}, ${Math.floor(skyColor.b * 255)})`);
                gradient.addColorStop(0.5, `rgb(${Math.floor(skyColor.r * 255 * 0.9)}, ${Math.floor(skyColor.g * 255 * 0.9)}, ${Math.floor(skyColor.b * 255 * 0.95)})`);
                gradient.addColorStop(1, `rgb(${Math.floor(skyColor.r * 255 * 0.7)}, ${Math.floor(skyColor.g * 255 * 0.7)}, ${Math.floor(skyColor.b * 255 * 0.8)})`);
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            texture.update();
        }
        
        // フォグの色も更新
        this.scene.fogColor = skyColor;
        
        // 星の表示/非表示
        if ((this as any).starMesh) {
            (this as any).starMesh.visibility = hour < 6 || hour > 18 ? 0.8 : 0;
        }
    }
    
    private saveGame() {
        const saveData = {
            version: '1.0',
            timestamp: Date.now(),
            player: {
                position: {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z
                }
            },
            resources: this.resources,
            buildings: Array.from(this.buildings.values()).map(b => ({
                id: b.id,
                typeId: b.type.id,
                position: {
                    x: b.position.x,
                    y: b.position.y,
                    z: b.position.z
                }
            })),
            timeOfDay: this.timeOfDay
        };
        
        localStorage.setItem('planetExplorationSave', JSON.stringify(saveData));
        
        // セーブ成功通知
        this.showNotification('ゲームをセーブしました！', 'success');
        console.log('Game saved');
    }
    
    private loadGame() {
        const saveDataStr = localStorage.getItem('planetExplorationSave');
        if (!saveDataStr) {
            this.showNotification('セーブデータが見つかりません', 'error');
            return;
        }
        
        try {
            const saveData = JSON.parse(saveDataStr);
            
            // プレイヤー位置を復元
            this.player.position.set(
                saveData.player.position.x,
                saveData.player.position.y,
                saveData.player.position.z
            );
            
            // リソースを復元
            this.resources = saveData.resources;
            this.updateResourceUI();
            
            // 既存の建物を削除
            for (const [id, building] of this.buildings) {
                building.mesh.dispose();
            }
            this.buildings.clear();
            
            // 建物を復元
            saveData.buildings.forEach((buildingData: any) => {
                const buildingType = this.buildingTypes.find(t => t.id === buildingData.typeId);
                if (!buildingType) return;
                
                const building = BABYLON.MeshBuilder.CreateBox(
                    buildingData.id,
                    { size: 2 },
                    this.scene
                );
                building.position.set(
                    buildingData.position.x,
                    buildingData.position.y,
                    buildingData.position.z
                );
                
                const mat = new BABYLON.StandardMaterial(`buildingMat_${buildingData.id}`, this.scene);
                mat.diffuseColor = buildingType.color;
                building.material = mat;
                
                this.buildings.set(buildingData.id, {
                    id: buildingData.id,
                    type: buildingType,
                    mesh: building,
                    position: building.position.clone(),
                    productionRate: buildingType.id === 'miner' ? 1 : 0
                });
            });
            
            // 時刻を復元
            this.timeOfDay = saveData.timeOfDay || 6;
            
            this.showNotification('ゲームをロードしました！', 'success');
            console.log('Game loaded');
        } catch (error) {
            console.error('Failed to load game:', error);
            this.showNotification('ロードに失敗しました', 'error');
        }
    }
    
    private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? 'rgba(0,200,0,0.9)' : type === 'error' ? 'rgba(200,0,0,0.9)' : 'rgba(0,100,200,0.9)'};
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-family: Arial;
            font-size: 18px;
            z-index: 1000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 2秒後に削除
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
    
    private createObjectiveUI() {
        const objectiveUI = document.createElement('div');
        objectiveUI.id = 'objectiveUI';
        objectiveUI.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            font-family: Arial;
            border-radius: 5px;
            min-width: 250px;
        `;
        document.body.appendChild(objectiveUI);
        
        this.updateObjectiveUI();
    }
    
    private updateObjectiveUI() {
        const objectiveUI = document.getElementById('objectiveUI');
        if (!objectiveUI) return;
        
        const currentObj = this.objectives[this.currentObjectiveIndex];
        if (!currentObj) {
            objectiveUI.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #4CAF50;">全ての目標を達成しました！</h3>
                <p>おめでとうございます！</p>
            `;
            return;
        }
        
        objectiveUI.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">現在の目標</h3>
            <div style="
                background: rgba(255,255,255,0.1);
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 10px;
            ">
                <p style="margin: 0 0 5px 0;">${currentObj.description}</p>
                <div style="font-size: 12px; color: #aaa;">
                    報酬: ${currentObj.reward.minerals ? `鉱石 ${currentObj.reward.minerals}` : ''}
                    ${currentObj.reward.energy ? `エネルギー ${currentObj.reward.energy}` : ''}
                </div>
            </div>
            <div style="font-size: 12px; color: #888;">
                進捗: ${this.currentObjectiveIndex + 1} / ${this.objectives.length}
            </div>
        `;
    }
    
    private createMinimap() {
        // ミニマップコンテナ
        const minimapContainer = document.createElement('div');
        minimapContainer.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: 150px;
            height: 150px;
            background: rgba(0,0,0,0.8);
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            overflow: hidden;
        `;
        
        // ミニマップキャンバス
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 150;
        this.minimapCanvas.height = 150;
        this.minimapCtx = this.minimapCanvas.getContext('2d')!;
        
        minimapContainer.appendChild(this.minimapCanvas);
        document.body.appendChild(minimapContainer);
        
        // ミニマップラベル
        const label = document.createElement('div');
        label.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            color: white;
            font-size: 10px;
            font-family: Arial;
            text-shadow: 1px 1px 2px black;
        `;
        label.textContent = 'MAP';
        minimapContainer.appendChild(label);
        
        // スケール表示
        const scaleLabel = document.createElement('div');
        scaleLabel.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 5px;
            color: white;
            font-size: 9px;
            font-family: Arial;
            text-shadow: 1px 1px 2px black;
        `;
        scaleLabel.textContent = '270m';
        minimapContainer.appendChild(scaleLabel);
    }
    
    private updateMinimap() {
        if (!this.minimapCtx) return;
        
        const ctx = this.minimapCtx;
        const size = 150;
        const scale = 540 / size; // 実際の表示範囲（270m半径 = 540m直径）をマップサイズに変換
        
        // 背景をクリア
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, size, size);
        
        // グリッド
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const pos = (i + 1) * (size / 5);
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
        
        // 境界円（270m半径を表示）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        const boundaryRadius = 270 / scale; // 270mをピクセルに変換
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, boundaryRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        
        // 建物を表示
        for (const [id, building] of this.buildings) {
            const x = (building.position.x / scale) + size / 2;
            const z = (building.position.z / scale) + size / 2;
            
            // 範囲内のみ表示
            if (x >= 0 && x <= size && z >= 0 && z <= size) {
                ctx.fillStyle = `rgb(${building.type.color.r * 255}, ${building.type.color.g * 255}, ${building.type.color.b * 255})`;
                ctx.fillRect(x - 3, z - 3, 6, 6);
            }
        }
        
        // リソースノードを表示
        for (const resource of this.resourceNodes) {
            const x = (resource.position.x / scale) + size / 2;
            const z = (resource.position.z / scale) + size / 2;
            
            // 範囲内のみ表示
            if (x >= 0 && x <= size && z >= 0 && z <= size) {
                ctx.fillStyle = resource.metadata.type === 'mineral' ? '#6699ff' : '#ffcc00';
                ctx.beginPath();
                ctx.arc(x, z, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // プレイヤー位置
        const px = Math.max(5, Math.min(size - 5, (this.player.position.x / scale) + size / 2));
        const pz = Math.max(5, Math.min(size - 5, (this.player.position.z / scale) + size / 2));
        
        // プレイヤーの向き
        const forward = this.camera.getForwardRay().direction;
        const angle = Math.atan2(forward.x, forward.z);
        
        ctx.save();
        ctx.translate(px, pz);
        ctx.rotate(-angle);
        
        // プレイヤーアイコン（三角形）
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(-3, 3);
        ctx.lineTo(3, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // 視界範囲
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(px, pz, 20, angle - Math.PI / 4, angle + Math.PI / 4);
        ctx.stroke();
    }
    
    private createInventoryUI() {
        // インベントリコンテナ
        const inventoryContainer = document.createElement('div');
        inventoryContainer.id = 'inventoryContainer';
        inventoryContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 300px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            color: white;
            font-family: Arial;
            display: none;
            padding: 20px;
        `;
        
        inventoryContainer.innerHTML = `
            <h2 style="margin: 0 0 20px 0; text-align: center;">インベントリ</h2>
            <div id="inventoryContent" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            </div>
            <div style="position: absolute; bottom: 20px; right: 20px; font-size: 12px; color: #888;">
                [I] キーで閉じる
            </div>
        `;
        
        document.body.appendChild(inventoryContainer);
        
        // インベントリ情報パネル
        const infoPanel = document.createElement('div');
        infoPanel.style.cssText = `
            position: absolute;
            bottom: 60px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            font-size: 12px;
            font-family: Arial;
            border-radius: 5px;
        `;
        infoPanel.innerHTML = '[I] インベントリ';
        document.body.appendChild(infoPanel);
    }
    
    private updateInventoryUI() {
        const content = document.getElementById('inventoryContent');
        if (!content) return;
        
        const items = [
            { id: 'minerals', name: '鉱石', icon: '💎', color: '#6699ff' },
            { id: 'energy', name: 'エネルギー', icon: '⚡', color: '#ffcc00' },
            { id: 'tools', name: 'ツール', icon: '🔧', color: '#cccccc' },
            { id: 'parts', name: 'パーツ', icon: '⚙️', color: '#888888' }
        ];
        
        content.innerHTML = '';
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid ${item.color};
                border-radius: 5px;
                padding: 10px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            itemDiv.innerHTML = `
                <div style="font-size: 30px; margin-bottom: 5px;">${item.icon}</div>
                <div style="font-size: 12px; margin-bottom: 5px;">${item.name}</div>
                <div style="font-size: 16px; font-weight: bold; color: ${item.color};">
                    ${this.inventory[item.id] || 0}
                </div>
            `;
            
            itemDiv.onmouseover = () => {
                itemDiv.style.background = 'rgba(255, 255, 255, 0.2)';
                itemDiv.style.transform = 'scale(1.05)';
            };
            
            itemDiv.onmouseout = () => {
                itemDiv.style.background = 'rgba(255, 255, 255, 0.1)';
                itemDiv.style.transform = 'scale(1)';
            };
            
            content.appendChild(itemDiv);
        });
        
        // 空のスロット
        for (let i = items.length; i < 12; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                padding: 10px;
                height: 90px;
            `;
            content.appendChild(emptySlot);
        }
    }
    
    private toggleInventory() {
        this.inventoryOpen = !this.inventoryOpen;
        const container = document.getElementById('inventoryContainer');
        if (container) {
            container.style.display = this.inventoryOpen ? 'block' : 'none';
            if (this.inventoryOpen) {
                this.updateInventoryUI();
                this.playSound('collect');
            }
        }
    }
    
    private updateWeather(deltaTime: number) {
        this.weatherTimer += deltaTime;
        
        // 天候変化（2-5分ごと）
        if (this.weatherTimer > 120 + Math.random() * 180) {
            this.weatherTimer = 0;
            this.changeWeather();
        }
        
        // 天候エフェクトの更新
        switch (this.weather) {
            case 'foggy':
                this.scene.fogDensity = 0.01 + Math.sin(Date.now() * 0.0001) * 0.002;
                break;
                
            case 'windy':
                // 風の音効果
                if (Math.random() < 0.01) {
                    this.playSound('ambient');
                }
                break;
                
            case 'storm':
                // 雷の効果
                if (Math.random() < 0.001) {
                    this.createLightningEffect();
                }
                break;
                
            default:
                this.scene.fogDensity = 0.01;
                break;
        }
    }
    
    private changeWeather() {
        // 古い天候エフェクトを削除
        if (this.weatherParticles) {
            this.weatherParticles.stop();
            setTimeout(() => {
                if (this.weatherParticles) {
                    this.weatherParticles.dispose();
                    this.weatherParticles = null;
                }
            }, 2000);
        }
        
        // 新しい天候をランダムに選択
        const weathers: Array<'clear' | 'foggy' | 'windy' | 'storm'> = ['clear', 'clear', 'foggy', 'windy', 'storm'];
        this.weather = weathers[Math.floor(Math.random() * weathers.length)];
        
        // 天候通知
        const weatherNames = {
            clear: '晴れ',
            foggy: '霧',
            windy: '強風',
            storm: '嵐'
        };
        
        this.showNotification(`天候が変わりました: ${weatherNames[this.weather]}`, 'info');
        
        // 天候表示を更新
        const weatherDisplay = document.getElementById('weatherDisplay');
        if (!weatherDisplay) {
            const display = document.createElement('div');
            display.id = 'weatherDisplay';
            display.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 5px 15px;
                font-family: Arial;
                font-size: 14px;
                border-radius: 20px;
            `;
            document.body.appendChild(display);
        }
        const display = document.getElementById('weatherDisplay');
        if (display) {
            display.textContent = `天候: ${weatherNames[this.weather]}`;
        }
        
        // 天候パーティクルを作成
        switch (this.weather) {
            case 'foggy':
                this.createFogEffect();
                break;
                
            case 'windy':
                this.createWindEffect();
                break;
                
            case 'storm':
                this.createStormEffect();
                break;
        }
    }
    
    private createFogEffect() {
        // 霧の効果を強化
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.02;
        
        // 霧のパーティクル
        this.weatherParticles = new BABYLON.ParticleSystem('fog', 200, this.scene);
        
        const fogTexture = new BABYLON.DynamicTexture('fogTexture', 32, this.scene);
        const ctx = fogTexture.getContext();
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        fogTexture.update();
        
        this.weatherParticles.particleTexture = fogTexture;
        this.weatherParticles.emitter = this.player;
        this.weatherParticles.minEmitBox = new BABYLON.Vector3(-50, -10, -50);
        this.weatherParticles.maxEmitBox = new BABYLON.Vector3(50, 10, 50);
        
        this.weatherParticles.color1 = new BABYLON.Color4(1, 1, 1, 0.1);
        this.weatherParticles.color2 = new BABYLON.Color4(1, 1, 1, 0.05);
        this.weatherParticles.colorDead = new BABYLON.Color4(1, 1, 1, 0);
        
        this.weatherParticles.minSize = 5;
        this.weatherParticles.maxSize = 15;
        this.weatherParticles.minLifeTime = 5;
        this.weatherParticles.maxLifeTime = 10;
        
        this.weatherParticles.emitRate = 20;
        this.weatherParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        this.weatherParticles.gravity = new BABYLON.Vector3(0, 0, 0);
        this.weatherParticles.direction1 = new BABYLON.Vector3(-0.5, 0, -0.5);
        this.weatherParticles.direction2 = new BABYLON.Vector3(0.5, 0, 0.5);
        this.weatherParticles.minEmitPower = 0.5;
        this.weatherParticles.maxEmitPower = 1;
        
        this.weatherParticles.start();
    }
    
    private createWindEffect() {
        // 風のパーティクル（塵）
        this.weatherParticles = new BABYLON.ParticleSystem('wind', 300, this.scene);
        
        const dustTexture = new BABYLON.DynamicTexture('dustTexture', 8, this.scene);
        const ctx = dustTexture.getContext();
        ctx.fillStyle = 'rgba(200, 150, 100, 0.5)';
        ctx.fillRect(0, 0, 8, 8);
        dustTexture.update();
        
        this.weatherParticles.particleTexture = dustTexture;
        this.weatherParticles.emitter = this.player;
        this.weatherParticles.minEmitBox = new BABYLON.Vector3(-100, 0, -100);
        this.weatherParticles.maxEmitBox = new BABYLON.Vector3(100, 20, 100);
        
        this.weatherParticles.color1 = new BABYLON.Color4(0.8, 0.7, 0.5, 0.3);
        this.weatherParticles.color2 = new BABYLON.Color4(0.9, 0.8, 0.6, 0.2);
        this.weatherParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        this.weatherParticles.minSize = 0.5;
        this.weatherParticles.maxSize = 1.5;
        this.weatherParticles.minLifeTime = 1;
        this.weatherParticles.maxLifeTime = 3;
        
        this.weatherParticles.emitRate = 50;
        this.weatherParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        this.weatherParticles.gravity = new BABYLON.Vector3(0, -1, 0);
        this.weatherParticles.direction1 = new BABYLON.Vector3(3, 0.5, 0);
        this.weatherParticles.direction2 = new BABYLON.Vector3(5, 1, 0.5);
        this.weatherParticles.minEmitPower = 3;
        this.weatherParticles.maxEmitPower = 5;
        
        this.weatherParticles.start();
    }
    
    private createStormEffect() {
        // 嵐のパーティクル（雨）
        this.weatherParticles = new BABYLON.ParticleSystem('storm', 500, this.scene);
        
        const rainTexture = new BABYLON.DynamicTexture('rainTexture', 4, this.scene);
        const ctx = rainTexture.getContext();
        ctx.fillStyle = 'rgba(150, 150, 200, 0.6)';
        ctx.fillRect(0, 0, 4, 4);
        rainTexture.update();
        
        this.weatherParticles.particleTexture = rainTexture;
        this.weatherParticles.emitter = this.player;
        this.weatherParticles.minEmitBox = new BABYLON.Vector3(-50, 20, -50);
        this.weatherParticles.maxEmitBox = new BABYLON.Vector3(50, 30, 50);
        
        this.weatherParticles.color1 = new BABYLON.Color4(0.6, 0.6, 0.8, 0.6);
        this.weatherParticles.color2 = new BABYLON.Color4(0.7, 0.7, 0.9, 0.4);
        this.weatherParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        this.weatherParticles.minSize = 0.1;
        this.weatherParticles.maxSize = 0.3;
        this.weatherParticles.minLifeTime = 0.5;
        this.weatherParticles.maxLifeTime = 1;
        
        this.weatherParticles.emitRate = 200;
        this.weatherParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        this.weatherParticles.gravity = new BABYLON.Vector3(0, -20, 0);
        this.weatherParticles.direction1 = new BABYLON.Vector3(-0.5, -1, -0.5);
        this.weatherParticles.direction2 = new BABYLON.Vector3(0.5, -1, 0.5);
        this.weatherParticles.minEmitPower = 10;
        this.weatherParticles.maxEmitPower = 15;
        
        this.weatherParticles.start();
        
        // より暗い空
        this.scene.fogDensity = 0.03;
    }
    
    private createLightningEffect() {
        // 雷のフラッシュ効果
        const originalIntensity = this.scene.ambientColor;
        this.scene.ambientColor = new BABYLON.Color3(0.5, 0.5, 0.7);
        
        setTimeout(() => {
            this.scene.ambientColor = originalIntensity;
        }, 100);
        
        // 雷の音
        this.playSound('error'); // 雷の音の代わり
    }
    
    private checkObjectives() {
        const currentObj = this.objectives[this.currentObjectiveIndex];
        if (!currentObj || currentObj.completed) return;
        
        let completed = false;
        
        switch (currentObj.id) {
            case 'first_base':
                completed = Array.from(this.buildings.values()).some(b => b.type.id === 'base');
                break;
                
            case 'first_miner':
                completed = Array.from(this.buildings.values()).some(b => b.type.id === 'miner');
                break;
                
            case 'collect_200':
                completed = this.resources.minerals >= 200;
                break;
                
            case 'build_5':
                completed = this.buildings.size >= 5;
                break;
                
            case 'survive_night':
                completed = this.timeOfDay < 6 || this.timeOfDay > 20;
                break;
        }
        
        if (completed) {
            this.completeObjective(currentObj);
            // 達成音を再生
            this.playSound('complete');
        }
    }
    
    private completeObjective(objective: Objective) {
        objective.completed = true;
        
        // 報酬を付与
        if (objective.reward.minerals) {
            this.resources.minerals += objective.reward.minerals;
        }
        if (objective.reward.energy) {
            this.resources.energy += objective.reward.energy;
        }
        
        this.updateResourceUI();
        this.showNotification(`目標達成！ ${objective.description}`, 'success');
        
        // 次の目標へ
        this.currentObjectiveIndex++;
        this.updateObjectiveUI();
    }
}