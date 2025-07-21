import * as THREE from 'three';
import { scene, camera, renderer, composer } from './threeSetup.js';
import { gameState, gameStateManager, CelestialBody, StarUserData } from './state.js';
import { ui, switchTab, showMessage, updateUI, debouncedUpdateGalaxyMap, toggleProductionPanel, closeProductionPanel, showMobileModal } from './ui.js';
import { saveGame } from './saveload.js';
import { createCelestialBody } from './celestialBody.js';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache } from './utils.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';
import { graphicsEngine } from './graphicsEngine.js';
import { physicsConfig } from './physicsConfig.js';
import { backgroundGalaxies } from './backgroundGalaxies.js';
import { initializeSaveLoadUI } from './systems/idleGameUI.js';
import { blackHoleGas } from './blackHoleGas.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export const keys = { w: false, a: false, s: false, d: false };

function focusOnStar(star: CelestialBody) {
    gameStateManager.updateState(state => ({
        ...state,
        focusedObject: star
    }));
    console.log("[GAME] Focused on:", star.userData.name);
    // カメラの即座のリセットは行わない
    // メインループで天体を追従するだけ
}

let eventListenersSetup = false;

function createInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.classList.add('info-panel', 'hidden');
    document.body.appendChild(panel);

    let currentTarget: HTMLElement | null = null;

    function show(element: HTMLElement, title: string, contentFn: () => string) {
        if (!element) return;
        panel.innerHTML = `<h3>${title}</h3><p>${contentFn()}</p>`;
        panel.classList.remove('hidden');
        currentTarget = element;
        
        const rect = element.getBoundingClientRect();
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.bottom + 5}px`;
    }

    function hide() {
        panel.classList.add('hidden');
        currentTarget = null;
    }

    function updatePosition(event: MouseEvent) {
        if (!currentTarget) return;
        panel.style.left = `${event.clientX + 15}px`;
        panel.style.top = `${event.clientY + 15}px`;
    }

    return (elementId: string, title: string, contentFn: () => string) => {
        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }
        
        const parent = element.parentElement;
        if (parent) {
            parent.addEventListener('mouseenter', () => {
                show(parent, title, contentFn);
            });
            parent.addEventListener('mouseleave', hide);
            parent.addEventListener('mousemove', updatePosition);
        }
    };
}

export function setupEventListeners() {
    if (eventListenersSetup) return;
    eventListenersSetup = true;
    
    // Initialize save/load UI
    initializeSaveLoadUI();
    
    // UI要素上でのマウス操作時にOrbitControlsを無効化
    const handleUIMouseEnter = () => {
        import('./threeSetup.js').then(({ controls }) => {
            controls.enabled = false;  // OrbitControlsを完全に無効化
        });
    };
    
    const handleUIMouseLeave = () => {
        import('./threeSetup.js').then(({ controls }) => {
            controls.enabled = true;   // OrbitControlsを再度有効化
        });
    };
    
    // UIエリアとタブコンテンツにイベントリスナーを追加
    if (ui.uiArea) {
        ui.uiArea.addEventListener('mouseenter', handleUIMouseEnter);
        ui.uiArea.addEventListener('mouseleave', handleUIMouseLeave);
    }
    
    // すべてのタブコンテンツにも同様のリスナーを追加
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tabContent => {
        tabContent.addEventListener('mouseenter', handleUIMouseEnter);
        tabContent.addEventListener('mouseleave', handleUIMouseLeave);
    });
    
    // プロダクションパネル
    const productionPanel = document.getElementById('productionPanel');
    if (productionPanel) {
        productionPanel.addEventListener('mouseenter', handleUIMouseEnter);
        productionPanel.addEventListener('mouseleave', handleUIMouseLeave);
    }
    
    // モバイルモーダル
    const mobileModal = document.getElementById('mobileModal');
    if (mobileModal) {
        mobileModal.addEventListener('mouseenter', handleUIMouseEnter);
        mobileModal.addEventListener('mouseleave', handleUIMouseLeave);
    }
    
    // 銀河マップコンテナ
    if (ui.galaxyMapContainer) {
        ui.galaxyMapContainer.addEventListener('mouseenter', handleUIMouseEnter);
        ui.galaxyMapContainer.addEventListener('mouseleave', handleUIMouseLeave);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        debouncedUpdateGalaxyMap();
    });
    
    // フォーカス中の天体への距離調整は、OrbitControlsが有効な時のみ動作する
    // UI上ではOrbitControlsが無効化されているため、追加の処理は不要

    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyW') keys.w = true;
        if (event.code === 'KeyA') keys.a = true;
        if (event.code === 'KeyS') keys.s = true;
        if (event.code === 'KeyD') keys.d = true;
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'KeyW') keys.w = false;
        if (event.code === 'KeyA') keys.a = false;
        if (event.code === 'KeyS') keys.s = false;
        if (event.code === 'KeyD') keys.d = false;
        if (event.code === 'KeyM') {
            gameStateManager.updateState(state => ({
                ...state,
                isMapVisible: !state.isMapVisible
            }));
            debouncedUpdateGalaxyMap();
        }
        // ESCキーでフォーカスを解除
        if (event.code === 'Escape' && gameState.focusedObject) {
            gameStateManager.updateState(state => ({
                ...state,
                focusedObject: null
            }));
            showMessage('天体フォーカスを解除しました');
        }
    });

    if (ui.gameTabButton) ui.gameTabButton.addEventListener('click', () => {
        soundManager.playUISound('tab');
        switchTab('game');
    });
    if (ui.researchTabButton) ui.researchTabButton.addEventListener('click', () => {
        soundManager.playUISound('tab');
        switchTab('research');
    });
    // Production panel toggle button (new slide-out panel)
    const productionToggleButton = document.getElementById('productionToggleButton');
    if (productionToggleButton) {
        productionToggleButton.addEventListener('click', () => {
            console.log('🎯 Production panel toggle clicked!');
            soundManager.playUISound('tab');
            toggleProductionPanel();
        });
    }
    
    // Production panel close button
    const productionPanelCloseButton = document.getElementById('productionPanelCloseButton');
    if (productionPanelCloseButton) {
        productionPanelCloseButton.addEventListener('click', () => {
            soundManager.playUISound('click');
            closeProductionPanel();
        });
    }
    if (ui.optionsTabButton) ui.optionsTabButton.addEventListener('click', () => {
        soundManager.playUISound('tab');
        switchTab('options');
    });
    if (ui.starManagementTabButton) ui.starManagementTabButton.addEventListener('click', () => {
        soundManager.playUISound('tab');
        switchTab('starManagement');
    });
    if (ui.closeOptionsButton) ui.closeOptionsButton.addEventListener('click', () => {
        soundManager.playUISound('click');
        switchTab('game');
    });
    
    // Mobile tab buttons
    if (ui.gameTabMobile) ui.gameTabMobile.addEventListener('click', () => {
        soundManager.playUISound('tab');
        showMobileModal('game');
    });
    if (ui.researchTabMobile) ui.researchTabMobile.addEventListener('click', () => {
        soundManager.playUISound('tab');
        showMobileModal('research');
    });
    if (ui.optionsTabMobile) ui.optionsTabMobile.addEventListener('click', () => {
        soundManager.playUISound('tab');
        showMobileModal('options');
    });
    if (ui.starTabMobile) ui.starTabMobile.addEventListener('click', () => {
        soundManager.playUISound('tab');
        showMobileModal('starManagement');
    });


    // Mobile production toggle button
    const productionToggleButtonMobile = document.getElementById('productionToggleButton-mobile');
    if (productionToggleButtonMobile) {
        productionToggleButtonMobile.addEventListener('click', () => {
            console.log('🎯 Mobile production button clicked!');
            soundManager.playUISound('tab');
            showMobileModal('production');
        });
    }

    // Mobile resource sell button
    const floatingResourceSellButtonMobile = document.getElementById('floatingResourceSellButton-mobile');
    if (floatingResourceSellButtonMobile) {
        floatingResourceSellButtonMobile.addEventListener('click', () => {
            console.log('💰 Mobile sell button clicked!');
            soundManager.playUISound('tab');
            showMobileModal('sell');
        });
    }

    // Mobile inventory toggle button
    const inventoryToggleButtonMobile = document.getElementById('inventoryToggleButton-mobile');
    if (inventoryToggleButtonMobile) {
        inventoryToggleButtonMobile.addEventListener('click', () => {
            console.log('📦 Mobile inventory button clicked!');
            soundManager.playUISound('tab');
            showMobileModal('inventory');
        });
    }

    // Galaxy map toggle button
    if (ui.galaxyMapToggle) {
        console.log('🔧 Galaxy map toggle button found, adding event listener');
        
        // Add both click and touchstart events for mobile compatibility
        const handleToggle = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔧 Galaxy map toggle clicked!');
            
            soundManager.playUISound('click');
            const mapContainer = ui.galaxyMapContainer;
            if (mapContainer) {
                // Toggle the collapsed state
                mapContainer.classList.toggle('collapsed');
                const isCollapsed = mapContainer.classList.contains('collapsed');
                
                console.log('🔧 Map container collapsed state:', isCollapsed);
                
                // Update gameState.isMapVisible to match the visual state
                gameStateManager.updateState(state => ({
                    ...state,
                    isMapVisible: !isCollapsed
                }));
                
                // Update button appearance
                if (ui.galaxyMapToggle) {
                    ui.galaxyMapToggle.textContent = isCollapsed ? '📡' : '📶';
                    ui.galaxyMapToggle.title = isCollapsed ? 'レーダーを開く' : 'レーダーを閉じる';
                    console.log('🔧 Button updated:', ui.galaxyMapToggle.textContent);
                }
                
                // Save the state
                saveGame();
            } else {
                console.log('🔧 Map container not found!');
            }
        };
        
        ui.galaxyMapToggle.addEventListener('click', handleToggle);
        ui.galaxyMapToggle.addEventListener('touchstart', handleToggle, { passive: false });
        
        // Add visual feedback for touch
        ui.galaxyMapToggle.addEventListener('touchstart', (e: TouchEvent) => {
            (e.target as HTMLElement).style.transform = 'scale(0.95)';
        }, { passive: true });
        
        ui.galaxyMapToggle.addEventListener('touchend', (e: TouchEvent) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
        }, { passive: true });
        
    } else {
        console.log('🔧 Galaxy map toggle button NOT found!');
    }

    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    console.log(`[EVENTS] Found ${collapsibleHeaders.length} collapsible headers`);
    
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            console.log('🔧 Collapsible header clicked:', header.textContent);
            header.classList.toggle('active');
            const content = header.nextElementSibling as HTMLElement;
            
            // LOD設定のデバッグ（詳細）
            if (header.id === 'lodSettingsHeader') {
                console.log('🔍 LOD header clicked - before toggle:', {
                    header: header,
                    headerId: header.id,
                    content: content,
                    contentId: content?.id,
                    contentTagName: content?.tagName,
                    contentClasses: content?.className,
                    isHidden: content?.classList.contains('hidden'),
                    computedStyle: content ? window.getComputedStyle(content).display : 'null'
                });
            }
            
            if (content && content.classList.contains('collapsible-content')) {
                // hidden と active を切り替え
                if (content.classList.contains('hidden')) {
                    // まずhiddenを削除してからactiveを追加（順序重要）
                    content.classList.remove('hidden');
                    // 少し遅延させてアニメーションを確実に動作させる
                    setTimeout(() => {
                        content.classList.add('active');
                    }, 10);
                } else {
                    // まずactiveを削除してからhiddenを追加
                    content.classList.remove('active');
                    // トランジション完了後にhiddenを追加
                    setTimeout(() => {
                        content.classList.add('hidden');
                    }, 300); // CSSのtransition時間と同じ
                }
                console.log('📋 Content toggled:', content.classList.contains('active') ? 'opened' : 'closed');
                
                // LOD設定のデバッグ（詳細後）
                if (header.id === 'lodSettingsHeader') {
                    setTimeout(() => {
                        console.log('🔍 LOD header clicked - after toggle:', {
                            contentClasses: content.className,
                            isHidden: content.classList.contains('hidden'),
                            isActive: content.classList.contains('active'),
                            computedStyle: window.getComputedStyle(content).display,
                            offsetHeight: content.offsetHeight,
                            scrollHeight: content.scrollHeight
                        });
                    }, 50);
                }
            } else {
                console.warn('⚠️ No valid collapsible content found for header:', header.textContent);
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (ui.uiArea && ui.uiArea.contains(event.target as Node)) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let intersectedObject: THREE.Object3D | null = intersects[0].object;
            while (intersectedObject && intersectedObject.parent && !gameState.stars.includes(intersectedObject as CelestialBody)) {
                intersectedObject = intersectedObject.parent;
            }

            if (intersectedObject && gameState.stars.includes(intersectedObject as CelestialBody)) {
                focusOnStar(intersectedObject as CelestialBody);
            }
        }
    });

    const creationMapping: { [key: string]: { type: string, cost: number } } = {
        createAsteroidButton: { type: 'asteroid', cost: 100 },
        createCometButton: { type: 'comet', cost: 500 },
        createMoonButton: { type: 'moon', cost: 1000 },
        createDwarfPlanetButton: { type: 'dwarfPlanet', cost: 2500 },
        createPlanetButton: { type: 'planet', cost: 10000 },
    };

    for (const [buttonId, { type, cost }] of Object.entries(creationMapping)) {
        const button = ui[buttonId];
        if (!button) continue;

        let creationTimeout: any = null;
        let creationCount = 0;
        let isCreating = false;

        const stopCreation = () => {
            if (isCreating) {
                isCreating = false;
                clearTimeout(creationTimeout);
                creationTimeout = null;
            }
        };

        const createAction = () => {
            if (!isCreating) return;

            const focusedObject = gameState.focusedObject;
            if (!focusedObject || focusedObject.userData.type !== 'star') {
                if (creationCount === 0) { 
                    showMessage('まず、親となる恒星をクリックして選択してください。');
                }
                stopCreation();
                return;
            }
            if (gameState.cosmicDust < cost) {
                if (creationCount === 0) {
                    showMessage('宇宙の塵が足りません。');
                }
                stopCreation();
                return;
            }

            gameStateManager.updateState(state => ({
                ...state,
                cosmicDust: state.cosmicDust - cost,
                resources: {
                    ...state.resources,
                    cosmicDust: state.resources.cosmicDust - cost
                }
            }));
            // Use actual radius from userData instead of visual scale
            const parentRadius = focusedObject.userData.radius || 1;
            const minSafeDistance = parentRadius * 3; // At least 3x parent radius for safety
            const maxOrbitalRange = parentRadius * 8; // Up to 8x parent radius
            const orbitalRadius = parentRadius + minSafeDistance + Math.random() * maxOrbitalRange;
            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3(orbitalRadius * Math.cos(angle), (Math.random() - 0.5) * 20, orbitalRadius * Math.sin(angle));
            const finalPosition = focusedObject.position.clone().add(position);
            
            // Check for collisions with existing bodies
            let attempts = 0;
            let tooClose = true;
            while (tooClose && attempts < 10) {
                tooClose = false;
                for (const existingBody of gameState.stars) {
                    if (existingBody === focusedObject) continue;
                    
                    const distance = finalPosition.distanceTo(existingBody.position);
                    const existingRadius = existingBody.userData.radius || 1;
                    const newBodyRadius = 5; // Estimated radius for new small body
                    const safetyMargin = (existingRadius + newBodyRadius) * 2; // 2x safety margin
                    
                    if (distance < safetyMargin) {
                        tooClose = true;
                        // Try a new position
                        const newAngle = Math.random() * Math.PI * 2;
                        const newOrbitalRadius = parentRadius + minSafeDistance + Math.random() * maxOrbitalRange;
                        position.set(
                            newOrbitalRadius * Math.cos(newAngle), 
                            (Math.random() - 0.5) * 20, 
                            newOrbitalRadius * Math.sin(newAngle)
                        );
                        finalPosition.copy(focusedObject.position).add(position);
                        break;
                    }
                }
                attempts++;
            }
            
            if (tooClose) {
                console.warn(`[Creation Warning] Could not find safe position for ${type} after ${attempts} attempts`);
                showMessage(`${type}の安全な配置場所が見つかりませんでした`);
                return;
            }
            
            if (orbitalRadius <= 0) {
                console.error(`[Creation Error] Invalid orbitalRadius (${orbitalRadius}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const gameScaleFactor = 0.15; // 接線速度を1.5倍に増加
            const orbitalSpeed = Math.sqrt((gameState.physics.G * (focusedObject.userData as StarUserData).mass) / orbitalRadius) * gameScaleFactor;

            if (!isFinite(orbitalSpeed)) {
                console.error(`[Creation Error] Calculated orbitalSpeed is not finite (${orbitalSpeed}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const relativeVelocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
            const finalVelocity = (focusedObject.userData.velocity as THREE.Vector3).clone().add(relativeVelocity);
            // finalPosition already calculated above after collision checking
            
            if (!isFinite(finalPosition.x) || !isFinite(finalVelocity.x)) {
                 console.error(`[Creation Error] Final position or velocity is not finite. Skipping creation.`);
                 stopCreation();
                 return;
            }

            const newBody = createCelestialBody(type, {
                position: finalPosition,
                velocity: finalVelocity,
                parent: focusedObject
            });
            gameStateManager.updateState(state => ({
                ...state,
                stars: [...state.stars, newBody]
            }));
            scene.add(newBody);
            
            // If a black hole was created, initialize the gas effect
            if (type === 'black_hole' && newBody instanceof THREE.Mesh) {
                blackHoleGas.setBlackHole(newBody);
            }
            
            // サウンドエフェクトの再生
            soundManager.createCelestialBodySound(type, finalPosition);
            
            const typeNames: { [key: string]: string } = {
                'asteroid': '小惑星',
                'comet': '彗星',
                'moon': '衛星',
                'dwarfPlanet': '準惑星',
                'planet': '惑星'
            };
            const bodyName = newBody.userData.name || typeNames[type] || type;
            const parentName = focusedObject.userData.name || '恒星';
            addTimelineLog(`${bodyName}が${parentName}の周囲に誕生しました`, 'creation');
            
            saveGame();

            creationCount++;

            let nextDelay;
            if (creationCount <= 2) nextDelay = 500;
            else if (creationCount <= 5) nextDelay = 250;
            else if (creationCount <= 10) nextDelay = 100;
            else nextDelay = 50;

            creationTimeout = setTimeout(createAction, nextDelay);
        };

        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
            if (isCreating) return;
            isCreating = true;
            creationCount = 0;
            createAction();
        });

        button.addEventListener('mouseup', stopCreation);
        button.addEventListener('mouseleave', stopCreation);
    }
    
    const createStarAction = (starName: string | null = null) => {
        const cost = 100000;
        if (gameState.cosmicDust < cost) {
            showMessage('宇宙の塵が足りません。');
            return false;
        }
        
        const name = starName || `恒星-${gameState.stars.filter(s => s.userData.type === 'star').length + 1}`;
        
        gameStateManager.updateState(state => ({
            ...state,
            cosmicDust: state.cosmicDust - cost,
            resources: {
                ...state.resources,
                cosmicDust: state.resources.cosmicDust - cost
            }
        }));
        const radius = 7000 + Math.random() * 18000;  // 7000-25000 game units (70-250 AU)
        const angle = Math.random() * Math.PI * 2;
        const position = new THREE.Vector3(radius * Math.cos(angle), (Math.random() - 0.5) * 100, radius * Math.sin(angle));
        const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
        const blackHoleMass = blackHole ? (blackHole.userData.mass as number) : 1e7;
        const speedMultiplier = 1.0; // デフォルト値を使用
        const G = physicsConfig.getPhysics().G;
        const gameScaleFactor = 0.95; // 楕円軌道のために少し遅く
        const orbitalSpeed = Math.sqrt((G * blackHoleMass) / radius) * speedMultiplier * gameScaleFactor;
        const velocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
        
        
        const newStar = createCelestialBody('star', { name, position, velocity });
        gameStateManager.updateState(state => ({
            ...state,
            stars: [...state.stars, newStar]
        }));
        scene.add(newStar);
        
        
        focusOnStar(newStar);
        
        // 恒星作成サウンドの再生
        soundManager.createCelestialBodySound('star', position);
        
        addTimelineLog(`恒星「${name}」が銀河に誕生しました`, 'creation');
        
        saveGame();
        return true;
    };

    let isCreatingStars = false;
    let starCreationInterval: any = null;
    let starCreationCount = 0;

    if (ui.createStarButton) {
        ui.createStarButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (isCreatingStars) return;
            isCreatingStars = true;
            starCreationCount = 0;

            const firstStarName = prompt('最初の恒星の名前を入力してください:', '輝く星');
            if (!firstStarName) {
                isCreatingStars = false;
                return;
            }

            if (createStarAction(firstStarName)) {
                starCreationCount++;

                starCreationInterval = setTimeout(() => {
                    const continuousCreation = () => {
                        if (!isCreatingStars) return;

                        if (createStarAction()) {
                            starCreationCount++;

                            let delay;
                            if (starCreationCount <= 2) delay = 800;
                            else if (starCreationCount <= 4) delay = 600;
                            else if (starCreationCount <= 7) delay = 400;
                            else if (starCreationCount <= 11) delay = 250;
                            else if (starCreationCount <= 16) delay = 150;
                            else delay = 100;

                            starCreationInterval = setTimeout(continuousCreation, delay);
                        } else {
                            stopStarCreation();
                        }
                    };
                    continuousCreation();
                }, 500);
            } else {
                isCreatingStars = false;
            }
        });
    }

    const stopStarCreation = () => {
        if (isCreatingStars) {
            isCreatingStars = false;
            if (starCreationInterval) {
                clearTimeout(starCreationInterval);
                starCreationInterval = null;
            }
        }
    };

    if (ui.createStarButton) {
        ui.createStarButton.addEventListener('mouseup', stopStarCreation);
        ui.createStarButton.addEventListener('mouseleave', stopStarCreation);
    }
    document.addEventListener('mouseup', stopStarCreation);

    if (ui.upgradeDustButton) {
        ui.upgradeDustButton.addEventListener('mousedown', () => {
            let upgradeTimeout: any;
            let upgradeCount = 0;

            const upgradeAction = () => {
                const cost = mathCache.getDustUpgradeCost();
                if (gameState.energy >= cost) {
                    gameStateManager.updateState(state => ({
                        ...state,
                        energy: state.energy - cost,
                        dustUpgradeLevel: state.dustUpgradeLevel + 1,
                        resources: {
                            ...state.resources,
                            energy: state.resources.energy - cost
                        }
                    }));
                    updateUI();
                    saveGame();
                    soundManager.playUISound('success');
                    upgradeCount++;

                    let nextDelay;
                    if (upgradeCount <= 3) nextDelay = 500;
                    else if (upgradeCount <= 8) nextDelay = 100;
                    else if (upgradeCount <= 18) nextDelay = 50;
                    else nextDelay = 10;
                    
                    upgradeTimeout = setTimeout(upgradeAction, nextDelay);
                } else {
                    clearTimeout(upgradeTimeout);
                }
            };

            upgradeAction();

            const clearUpgrade = () => clearTimeout(upgradeTimeout);
            if (ui.upgradeDustButton) {
                ui.upgradeDustButton.addEventListener('mouseup', clearUpgrade, { once: true });
                ui.upgradeDustButton.addEventListener('mouseleave', clearUpgrade, { once: true });
            }
        });
    }

    if (ui.upgradeDarkMatterConverterButton) {
        ui.upgradeDarkMatterConverterButton.addEventListener('mousedown', () => {
            let upgradeTimeout: any;
            let upgradeCount = 0;

            const upgradeAction = () => {
                const cost = mathCache.getConverterCost();
                if (gameState.energy >= cost) {
                    gameStateManager.updateState(state => ({
                        ...state,
                        energy: state.energy - cost,
                        darkMatterConverterLevel: state.darkMatterConverterLevel + 1,
                        darkMatter: state.darkMatter + 1,
                        resources: {
                            ...state.resources,
                            energy: state.resources.energy - cost,
                            darkMatter: state.resources.darkMatter + 1
                        }
                    }));
                    updateUI();
                    saveGame();
                    soundManager.playUISound('success');
                    upgradeCount++;

                    let nextDelay;
                    if (upgradeCount <= 3) nextDelay = 500;
                    else if (upgradeCount <= 8) nextDelay = 100;
                    else if (upgradeCount <= 18) nextDelay = 50;
                    else nextDelay = 10;

                    upgradeTimeout = setTimeout(upgradeAction, nextDelay);
                } else {
                    clearTimeout(upgradeTimeout);
                }
            };

            upgradeAction();

            const clearUpgrade = () => clearTimeout(upgradeTimeout);
            if (ui.upgradeDarkMatterConverterButton) {
                ui.upgradeDarkMatterConverterButton.addEventListener('mouseup', clearUpgrade, { once: true });
                ui.upgradeDarkMatterConverterButton.addEventListener('mouseleave', clearUpgrade, { once: true });
            }
        });
    }

    if (ui.researchEnhancedDustButton) {
        ui.researchEnhancedDustButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.researchEnhancedDust) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - 1,
                    researchEnhancedDust: true,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - 1
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchAdvancedEnergyButton) {
        ui.researchAdvancedEnergyButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.researchAdvancedEnergy) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - 2,
                    researchAdvancedEnergy: true,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - 2
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchMoonButton) {
        ui.researchMoonButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.unlockedCelestialBodies.moon) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - 1,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - 1
                    },
                    unlockedCelestialBodies: {
                        ...state.unlockedCelestialBodies,
                        moon: true
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchDwarfPlanetButton) {
        ui.researchDwarfPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.unlockedCelestialBodies.dwarfPlanet) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - 2,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - 2
                    },
                    unlockedCelestialBodies: {
                        ...state.unlockedCelestialBodies,
                        dwarfPlanet: true
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchPlanetButton) {
        ui.researchPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 3 && !gameState.unlockedCelestialBodies.planet) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - 3,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - 3
                    },
                    unlockedCelestialBodies: {
                        ...state.unlockedCelestialBodies,
                        planet: true
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchStarButton) {
        ui.researchStarButton.addEventListener('click', () => {
            const cost = 5;
            if (gameState.darkMatter >= cost && !gameState.unlockedCelestialBodies.star) {
                gameStateManager.updateState(state => ({
                    ...state,
                    darkMatter: state.darkMatter - cost,
                    resources: {
                        ...state.resources,
                        darkMatter: state.resources.darkMatter - cost
                    },
                    unlockedCelestialBodies: {
                        ...state.unlockedCelestialBodies,
                        star: true
                    }
                }));
                updateUI();
                saveGame();
            }
        });
    }


    if (ui.addAllResourcesButton) {
        ui.addAllResourcesButton.addEventListener('click', () => {
            gameStateManager.updateState(state => ({
                ...state,
                cosmicDust: state.cosmicDust + 100000000,
                energy: state.energy + 1000000,
                darkMatter: state.darkMatter + 10,
                organicMatter: state.organicMatter + 10000,
                biomass: state.biomass + 5000,
                thoughtPoints: state.thoughtPoints + 1000,
                resources: {
                    cosmicDust: state.resources.cosmicDust + 100000000,
                    energy: state.resources.energy + 1000000,
                    darkMatter: state.resources.darkMatter + 10,
                    organicMatter: state.resources.organicMatter + 10000,
                    biomass: state.resources.biomass + 5000,
                    thoughtPoints: state.resources.thoughtPoints + 1000
                }
            }));
            updateUI();
            showMessage('全リソースを追加しました。');
        });
    }

    const testCollisionButton = document.getElementById('testCollisionButton');
    if (testCollisionButton) {
        testCollisionButton.addEventListener('click', () => {
            console.log('🔧 衝突テスト開始');
            console.log(`衝突システム有効: ${gameState.physics.collisionDetectionEnabled}`);
            console.log(`現在の天体数: ${gameState.stars.length}`);
            
            // 近くにある天体のペアを表示
            for (let i = 0; i < gameState.stars.length; i++) {
                for (let j = i + 1; j < gameState.stars.length; j++) {
                    const body1 = gameState.stars[i];
                    const body2 = gameState.stars[j];
                    const distance = body1.position.distanceTo(body2.position);
                    const combinedRadius = (body1.userData.radius || 1) + (body2.userData.radius || 1);
                    
                    if (distance < combinedRadius * 2) {
                        console.log(`⚠️ 近接ペア: ${body1.userData.name} と ${body2.userData.name}`);
                        console.log(`   距離: ${distance.toFixed(2)}, 合計半径: ${combinedRadius.toFixed(2)}`);
                        console.log(`   質量: ${body1.userData.mass} vs ${body2.userData.mass}`);
                    }
                }
            }
            
            showMessage('衝突テスト実行完了（コンソールを確認）');
        });
    }

    // === Graphics Settings Event Handlers === //
    
    // Legacy graphics quality select (backward compatibility)
    if (ui.graphicsQualitySelect) {
        ui.graphicsQualitySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const preset = target.value === 'low' ? 'low' : 
                         target.value === 'high' ? 'high' : 'medium';
            gameStateManager.updateState(state => ({
                ...state,
                graphicsQuality: target.value,
                graphics: {
                    ...state.graphics,
                    preset: preset
                }
            }));
            saveGame();
        });
    }
    
    // Graphics preset selection
    if (ui.graphicsPresetSelect) {
        ui.graphicsPresetSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const presetName = target.value;
            
            if (presetName !== 'custom') {
                // Apply preset using graphics engine
                graphicsEngine.applyPreset(presetName as any);
                console.log(`🎨 Graphics preset applied: ${presetName}`);
                
                // Update UI to reflect preset changes
                import('./ui.js').then(({ updateGraphicsUI }) => {
                    updateGraphicsUI();
                });
            }
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    preset: presetName
                }
            }));
            saveGame();
        });
    }
    
    // Resolution scale select
    console.log('[Events] Checking resolutionScaleRange:', ui.resolutionScaleRange);
    if (ui.resolutionScaleRange) {
        console.log('[Events] Adding event listener to resolution scale select');
        ui.resolutionScaleRange.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const scalePercent = parseInt(target.value);
            const scale = scalePercent / 100;
            
            console.log(`[Events] Resolution scale slider changed: ${scalePercent}% (${scale})`);
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    resolutionScale: scale,
                    preset: 'custom'
                }
            }));
            
            console.log(`[Events] Updated gameState.graphics.resolutionScale to: ${gameState.graphics.resolutionScale}`);
            
            // Update display value
            if (ui.resolutionScaleValue) {
                ui.resolutionScaleValue.textContent = `${scalePercent}%`;
            }
            
            // Update preset selector to show custom
            if (ui.graphicsPresetSelect) {
                (ui.graphicsPresetSelect as HTMLSelectElement).value = 'custom';
            }
            
            saveGame();
        });
    }
    
    // Particle density select (desktop)
    const particleDensitySelect = document.getElementById('particleDensitySelect') as HTMLSelectElement;
    if (particleDensitySelect) {
        console.log('[EVENTS] Particle density select found, adding listener');
        particleDensitySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const densityPercent = parseInt(target.value);
            const density = densityPercent / 100;
            
            console.log('[EVENTS] Particle density changed:', densityPercent + '%', 'density:', density);
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    particleDensity: density,
                    preset: 'custom'
                }
            }));
            
            // Update preset selector to show custom
            if (ui.graphicsPresetSelect) {
                (ui.graphicsPresetSelect as HTMLSelectElement).value = 'custom';
            }
            
            console.log('[EVENTS] Calling graphicsEngine.applyAllSettings()');
            graphicsEngine.applyAllSettings();
            saveGame();
        });
    } else {
        console.warn('[EVENTS] Particle density select NOT found!');
    }
    
    // Individual graphics setting selects
    const graphicsSelects = [
        { element: ui.textureQualitySelect, property: 'textureQuality' },
        { element: ui.shadowQualitySelect, property: 'shadowQuality' },
        { element: ui.antiAliasingSelect, property: 'antiAliasing' },
        { element: ui.postProcessingSelect, property: 'postProcessing' },
        { element: ui.viewDistanceSelect, property: 'viewDistance' },
        { element: ui.lightingQualitySelect, property: 'lightingQuality' },
        { element: ui.fogEffectSelect, property: 'fogEffect' },
        { element: ui.objectDetailSelect, property: 'objectDetail' },
        { element: ui.backgroundDetailSelect, property: 'backgroundDetail' },
        { element: ui.uiAnimationsSelect, property: 'uiAnimations' }
    ];
    
    graphicsSelects.forEach(({ element, property }) => {
        if (element) {
            element.addEventListener('change', (event) => {
                const target = event.target as HTMLSelectElement;
                gameStateManager.updateState(state => ({
                    ...state,
                    graphics: {
                        ...state.graphics,
                        [property]: target.value,
                        preset: 'custom'
                    }
                }));
                
                // Update preset selector to show custom
                if (ui.graphicsPresetSelect) {
                    (ui.graphicsPresetSelect as HTMLSelectElement).value = 'custom';
                }
                
                saveGame();
            });
        }
    });
    
    // Background galaxy select (desktop)
    const backgroundGalaxySelect = document.getElementById('backgroundGalaxySelect') as HTMLSelectElement;
    if (backgroundGalaxySelect) {
        backgroundGalaxySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const mode = target.value as 'none' | 'skybox' | 'sprites' | 'mixed';
            backgroundGalaxies.setDisplayMode(mode);
            console.log('[EVENTS] Background galaxy mode changed to:', mode);
        });
    }
    
    // Background galaxy select (mobile)
    const mobileBackgroundGalaxySelect = document.getElementById('mobile-backgroundGalaxySelect') as HTMLSelectElement;
    if (mobileBackgroundGalaxySelect) {
        mobileBackgroundGalaxySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const mode = target.value as 'none' | 'skybox' | 'sprites' | 'mixed';
            backgroundGalaxies.setDisplayMode(mode);
            console.log('[EVENTS] Background galaxy mode changed to:', mode);
        });
    }
    
    // Frame rate limit select
    if (ui.frameRateLimitSelect) {
        ui.frameRateLimitSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const newFrameRate = parseInt(target.value);
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    frameRateLimit: newFrameRate,
                    preset: 'custom'
                }
            }));
            
            // Update graphics engine frame rate limiter
            graphicsEngine.getFrameRateLimiter().setTargetFPS(newFrameRate);
            console.log(`🎯 Frame rate changed to: ${gameState.graphics.frameRateLimit} FPS`);
            
            // Update preset selector to show custom
            if (ui.graphicsPresetSelect) {
                (ui.graphicsPresetSelect as HTMLSelectElement).value = 'custom';
            }
            
            saveGame();
        });
    }
    
    // Dynamic quality adjustment checkbox
    if (ui.dynamicQualityCheckbox) {
        ui.dynamicQualityCheckbox.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            const enabled = target.checked;
            
            // Enable/disable dynamic quality in graphics engine
            graphicsEngine.enableDynamicQuality(enabled);
            
            saveGame();
        });
    }
    
    // Reset graphics button
    if (ui.resetGraphicsButton) {
        ui.resetGraphicsButton.addEventListener('click', () => {
            import('./ui.js').then(({ resetGraphicsToDefaults }) => {
                resetGraphicsToDefaults();
                
                // Apply the reset settings through graphics engine
                graphicsEngine.applyAllSettings();
                
                saveGame();
                showMessage('グラフィック設定をリセットしました');
            });
        });
    }
    
    // Mobile graphics settings
    // Mobile resolution scale select
    if (ui.mobileResolutionScaleSelect) {
        ui.mobileResolutionScaleSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const scalePercent = parseInt(target.value);
            const scale = scalePercent / 100;
            
            console.log(`[Events] Mobile resolution scale changed: ${scalePercent}% (${scale})`);
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    resolutionScale: scale
                }
            }));
            
            saveGame();
        });
    }
    
    // Mobile particle density select
    if (ui.mobileParticleDensitySelect) {
        ui.mobileParticleDensitySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const densityPercent = parseInt(target.value);
            const density = densityPercent / 100;
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    particleDensity: density,
                    preset: 'custom'
                }
            }));
            
            graphicsEngine.applyAllSettings();
            saveGame();
        });
    }
    
    // Mobile frame rate limit select
    if (ui.mobileFrameRateLimitSelect) {
        ui.mobileFrameRateLimitSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const newFrameRate = parseInt(target.value);
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    frameRateLimit: newFrameRate
                }
            }));
            
            // Update graphics engine frame rate limiter
            graphicsEngine.getFrameRateLimiter().setTargetFPS(newFrameRate);
            console.log(`[Mobile] Frame rate changed to: ${newFrameRate} FPS`);
            
            saveGame();
        });
    }
    
    // Mobile post processing select
    if (ui.mobilePostProcessingSelect) {
        ui.mobilePostProcessingSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const postProcessingLevel = target.value;
            
            gameStateManager.updateState(state => ({
                ...state,
                graphics: {
                    ...state.graphics,
                    postProcessing: postProcessingLevel
                }
            }));
            
            saveGame();
        });
    }
    
    // Mobile set default graphics button
    if (ui.mobileSetDefaultGraphicsButton) {
        ui.mobileSetDefaultGraphicsButton.addEventListener('click', () => {
            // Apply mobile-optimized graphics preset
            graphicsEngine.applyPreset('low');
            console.log('[Mobile] Applied mobile-optimized graphics preset');
            
            // Update UI to reflect changes
            if (ui.mobileResolutionScaleSelect) {
                (ui.mobileResolutionScaleSelect as HTMLSelectElement).value = '50';
            }
            if (ui.mobileParticleDensitySelect) {
                (ui.mobileParticleDensitySelect as HTMLSelectElement).value = '25';
            }
            if (ui.mobileFrameRateLimitSelect) {
                (ui.mobileFrameRateLimitSelect as HTMLSelectElement).value = '30';
            }
            if (ui.mobilePostProcessingSelect) {
                (ui.mobilePostProcessingSelect as HTMLSelectElement).value = 'low';
            }
            
            saveGame();
            showMessage('モバイル向けグラフィック設定を適用しました');
        });
    }
    
    // Collapsible sections for graphics settings
    if (ui.graphicsHeader) {
        ui.graphicsHeader.addEventListener('click', () => {
            if (ui.graphicsContent) {
                ui.graphicsContent.classList.toggle('expanded');
            }
        });
    }
    
    if (ui.generalSettingsHeader) {
        ui.generalSettingsHeader.addEventListener('click', () => {
            if (ui.generalSettingsContent) {
                ui.generalSettingsContent.classList.toggle('expanded');
            }
        });
    }
    
    // LOD performance mode select
    if (ui.lodPerformanceModeSelect) {
        ui.lodPerformanceModeSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const mode = target.value as 'ultra' | 'high' | 'balanced' | 'performance';
            
            // Get LOD manager instance from window
            const lodManager = (window as any).lodManager;
            if (lodManager) {
                lodManager.setPerformanceMode(mode);
                console.log('[EVENTS] LOD performance mode changed to:', mode);
            }
            
            saveGame();
        });
    }
    
    // LOD distance scale range
    if (ui.lodDistanceScaleRange) {
        ui.lodDistanceScaleRange.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            const scale = parseFloat(target.value);
            
            // Update display value
            if (ui.lodDistanceScaleValue) {
                ui.lodDistanceScaleValue.textContent = `${scale.toFixed(1)}x`;
            }
            
            // TODO: Apply distance scale to LOD manager
            console.log('[EVENTS] LOD distance scale changed to:', scale);
            
            saveGame();
        });
    }

    if (ui.unitSystemSelect) {
        ui.unitSystemSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            gameStateManager.updateState(state => ({
                ...state,
                currentUnitSystem: target.value
            }));
            saveGame();
            updateUI();
        });
    }

    const collisionDetectionCheckbox = document.getElementById('collisionDetectionCheckbox') as HTMLInputElement;
    if (collisionDetectionCheckbox) {
        collisionDetectionCheckbox.addEventListener('change', () => {
            gameStateManager.updateState(state => ({
                ...state,
                physics: {
                    ...state.physics,
                    collisionDetectionEnabled: collisionDetectionCheckbox.checked
                }
            }));
            saveGame();
            showMessage(collisionDetectionCheckbox.checked ? '天体衝突システムが有効になりました' : '天体衝突システムが無効になりました');
            soundManager.playUISound('click');
        });
    }

    // Orbit trail toggle button
    const orbitTrailToggleButton = document.getElementById('orbitTrailToggle');
    if (orbitTrailToggleButton) {
        orbitTrailToggleButton.addEventListener('click', () => {
            import('./orbitTrails.js').then(({ orbitTrailSystem }) => {
                const isEnabled = orbitTrailSystem.toggle();
                orbitTrailToggleButton.textContent = isEnabled ? 'オン' : 'オフ';
                orbitTrailToggleButton.classList.toggle('active', isEnabled);
                showMessage(isEnabled ? '軌道トレイル表示を有効にしました' : '軌道トレイル表示を無効にしました');
                soundManager.playUISound('click');
            });
        });
    }

    // Orbit trail length slider
    const orbitTrailLengthSlider = document.getElementById('orbitTrailLengthSlider') as HTMLInputElement;
    const orbitTrailLengthValue = document.getElementById('orbitTrailLengthValue');
    if (orbitTrailLengthSlider && orbitTrailLengthValue) {
        orbitTrailLengthSlider.addEventListener('input', () => {
            const value = parseInt(orbitTrailLengthSlider.value);
            orbitTrailLengthValue.textContent = value.toString();
            import('./orbitTrails.js').then(({ orbitTrailSystem }) => {
                orbitTrailSystem.setMaxPoints(value);
            });
        });
    }

    // Orbit trail type filters
    const typeCheckboxes = [
        { id: 'trailTypeBlackHole', type: 'black_hole' },
        { id: 'trailTypeStar', type: 'star' },
        { id: 'trailTypePlanet', type: 'planet' },
        { id: 'trailTypeMoon', type: 'moon' },
        { id: 'trailTypeAsteroid', type: 'asteroid' },
        { id: 'trailTypeComet', type: 'comet' }
    ];

    typeCheckboxes.forEach(({ id, type }) => {
        const checkbox = document.getElementById(id) as HTMLInputElement;
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                import('./orbitTrails.js').then(({ orbitTrailSystem }) => {
                    orbitTrailSystem.toggleType(type);
                    soundManager.playUISound('click');
                });
            });
        }
    });

    if (ui.resetGameButton) {
        ui.resetGameButton.addEventListener('click', () => {
            if (confirm('本当にすべての進行状況をリセットしますか？')) {
                localStorage.removeItem('cosmicGardenerState');
                location.reload();
            }
        });
    }

    // サウンド設定のイベントリスナー
    const masterVolumeSlider = document.getElementById('masterVolumeSlider') as HTMLInputElement;
    const masterVolumeValue = document.getElementById('masterVolumeValue');
    const ambientVolumeSlider = document.getElementById('ambientVolumeSlider') as HTMLInputElement;
    const ambientVolumeValue = document.getElementById('ambientVolumeValue');
    const effectsVolumeSlider = document.getElementById('effectsVolumeSlider') as HTMLInputElement;
    const effectsVolumeValue = document.getElementById('effectsVolumeValue');
    const uiVolumeSlider = document.getElementById('uiVolumeSlider') as HTMLInputElement;
    const uiVolumeValue = document.getElementById('uiVolumeValue');
    const spatialAudioCheckbox = document.getElementById('spatialAudioCheckbox') as HTMLInputElement;
    const muteToggleButton = document.getElementById('muteToggleButton');

    if (masterVolumeSlider && masterVolumeValue) {
        masterVolumeSlider.addEventListener('input', () => {
            const value = parseFloat(masterVolumeSlider.value) / 100;
            masterVolumeValue.textContent = masterVolumeSlider.value;
            soundManager.updateSettings({ masterVolume: value });
            soundManager.playUISound('click');
        });
    }

    if (ambientVolumeSlider && ambientVolumeValue) {
        ambientVolumeSlider.addEventListener('input', () => {
            const value = parseFloat(ambientVolumeSlider.value) / 100;
            ambientVolumeValue.textContent = ambientVolumeSlider.value;
            soundManager.updateSettings({ ambientVolume: value });
        });
    }

    if (effectsVolumeSlider && effectsVolumeValue) {
        effectsVolumeSlider.addEventListener('input', () => {
            const value = parseFloat(effectsVolumeSlider.value) / 100;
            effectsVolumeValue.textContent = effectsVolumeSlider.value;
            soundManager.updateSettings({ effectsVolume: value });
        });
    }

    if (uiVolumeSlider && uiVolumeValue) {
        uiVolumeSlider.addEventListener('input', () => {
            const value = parseFloat(uiVolumeSlider.value) / 100;
            uiVolumeValue.textContent = uiVolumeSlider.value;
            soundManager.updateSettings({ uiVolume: value });
            soundManager.playUISound('click');
        });
    }

    if (spatialAudioCheckbox) {
        spatialAudioCheckbox.addEventListener('change', () => {
            soundManager.updateSettings({ spatialAudio: spatialAudioCheckbox.checked });
            soundManager.playUISound('click');
        });
    }

    if (muteToggleButton) {
        muteToggleButton.addEventListener('click', () => {
            const settings = soundManager.getSettings();
            soundManager.updateSettings({ muted: !settings.muted });
            muteToggleButton.textContent = settings.muted ? 'ミュート解除' : 'ミュート';
            soundManager.playUISound('click');
        });
    }
    
    // Production chain button
    const productionChainButton = document.getElementById('productionChainButton');
    if (productionChainButton) {
        productionChainButton.addEventListener('click', () => {
            import('./productionChainUI.js').then(module => {
                module.productionChainUI.toggle();
                soundManager.playUISound('click');
            });
        });
    }

    // サウンド設定の初期化
    const settings = soundManager.getSettings();
    if (masterVolumeSlider && masterVolumeValue) {
        masterVolumeSlider.value = String(settings.masterVolume * 100);
        masterVolumeValue.textContent = String(Math.round(settings.masterVolume * 100));
    }
    if (ambientVolumeSlider && ambientVolumeValue) {
        ambientVolumeSlider.value = String(settings.ambientVolume * 100);
        ambientVolumeValue.textContent = String(Math.round(settings.ambientVolume * 100));
    }
    if (effectsVolumeSlider && effectsVolumeValue) {
        effectsVolumeSlider.value = String(settings.effectsVolume * 100);
        effectsVolumeValue.textContent = String(Math.round(settings.effectsVolume * 100));
    }
    if (uiVolumeSlider && uiVolumeValue) {
        uiVolumeSlider.value = String(settings.uiVolume * 100);
        uiVolumeValue.textContent = String(Math.round(settings.uiVolume * 100));
    }
    if (spatialAudioCheckbox) {
        spatialAudioCheckbox.checked = settings.spatialAudio;
    }
    if (muteToggleButton) {
        muteToggleButton.textContent = settings.muted ? 'ミュート解除' : 'ミュート';
    }

    // サウンドテストボタン
    const testSoundButton = document.getElementById('testSoundButton');
    if (testSoundButton) {
        testSoundButton.addEventListener('click', async () => {
            // サウンドシステムの初期化
            if (!soundManager.initialized) {
                await soundManager.init();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 各種テスト音を順番に再生
            soundManager.playTestTone();
            
            setTimeout(() => {
                soundManager.playUISound('click');
            }, 700);
            
            setTimeout(() => {
                soundManager.createCelestialBodySound('asteroid');
            }, 1400);
            
            setTimeout(() => {
                soundManager.playUISound('success');
            }, 2100);
            
            showMessage('サウンドテストを実行しました');
        });
    }

    // Time acceleration event handlers
    const timeMultiplierSelect = document.getElementById('timeMultiplierSelect') as HTMLSelectElement;
    const timeMultiplier2xButton = document.getElementById('timeMultiplier2xButton') as HTMLButtonElement;
    const timeMultiplier5xButton = document.getElementById('timeMultiplier5xButton') as HTMLButtonElement;
    const timeMultiplier10xButton = document.getElementById('timeMultiplier10xButton') as HTMLButtonElement;
    
    if (timeMultiplierSelect) {
        timeMultiplierSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            const selectedMultiplier = target.value + 'x';
            if (gameState.unlockedTimeMultipliers[selectedMultiplier] || selectedMultiplier === '1x') {
                gameStateManager.updateState(state => ({
                    ...state,
                    currentTimeMultiplier: selectedMultiplier
                }));
                saveGame();
                updateUI();
                showMessage(`時間倍率を${selectedMultiplier}に設定しました`);
            }
        });
    }
    
    if (timeMultiplier2xButton) {
        timeMultiplier2xButton.addEventListener('click', () => {
            const cost = gameState.timeMultiplierCosts['2x'];
            if (gameState.thoughtPoints >= cost && !gameState.unlockedTimeMultipliers['2x']) {
                gameStateManager.updateState(state => ({
                    ...state,
                    thoughtPoints: state.thoughtPoints - cost,
                    resources: {
                        ...state.resources,
                        thoughtPoints: state.resources.thoughtPoints - cost
                    },
                    unlockedTimeMultipliers: {
                        ...state.unlockedTimeMultipliers,
                        '2x': true
                    }
                }));
                updateUI();
                saveGame();
                showMessage('2x時間加速をアンロックしました！');
            }
        });
    }
    
    if (timeMultiplier5xButton) {
        timeMultiplier5xButton.addEventListener('click', () => {
            const cost = gameState.timeMultiplierCosts['5x'];
            if (gameState.thoughtPoints >= cost && !gameState.unlockedTimeMultipliers['5x']) {
                gameStateManager.updateState(state => ({
                    ...state,
                    thoughtPoints: state.thoughtPoints - cost,
                    resources: {
                        ...state.resources,
                        thoughtPoints: state.resources.thoughtPoints - cost
                    },
                    unlockedTimeMultipliers: {
                        ...state.unlockedTimeMultipliers,
                        '5x': true
                    }
                }));
                updateUI();
                saveGame();
                showMessage('5x時間加速をアンロックしました！');
            }
        });
    }
    
    if (timeMultiplier10xButton) {
        timeMultiplier10xButton.addEventListener('click', () => {
            const cost = gameState.timeMultiplierCosts['10x'];
            if (gameState.thoughtPoints >= cost && !gameState.unlockedTimeMultipliers['10x']) {
                gameStateManager.updateState(state => ({
                    ...state,
                    thoughtPoints: state.thoughtPoints - cost,
                    resources: {
                        ...state.resources,
                        thoughtPoints: state.resources.thoughtPoints - cost
                    },
                    unlockedTimeMultipliers: {
                        ...state.unlockedTimeMultipliers,
                        '10x': true
                    }
                }));
                updateUI();
                saveGame();
                showMessage('10x時間加速をアンロックしました！');
            }
        });
    }

    // Camera reset button
    const resetCameraButton = document.getElementById('resetCameraButton') as HTMLButtonElement;
    if (resetCameraButton) {
        resetCameraButton.addEventListener('click', () => {
            // Import controls from threeSetup
            import('./threeSetup.js').then(({ camera, controls }) => {
                // Reset camera to default position
                camera.position.set(0, 0, 2000);
                controls.target.set(0, 0, 0);
                
                // Reset focused object
                gameStateManager.updateState(state => ({
                    ...state,
                    focusedObject: null
                }));
                
                // Update controls
                controls.update();
                
                showMessage('カメラ位置をリセットしました');
            });
        });
    }

    // Mobile sell UI event handlers
    setupMobileSellEventHandlers();
    
    const setupInfoPanel = createInfoPanel();
}

// Setup mobile sell event handlers
function setupMobileSellEventHandlers() {
    // Slider change handlers
    const sliders = [
        { slider: 'mobile-dust-slider', amount: 'mobile-dust-sell-amount', value: 'mobile-dust-sell-value', resource: 'cosmicDust', price: 1 },
        { slider: 'mobile-energy-slider', amount: 'mobile-energy-sell-amount', value: 'mobile-energy-sell-value', resource: 'energy', price: 10 },
        { slider: 'mobile-organic-slider', amount: 'mobile-organic-sell-amount', value: 'mobile-organic-sell-value', resource: 'organicMatter', price: 100 },
        { slider: 'mobile-biomass-slider', amount: 'mobile-biomass-sell-amount', value: 'mobile-biomass-sell-value', resource: 'biomass', price: 500 }
    ];
    
    sliders.forEach(({ slider, amount, value, resource, price }) => {
        const sliderElement = document.getElementById(slider) as HTMLInputElement;
        const amountElement = document.getElementById(amount);
        const valueElement = document.getElementById(value);
        
        if (sliderElement && amountElement && valueElement) {
            sliderElement.addEventListener('input', () => {
                const sellAmount = parseInt(sliderElement.value);
                amountElement.textContent = sellAmount.toLocaleString();
                valueElement.textContent = `${(sellAmount * price).toLocaleString()} CP`;
            });
        }
    });
    
    // Sell buttons
    const sellButtons = [
        { button: 'mobile-sell-dust', resource: 'cosmicDust', slider: 'mobile-dust-slider', price: 1 },
        { button: 'mobile-sell-energy', resource: 'energy', slider: 'mobile-energy-slider', price: 10 },
        { button: 'mobile-sell-organic', resource: 'organicMatter', slider: 'mobile-organic-slider', price: 100 },
        { button: 'mobile-sell-biomass', resource: 'biomass', slider: 'mobile-biomass-slider', price: 500 }
    ];
    
    sellButtons.forEach(({ button, resource, slider, price }) => {
        const buttonElement = document.getElementById(button);
        const sliderElement = document.getElementById(slider) as HTMLInputElement;
        
        if (buttonElement && sliderElement) {
            buttonElement.addEventListener('click', () => {
                const sellAmount = parseInt(sliderElement.value);
                if (sellAmount > 0 && gameState.resources[resource] >= sellAmount) {
                    // Sell resources
                    gameStateManager.updateState(state => ({
                        ...state,
                        resources: {
                            ...state.resources,
                            [resource]: state.resources[resource] - sellAmount
                        },
                        cosmicDust: state.cosmicDust + (sellAmount * price)
                    }));
                    
                    soundManager.playUISound('success');
                    showMessage(`${sellAmount.toLocaleString()} ${resource} を ${(sellAmount * price).toLocaleString()} CP で販売しました`);
                    
                    // Reset slider
                    sliderElement.value = '0';
                    sliderElement.dispatchEvent(new Event('input'));
                    
                    // Update UI
                    updateUI();
                    import('./ui.js').then(({ updateMobileSellUI }) => updateMobileSellUI());
                    
                    saveGame();
                }
            });
        }
    });
    
    // Sell all button
    const sellAllButton = document.getElementById('mobile-sell-all');
    if (sellAllButton) {
        sellAllButton.addEventListener('click', () => {
            let totalCP = 0;
            const prices = { cosmicDust: 1, energy: 10, organicMatter: 100, biomass: 500 };
            
            for (const [resource, price] of Object.entries(prices)) {
                const amount = gameState.resources[resource];
                if (amount > 0) {
                    totalCP += amount * price;
                }
            }
            
            if (totalCP > 0) {
                gameStateManager.updateState(state => ({
                    ...state,
                    resources: {
                        cosmicDust: 0,
                        energy: 0,
                        organicMatter: 0,
                        biomass: 0,
                        darkMatter: state.resources.darkMatter,
                        thoughtPoints: state.resources.thoughtPoints
                    },
                    cosmicDust: state.cosmicDust + totalCP
                }));
                
                soundManager.playUISound('success');
                showMessage(`すべての資源を ${totalCP.toLocaleString()} CP で販売しました`);
                
                updateUI();
                import('./ui.js').then(({ updateMobileSellUI }) => updateMobileSellUI());
                saveGame();
            }
        });
    }
    
    // Sell 50% button
    const sell50Button = document.getElementById('mobile-sell-50');
    if (sell50Button) {
        sell50Button.addEventListener('click', () => {
            let totalCP = 0;
            const prices = { cosmicDust: 1, energy: 10, organicMatter: 100, biomass: 500 };
            const newResources = { ...gameState.resources };
            
            for (const [resource, price] of Object.entries(prices)) {
                const amount = Math.floor(gameState.resources[resource] / 2);
                if (amount > 0) {
                    totalCP += amount * price;
                    newResources[resource] = gameState.resources[resource] - amount;
                }
            }
            
            if (totalCP > 0) {
                gameStateManager.updateState(state => ({
                    ...state,
                    resources: newResources,
                    cosmicDust: state.cosmicDust + totalCP
                }));
                
                soundManager.playUISound('success');
                showMessage(`資源の50%を ${totalCP.toLocaleString()} CP で販売しました`);
                
                updateUI();
                import('./ui.js').then(({ updateMobileSellUI }) => updateMobileSellUI());
                saveGame();
            }
        });
    }
}