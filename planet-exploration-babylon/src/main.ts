import { PlanetExploration, PlanetData } from './game/PlanetExploration';
import * as BABYLON from '@babylonjs/core';

// デモ用の惑星データ（初期化時に作成）
let demoPlanet: PlanetData;

// 惑星タイプセレクター
const planetTypes: PlanetData['type'][] = ['forest', 'desert', 'ocean', 'ice', 'volcanic', 'alien'];
let currentPlanetIndex = 0;

// ローディング画面を非表示
const hideLoading = () => {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
};

// ゲームを初期化
const init = async () => {
    console.log('[MAIN] Starting initialization...');
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    
    if (!canvas) {
        console.error('[MAIN] Canvas not found');
        return;
    }
    
    console.log('[MAIN] Canvas found:', canvas);
    
    // デモ惑星データを初期化（BABYLON読み込み後）
    demoPlanet = {
        id: 'demo-planet-1',
        name: 'テラ・ノヴァ',
        type: 'forest',
        radius: 100,
        atmosphere: {
            density: 0.8,
            color: new BABYLON.Color3(0.7, 0.85, 1),
            hasStorms: false
        }
    };
    
    // ゲームインスタンスを作成
    const game = new PlanetExploration(canvas);
    
    try {
        console.log('[MAIN] Initializing game...');
        // 初期化
        await game.initialize();
        
        console.log('[MAIN] Starting game with planet:', demoPlanet);
        // 初期惑星で開始
        game.start(demoPlanet);
        
        console.log('[MAIN] Creating UI controls...');
        // UIコントロールを作成
        createUIControls(game);
        
        console.log('[MAIN] Hiding loading screen...');
        hideLoading();
        console.log('[MAIN] Initialization complete!');
    } catch (error) {
        console.error('[MAIN] Failed to initialize game:', error);
        // エラー時もローディング画面を隠す
        hideLoading();
    }
};

function createUIControls(game: PlanetExploration) {
    const controls = document.createElement('div');
    controls.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        min-width: 200px;
    `;
    
    controls.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">惑星探索デモ</h3>
        <p style="margin: 5px 0;">現在の惑星: <span id="planetName">${demoPlanet.name}</span></p>
        <p style="margin: 5px 0;">タイプ: <span id="planetType">${demoPlanet.type}</span></p>
        <p style="margin: 5px 0;">視点: <span id="viewMode">Third Person</span></p>
        <button id="changePlanet" style="
            margin-top: 10px;
            padding: 8px 15px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
        ">惑星を変更</button>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #444;">
            <h4 style="margin: 0 0 10px 0;">操作方法</h4>
            <p style="margin: 2px 0; font-size: 12px;">クリック: マウスカーソルをロック</p>
            <p style="margin: 2px 0; font-size: 12px;">WASD: 移動</p>
            <p style="margin: 2px 0; font-size: 12px;">マウス: 視点操作</p>
            <p style="margin: 2px 0; font-size: 12px;">スペース: ジャンプ</p>
            <p style="margin: 2px 0; font-size: 12px;">Shift: 走る</p>
            <p style="margin: 2px 0; font-size: 12px;">V: 視点切り替え (FPS/TPS)</p>
            <p style="margin: 2px 0; font-size: 12px;">ホイール: ズーム (TPSのみ)</p>
            <p style="margin: 2px 0; font-size: 12px;">ESC: マウスロック解除</p>
        </div>
    `;
    
    document.body.appendChild(controls);
    
    // 惑星変更ボタンのハンドラー
    document.getElementById('changePlanet')?.addEventListener('click', () => {
        currentPlanetIndex = (currentPlanetIndex + 1) % planetTypes.length;
        const newPlanetType = planetTypes[currentPlanetIndex];
        
        const newPlanet: PlanetData = {
            ...demoPlanet,
            type: newPlanetType,
            name: getPlanetName(newPlanetType)
        };
        
        // 大気の設定も変更
        switch (newPlanetType) {
            case 'desert':
                newPlanet.atmosphere = {
                    density: 1.2,
                    color: new BABYLON.Color3(0.9, 0.7, 0.5),
                    hasStorms: true
                };
                break;
            case 'ice':
                newPlanet.atmosphere = {
                    density: 0.6,
                    color: new BABYLON.Color3(0.85, 0.9, 0.95),
                    hasStorms: false
                };
                break;
            case 'volcanic':
                newPlanet.atmosphere = {
                    density: 1.5,
                    color: new BABYLON.Color3(0.6, 0.3, 0.2),
                    hasStorms: true
                };
                break;
        }
        
        game.start(newPlanet);
        
        // UI更新
        const nameElement = document.getElementById('planetName');
        const typeElement = document.getElementById('planetType');
        if (nameElement) nameElement.textContent = newPlanet.name;
        if (typeElement) typeElement.textContent = newPlanet.type;
    });
}

function getPlanetName(type: PlanetData['type']): string {
    const names = {
        forest: 'テラ・ノヴァ',
        desert: 'アリディア',
        ocean: 'アクアリウス',
        ice: 'グラキエス',
        volcanic: 'ヴルカヌス',
        alien: 'ゼノス・プライム'
    };
    return names[type] || 'Unknown';
}

// DOMContentLoadedを待つ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}