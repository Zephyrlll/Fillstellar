/**
 * Planet Exploration - Babylon.js統合ラッパー
 * cosmic-gardenerとplanetプロジェクトの橋渡し
 */

import { OwnedPlanet } from '../planetShop.js';
import { gameState } from '../../../state.js';
import { showMessage } from '../../../ui.js';
import { addTimelineLog } from '../../../timeline.js';
import { SimplePlanetGame } from './SimplePlanetGame.js';

export class PlanetExplorationBabylon {
    private static instance: PlanetExplorationBabylon | null = null;
    private game: SimplePlanetGame | null = null;
    private container: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private currentPlanet: OwnedPlanet | null = null;
    private hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];
    
    private constructor() {}
    
    static getInstance(): PlanetExplorationBabylon {
        if (!PlanetExplorationBabylon.instance) {
            PlanetExplorationBabylon.instance = new PlanetExplorationBabylon();
        }
        return PlanetExplorationBabylon.instance;
    }
    
    async start(planet: OwnedPlanet): Promise<void> {
        console.log('[BABYLON_INTEGRATION] Starting planet exploration for:', planet.name);
        
        this.currentPlanet = planet;
        
        // cosmic-gardenerのUIを隠す
        this.hideCosmicGardenerUI();
        
        // コンテナとキャンバスを作成
        this.createContainer();
        
        // SimplePlanetGameを開始
        this.game = new SimplePlanetGame(this.canvas!);
        await this.game.start();
        
        // UI要素が作成されるまで少し待つ
        setTimeout(() => {
            console.log('[BABYLON_INTEGRATION] Checking for UI elements...');
            
            // 全てのUI要素を列挙してデバッグ
            const allElements = document.querySelectorAll('div[id], canvas[id]');
            console.log('[BABYLON_INTEGRATION] Found elements with IDs:', Array.from(allElements).map(el => el.id));
            
            // SimplePlanetGameのUI要素をコンテナ内に移動
            const gameUIElements = [
                '#resourceUI',
                '#controls', 
                '#soundControl',
                '#menu',
                '#buildingMenu',
                '#consumableQuickSlots',
                '#survivalUI',
                '#craftingMenu',
                '#weatherDisplay',
                '#tutorialUI',
                '#minimapCanvas',
                '#inventoryUI',
                '#scanner',
                '#notification-container'
            ];
            
            gameUIElements.forEach(selector => {
                const element = document.querySelector(selector) as HTMLElement;
                if (element) {
                    if (element.parentElement === document.body) {
                        // document.bodyからコンテナに移動
                        this.container?.appendChild(element);
                        element.style.zIndex = '100001';
                        console.log(`[BABYLON_INTEGRATION] Moved UI element to container: ${selector}`);
                    } else {
                        // すでに別の親要素にある場合も移動
                        console.log(`[BABYLON_INTEGRATION] Element ${selector} is in: ${element.parentElement?.tagName || 'unknown'}`);
                        this.container?.appendChild(element);
                        element.style.zIndex = '100001';
                    }
                } else {
                    console.warn(`[BABYLON_INTEGRATION] UI element not found: ${selector}`);
                }
            });
            
            // チュートリアルが開始されているか確認
            const tutorialUI = document.querySelector('#tutorialUI');
            if (!tutorialUI) {
                console.warn('[BABYLON_INTEGRATION] Tutorial UI not found - tutorial may not have started');
            }
        }, 2000); // 2秒待つ
        
        // 退出ボタンを追加
        this.addExitButton();
        
        // ESCキーで退出
        this.setupExitHandler();
    }
    
    private createContainer(): void {
        // 既存のコンテナがあれば削除
        if (this.container) {
            this.container.remove();
        }
        
        this.container = document.createElement('div');
        this.container.id = 'babylon-planet-exploration';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            background: #000;
        `;
        
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'renderCanvas';
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            touch-action: none;
            display: block;
        `;
        
        this.container.appendChild(this.canvas);
        document.body.appendChild(this.container);
    }
    
    private addExitButton(): void {
        const exitButton = document.createElement('button');
        exitButton.innerHTML = '🚀 宇宙に戻る';
        exitButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            z-index: 100002;
            font-family: Arial, sans-serif;
        `;
        
        exitButton.onclick = () => this.exit();
        this.container?.appendChild(exitButton);
    }
    
    private setupExitHandler(): void {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.exit();
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }
    
    private exit(): void {
        console.log('[BABYLON_INTEGRATION] Exiting to space');
        
        // リソースを保存（SimplePlanetGameから取得）
        if (this.game) {
            // @ts-ignore - SimplePlanetGameのprivateメンバーにアクセス
            const resources = this.game.resources || { minerals: 0, energy: 0 };
            
            // cosmic-gardenerのリソースに変換
            const conversionRates = {
                minerals: 10,    // 鉱物1 = 宇宙の塵10
                energy: 5,       // エネルギー1 = エネルギー5  
            };
            
            gameState.resources.cosmicDust += Math.floor(resources.minerals * conversionRates.minerals);
            gameState.resources.energy += Math.floor(resources.energy * conversionRates.energy);
            
            if (resources.minerals > 0 || resources.energy > 0) {
                addTimelineLog(
                    `惑星探索から帰還: 宇宙の塵+${Math.floor(resources.minerals * conversionRates.minerals)}, ` +
                    `エネルギー+${Math.floor(resources.energy * conversionRates.energy)}`
                );
                showMessage('探索で得たリソースを回収しました', 'success');
            }
            
            // ゲームを停止
            // @ts-ignore
            if (this.game.engine) {
                // @ts-ignore
                this.game.engine.stopRenderLoop();
                // @ts-ignore
                this.game.engine.dispose();
            }
        }
        
        // コンテナを削除
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // cosmic-gardenerのUIを復元
        this.restoreCosmicGardenerUI();
        
        // インスタンスをリセット
        this.game = null;
        this.canvas = null;
        PlanetExplorationBabylon.instance = null;
    }
    
    private hideCosmicGardenerUI(): void {
        // cosmic-gardenerの主要なUI要素を隠す
        const elementsToHide = [
            '#ui-container',
            '#three-container',
            '#stats',
            '#resource-display',
            '#message-container',
            '#timeline-container',
            '#menu-icon',
            '#menu-container',
            '.tab-container',
            '.floating-ui',
            'canvas:not(#renderCanvas)',  // Babylon.js以外のキャンバス
            // その他のUI要素
            '#production-chain-visualizer',
            '#research-visualizer',
            '#automation-ui',
            '#achievement-notification',
            '#daily-challenge-ui',
            '#multiverse-ui',
            '#prestige-ui',
            '#paragon-ui',
            '#phase-ui',
            '#stats-panel',
            '#performance-overlay'
        ];
        
        this.hiddenElements = [];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element instanceof HTMLElement) {
                    this.hiddenElements.push({
                        element,
                        originalDisplay: element.style.display
                    });
                    element.style.display = 'none';
                }
            });
        });
        
        // Three.jsのレンダリングループを一時停止
        // @ts-ignore
        if (window.gameRenderer) {
            // @ts-ignore
            window.gameRenderer.pause();
        }
    }
    
    private restoreCosmicGardenerUI(): void {
        // 隠した要素を復元
        this.hiddenElements.forEach(({ element, originalDisplay }) => {
            element.style.display = originalDisplay || '';
        });
        this.hiddenElements = [];
        
        // Three.jsのレンダリングループを再開
        // @ts-ignore
        if (window.gameRenderer) {
            // @ts-ignore
            window.gameRenderer.resume();
        }
    }
}