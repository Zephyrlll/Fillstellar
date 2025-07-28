/**
 * Planet 3D Viewer
 * 所有惑星の3D表示システム
 */

import * as THREE from 'three';
import { OwnedPlanet } from '../planetShop.js';
import { CameraController } from './CameraController.js';
import { PlanetRenderer } from './PlanetRenderer.js';
import { PlanetExplorationGame } from '../planetExploration/core/PlanetExplorationGame.js';

export class Planet3DViewer {
    private static instance: Planet3DViewer;
    private container: HTMLDivElement | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private planetRenderer: PlanetRenderer | null = null;
    private cameraController: CameraController | null = null;
    private isOpen: boolean = false;
    private animationId: number | null = null;
    private currentPlanet: OwnedPlanet | null = null;
    
    private constructor() {}
    
    static getInstance(): Planet3DViewer {
        if (!Planet3DViewer.instance) {
            Planet3DViewer.instance = new Planet3DViewer();
        }
        return Planet3DViewer.instance;
    }
    
    /**
     * 3Dビューアーを開く
     */
    open(planet: OwnedPlanet): void {
        if (this.isOpen) {
            this.close();
        }
        
        this.currentPlanet = planet;
        this.createUI();
        this.initThreeJS();
        this.loadPlanet(planet);
        this.isOpen = true;
        this.animate();
    }
    
    /**
     * 3Dビューアーを閉じる
     */
    close(): void {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.cameraController) {
            this.cameraController.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // ESCキーハンドラーを削除
        if ((this as any).handleEsc) {
            document.removeEventListener('keydown', (this as any).handleEsc);
            (this as any).handleEsc = null;
        }
        
        // リサイズハンドラーを削除
        window.removeEventListener('resize', this.handleResize);
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.planetRenderer = null;
        this.cameraController = null;
        this.currentPlanet = null;
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'planet-3d-viewer';
        this.container.innerHTML = `
            <style>
                #planet-3d-viewer {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: #000;
                    z-index: 20000;
                }
                
                #planet-3d-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: block;
                }
                
                .planet-3d-header {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    pointer-events: none;
                }
                
                .planet-info-panel {
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid #4CAF50;
                    border-radius: 10px;
                    padding: 20px;
                    color: white;
                    pointer-events: auto;
                    min-width: 300px;
                }
                
                .planet-name-3d {
                    font-size: 24px;
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                
                .planet-type-3d {
                    font-size: 16px;
                    color: #888;
                    margin-bottom: 15px;
                }
                
                .planet-stats-3d {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                }
                
                .close-3d-viewer {
                    background: rgba(255, 100, 100, 0.2);
                    border: 1px solid rgba(255, 100, 100, 0.5);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    pointer-events: auto;
                    transition: all 0.3s;
                }
                
                .close-3d-viewer:hover {
                    background: rgba(255, 100, 100, 0.3);
                    transform: scale(1.05);
                }
                
                .controls-help {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 15px 30px;
                    color: white;
                    text-align: center;
                }
                
                .controls-title {
                    font-size: 16px;
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                
                .control-keys {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                }
                
                .control-key {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .key-badge {
                    background: #333;
                    border: 1px solid #555;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-weight: bold;
                }
            </style>
            
            <div class="planet-3d-header">
                <div class="planet-info-panel">
                    <div class="planet-name-3d">${this.currentPlanet?.name || ''}</div>
                    <div class="planet-type-3d">${this.getTypeName(this.currentPlanet?.type || '')}</div>
                    <div class="planet-stats-3d">
                        <div class="stat-row">
                            <span>レベル:</span>
                            <span>${this.currentPlanet?.level || 1}</span>
                        </div>
                        <div class="stat-row">
                            <span>生産倍率:</span>
                            <span>x${this.currentPlanet?.productionMultiplier || 1}</span>
                        </div>
                    </div>
                </div>
                
                <button class="close-3d-viewer" id="close-planet-3d">✕ 閉じる</button>
            </div>
            
            <button id="explore-planet-btn" style="
                position: absolute;
                top: 100px;
                right: 20px;
                background: linear-gradient(45deg, #4CAF50, #45a049);
                border: 2px solid #4CAF50;
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
            ">
                🚀 惑星を探索する
            </button>
            
            <canvas id="planet-3d-canvas"></canvas>
            
            <div class="controls-help">
                <div class="controls-title">操作方法</div>
                <div class="control-keys">
                    <div class="control-key">
                        <span class="key-badge">W</span><span class="key-badge">A</span><span class="key-badge">S</span><span class="key-badge">D</span>
                        <span>移動</span>
                    </div>
                    <div class="control-key">
                        <span class="key-badge">スペース</span>
                        <span>ジャンプ</span>
                    </div>
                    <div class="control-key">
                        <span class="key-badge">マウス</span>
                        <span>視点回転</span>
                    </div>
                    <div class="control-key">
                        <span class="key-badge">ESC</span>
                        <span>閉じる</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー
        const closeBtn = document.getElementById('close-planet-3d');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // 惑星探索ボタン
        const exploreBtn = document.getElementById('explore-planet-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => this.startExploration());
            exploreBtn.addEventListener('mouseenter', (e) => {
                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.6)';
            });
            exploreBtn.addEventListener('mouseleave', (e) => {
                (e.target as HTMLElement).style.transform = 'scale(1)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
            });
        }
        
        // ESCキーで閉じる
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // ESCキーハンドラーを保存（後でクリーンアップ用）
        (this as any).handleEsc = handleEsc;
    }
    
    /**
     * Three.jsを初期化
     */
    private initThreeJS(): void {
        const canvas = document.getElementById('planet-3d-canvas') as HTMLCanvasElement;
        if (!canvas) {
            console.error('[3D] Canvas not found!');
            return;
        }
        
        console.log('[3D] Canvas found:', canvas);
        console.log('[3D] Canvas size:', canvas.width, 'x', canvas.height);
        
        // シーン
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        // 霧を一時的に無効化
        // this.scene.fog = new THREE.Fog(0x0a0a1a, 100, 1000);
        
        console.log('[3D] Scene created:', this.scene);
        
        // カメラ
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        // カメラを惑星表面に配置（後で調整）
        this.camera.position.set(0, 1002, 0);
        this.camera.lookAt(0, 0, 0);
        
        console.log('[3D] Camera created at:', this.camera.position);
        
        // レンダラー
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a0a1a, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        console.log('[3D] Renderer created');
        
        // ライト
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // 補助光を追加
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
        
        console.log('[3D] Lights added');
        
        // カメラコントローラー（惑星半径は後で設定）
        this.cameraController = new CameraController(this.camera, canvas, 1000);
        
        // リサイズ対応
        window.addEventListener('resize', this.handleResize);
    }
    
    /**
     * 惑星を読み込む
     */
    private loadPlanet(planet: OwnedPlanet): void {
        if (!this.scene) {
            console.error('[3D] Scene not initialized');
            return;
        }
        
        console.log('[3D] Loading planet:', planet);
        
        this.planetRenderer = new PlanetRenderer(this.scene, planet);
        this.planetRenderer.create();
        
        // カメラを惑星表面に配置
        const planetRadius = this.planetRenderer.radius;
        const startPosition = new THREE.Vector3(0, planetRadius + 2, 100);
        this.camera.position.copy(startPosition);
        this.camera.lookAt(0, 0, 0);
        
        // カメラコントローラーの惑星半径を更新
        if (this.cameraController) {
            (this.cameraController as any).planetRadius = planetRadius;
        }
        
        console.log('[3D] Camera positioned on planet surface');
    }
    
    /**
     * アニメーションループ
     */
    private animate = (): void => {
        if (!this.isOpen) return;
        
        this.animationId = requestAnimationFrame(this.animate);
        
        // 更新
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        if (this.planetRenderer) {
            this.planetRenderer.update();
        }
        
        // レンダリング
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            
            // デバッグ: 初回のみログ出力
            if (!(this as any).firstRender) {
                console.log('[3D] First render completed');
                console.log('[3D] Scene children:', this.scene.children.length);
                console.log('[3D] Camera position:', this.camera.position);
                console.log('[3D] Camera target:', this.camera.getWorldDirection(new THREE.Vector3()));
                (this as any).firstRender = true;
            }
        } else {
            console.error('[3D] Missing renderer, scene or camera:', {
                renderer: !!this.renderer,
                scene: !!this.scene,
                camera: !!this.camera
            });
        }
    };
    
    /**
     * リサイズハンドラー
     */
    private handleResize = (): void => {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    /**
     * 惑星タイプの表示名を取得
     */
    private getTypeName(type: string): string {
        const typeNames: Record<string, string> = {
            desert: '砂漠惑星',
            ocean: '海洋惑星',
            forest: '森林惑星',
            ice: '氷惑星',
            volcanic: '火山惑星',
            gas: 'ガス惑星'
        };
        return typeNames[type] || type;
    }
    
    /**
     * 惑星探索を開始
     */
    private startExploration(): void {
        if (!this.currentPlanet) {
            console.error('[3D] No planet selected for exploration');
            return;
        }
        
        console.log('[3D] Starting planet exploration for:', this.currentPlanet.name);
        
        // 現在の3Dビューアーを閉じる
        this.close();
        
        // 惑星探索ゲームを開始
        const explorationGame = PlanetExplorationGame.getInstance();
        explorationGame.start(this.currentPlanet).catch(error => {
            console.error('[3D] Failed to start exploration:', error);
        });
    }
}