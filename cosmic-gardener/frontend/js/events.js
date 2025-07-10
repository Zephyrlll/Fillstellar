import * as THREE from 'three';
import { scene, camera, renderer, composer } from './threeSetup.js';
import { gameState } from './state.js';
import { ui, switchTab, showMessage, updateUI, debouncedUpdateGalaxyMap, toggleProductionPanel, closeProductionPanel } from './ui.js';
import { saveGame } from './saveload.js';
import { createCelestialBody } from './celestialBody.js';
import { mathCache } from './utils.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
export const keys = { w: false, a: false, s: false, d: false };
function focusOnStar(star) {
    gameState.focusedObject = star;
    console.log("Focused on:", star.userData.name);
}
let eventListenersSetup = false;
function createInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.classList.add('info-panel', 'hidden');
    document.body.appendChild(panel);
    let currentTarget = null;
    function show(element, title, contentFn) {
        if (!element)
            return;
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
    function updatePosition(event) {
        if (!currentTarget)
            return;
        panel.style.left = `${event.clientX + 15}px`;
        panel.style.top = `${event.clientY + 15}px`;
    }
    return (elementId, title, contentFn) => {
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
    if (eventListenersSetup)
        return;
    eventListenersSetup = true;
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        debouncedUpdateGalaxyMap();
    });
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyW')
            keys.w = true;
        if (event.code === 'KeyA')
            keys.a = true;
        if (event.code === 'KeyS')
            keys.s = true;
        if (event.code === 'KeyD')
            keys.d = true;
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'KeyW')
            keys.w = false;
        if (event.code === 'KeyA')
            keys.a = false;
        if (event.code === 'KeyS')
            keys.s = false;
        if (event.code === 'KeyD')
            keys.d = false;
        if (event.code === 'KeyM') {
            gameState.isMapVisible = !gameState.isMapVisible;
            debouncedUpdateGalaxyMap();
        }
    });
    if (ui.gameTabButton)
        ui.gameTabButton.addEventListener('click', () => {
            soundManager.playUISound('tab');
            switchTab('game');
        });
    if (ui.researchTabButton)
        ui.researchTabButton.addEventListener('click', () => {
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
    if (ui.optionsTabButton)
        ui.optionsTabButton.addEventListener('click', () => {
            soundManager.playUISound('tab');
            switchTab('options');
        });
    if (ui.starManagementTabButton)
        ui.starManagementTabButton.addEventListener('click', () => {
            soundManager.playUISound('tab');
            switchTab('starManagement');
        });
    if (ui.closeOptionsButton)
        ui.closeOptionsButton.addEventListener('click', () => {
            soundManager.playUISound('click');
            switchTab('game');
        });
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = '';
                content.style.padding = '0 15px';
            }
            else {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.padding = '15px';
            }
        });
    });
    window.addEventListener('click', (event) => {
        if (ui.uiArea && ui.uiArea.contains(event.target))
            return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            while (intersectedObject && intersectedObject.parent && !gameState.stars.includes(intersectedObject)) {
                intersectedObject = intersectedObject.parent;
            }
            if (intersectedObject && gameState.stars.includes(intersectedObject)) {
                focusOnStar(intersectedObject);
            }
        }
    });
    const creationMapping = {
        createAsteroidButton: { type: 'asteroid', cost: 100 },
        createCometButton: { type: 'comet', cost: 500 },
        createMoonButton: { type: 'moon', cost: 1000 },
        createDwarfPlanetButton: { type: 'dwarfPlanet', cost: 2500 },
        createPlanetButton: { type: 'planet', cost: 10000 },
    };
    for (const [buttonId, { type, cost }] of Object.entries(creationMapping)) {
        const button = ui[buttonId];
        if (!button)
            continue;
        let creationTimeout = null;
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
            if (!isCreating)
                return;
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
            gameState.cosmicDust -= cost;
            gameState.resources.cosmicDust -= cost;
            const parentRadius = (focusedObject.children[0] ? focusedObject.children[0].scale.x : focusedObject.scale.x) || 1;
            const orbitalRadius = parentRadius + 20 + Math.random() * (parentRadius * 5);
            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3(orbitalRadius * Math.cos(angle), (Math.random() - 0.5) * 20, orbitalRadius * Math.sin(angle));
            if (orbitalRadius <= 0) {
                console.error(`[Creation Error] Invalid orbitalRadius (${orbitalRadius}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }
            const orbitalSpeed = Math.sqrt((gameState.physics.G * focusedObject.userData.mass) / orbitalRadius);
            if (!isFinite(orbitalSpeed)) {
                console.error(`[Creation Error] Calculated orbitalSpeed is not finite (${orbitalSpeed}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }
            const relativeVelocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
            const finalVelocity = focusedObject.userData.velocity.clone().add(relativeVelocity);
            const finalPosition = focusedObject.position.clone().add(position);
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
            gameState.stars.push(newBody);
            scene.add(newBody);
            // サウンドエフェクトの再生
            soundManager.createCelestialBodySound(type, finalPosition);
            const typeNames = {
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
            if (creationCount <= 2)
                nextDelay = 500;
            else if (creationCount <= 5)
                nextDelay = 250;
            else if (creationCount <= 10)
                nextDelay = 100;
            else
                nextDelay = 50;
            creationTimeout = setTimeout(createAction, nextDelay);
        };
        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
            if (isCreating)
                return;
            isCreating = true;
            creationCount = 0;
            createAction();
        });
        button.addEventListener('mouseup', stopCreation);
        button.addEventListener('mouseleave', stopCreation);
    }
    const createStarAction = (starName = null) => {
        const cost = 100000;
        if (gameState.cosmicDust < cost) {
            showMessage('宇宙の塵が足りません。');
            return false;
        }
        const name = starName || `恒星-${gameState.stars.filter(s => s.userData.type === 'star').length + 1}`;
        gameState.cosmicDust -= cost;
        gameState.resources.cosmicDust -= cost;
        const radius = 5000 + Math.random() * 10000;
        const angle = Math.random() * Math.PI * 2;
        const position = new THREE.Vector3(radius * Math.cos(angle), (Math.random() - 0.5) * 100, radius * Math.sin(angle));
        const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
        const blackHoleMass = blackHole ? blackHole.userData.mass : 100000;
        const orbitalSpeed = Math.sqrt((gameState.physics.G * blackHoleMass) / radius);
        const velocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
        const newStar = createCelestialBody('star', { name, position, velocity });
        gameState.stars.push(newStar);
        scene.add(newStar);
        focusOnStar(newStar);
        // 恒星作成サウンドの再生
        soundManager.createCelestialBodySound('star', position);
        addTimelineLog(`恒星「${name}」が銀河に誕生しました`, 'creation');
        saveGame();
        return true;
    };
    let isCreatingStars = false;
    let starCreationInterval = null;
    let starCreationCount = 0;
    if (ui.createStarButton) {
        ui.createStarButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isCreatingStars)
                return;
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
                        if (!isCreatingStars)
                            return;
                        if (createStarAction()) {
                            starCreationCount++;
                            let delay;
                            if (starCreationCount <= 2)
                                delay = 800;
                            else if (starCreationCount <= 4)
                                delay = 600;
                            else if (starCreationCount <= 7)
                                delay = 400;
                            else if (starCreationCount <= 11)
                                delay = 250;
                            else if (starCreationCount <= 16)
                                delay = 150;
                            else
                                delay = 100;
                            starCreationInterval = setTimeout(continuousCreation, delay);
                        }
                        else {
                            stopStarCreation();
                        }
                    };
                    continuousCreation();
                }, 500);
            }
            else {
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
            let upgradeTimeout;
            let upgradeCount = 0;
            const upgradeAction = () => {
                const cost = mathCache.getDustUpgradeCost();
                if (gameState.energy >= cost) {
                    gameState.energy -= cost;
                    gameState.resources.energy -= cost;
                    gameState.dustUpgradeLevel++;
                    updateUI();
                    saveGame();
                    soundManager.playUISound('success');
                    upgradeCount++;
                    let nextDelay;
                    if (upgradeCount <= 3)
                        nextDelay = 500;
                    else if (upgradeCount <= 8)
                        nextDelay = 100;
                    else if (upgradeCount <= 18)
                        nextDelay = 50;
                    else
                        nextDelay = 10;
                    upgradeTimeout = setTimeout(upgradeAction, nextDelay);
                }
                else {
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
            let upgradeTimeout;
            let upgradeCount = 0;
            const upgradeAction = () => {
                const cost = mathCache.getConverterCost();
                if (gameState.energy >= cost) {
                    gameState.energy -= cost;
                    gameState.resources.energy -= cost;
                    gameState.darkMatterConverterLevel++;
                    gameState.darkMatter++;
                    gameState.resources.darkMatter++;
                    updateUI();
                    saveGame();
                    soundManager.playUISound('success');
                    upgradeCount++;
                    let nextDelay;
                    if (upgradeCount <= 3)
                        nextDelay = 500;
                    else if (upgradeCount <= 8)
                        nextDelay = 100;
                    else if (upgradeCount <= 18)
                        nextDelay = 50;
                    else
                        nextDelay = 10;
                    upgradeTimeout = setTimeout(upgradeAction, nextDelay);
                }
                else {
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
                gameState.darkMatter -= 1;
                gameState.resources.darkMatter -= 1;
                gameState.researchEnhancedDust = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.researchAdvancedEnergyButton) {
        ui.researchAdvancedEnergyButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.researchAdvancedEnergy) {
                gameState.darkMatter -= 2;
                gameState.resources.darkMatter -= 2;
                gameState.researchAdvancedEnergy = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.researchMoonButton) {
        ui.researchMoonButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.unlockedCelestialBodies.moon) {
                gameState.darkMatter -= 1;
                gameState.resources.darkMatter -= 1;
                gameState.unlockedCelestialBodies.moon = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.researchDwarfPlanetButton) {
        ui.researchDwarfPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.unlockedCelestialBodies.dwarfPlanet) {
                gameState.darkMatter -= 2;
                gameState.resources.darkMatter -= 2;
                gameState.unlockedCelestialBodies.dwarfPlanet = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.researchPlanetButton) {
        ui.researchPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 3 && !gameState.unlockedCelestialBodies.planet) {
                gameState.darkMatter -= 3;
                gameState.resources.darkMatter -= 3;
                gameState.unlockedCelestialBodies.planet = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.researchStarButton) {
        ui.researchStarButton.addEventListener('click', () => {
            const cost = 5;
            if (gameState.darkMatter >= cost && !gameState.unlockedCelestialBodies.star) {
                gameState.darkMatter -= cost;
                gameState.resources.darkMatter -= cost;
                gameState.unlockedCelestialBodies.star = true;
                updateUI();
                saveGame();
            }
        });
    }
    if (ui.gravitySlider) {
        ui.gravitySlider.addEventListener('input', (event) => {
            const target = event.target;
            gameState.physics.G = parseFloat(target.value);
            if (ui.gravityValue)
                ui.gravityValue.textContent = target.value;
        });
    }
    if (ui.simulationSpeedSlider) {
        ui.simulationSpeedSlider.addEventListener('input', (event) => {
            const target = event.target;
            gameState.physics.simulationSpeed = parseFloat(target.value);
            if (ui.simulationSpeedValue)
                ui.simulationSpeedValue.textContent = `${target.value}x`;
        });
    }
    if (ui.dragSlider) {
        ui.dragSlider.addEventListener('input', (event) => {
            const target = event.target;
            gameState.physics.dragFactor = parseFloat(target.value);
            if (ui.dragValue)
                ui.dragValue.textContent = target.value;
        });
    }
    if (ui.addAllResourcesButton) {
        ui.addAllResourcesButton.addEventListener('click', () => {
            gameState.cosmicDust += 100000000;
            gameState.resources.cosmicDust += 100000000;
            gameState.energy += 1000000;
            gameState.resources.energy += 1000000;
            gameState.darkMatter += 10;
            gameState.resources.darkMatter += 10;
            gameState.organicMatter += 10000;
            gameState.resources.organicMatter += 10000;
            gameState.biomass += 5000;
            gameState.resources.biomass += 5000;
            gameState.thoughtPoints += 1000;
            gameState.resources.thoughtPoints += 1000;
            updateUI();
            showMessage('全リソースを追加しました。');
        });
    }
    if (ui.graphicsQualitySelect) {
        ui.graphicsQualitySelect.addEventListener('change', (event) => {
            const target = event.target;
            gameState.graphicsQuality = target.value;
            // applyGraphicsQuality(); // この関数は存在しないためコメントアウト
            saveGame();
        });
    }
    if (ui.unitSystemSelect) {
        ui.unitSystemSelect.addEventListener('change', (event) => {
            const target = event.target;
            gameState.currentUnitSystem = target.value;
            saveGame();
            updateUI();
        });
    }
    if (ui.resetGameButton) {
        ui.resetGameButton.addEventListener('click', () => {
            if (confirm('本当にすべての進行状況をリセットしますか？')) {
                localStorage.removeItem('cosmicGardenerState');
                location.reload();
            }
        });
    }
    // サウンド設定のイベントリスナー
    const masterVolumeSlider = document.getElementById('masterVolumeSlider');
    const masterVolumeValue = document.getElementById('masterVolumeValue');
    const ambientVolumeSlider = document.getElementById('ambientVolumeSlider');
    const ambientVolumeValue = document.getElementById('ambientVolumeValue');
    const effectsVolumeSlider = document.getElementById('effectsVolumeSlider');
    const effectsVolumeValue = document.getElementById('effectsVolumeValue');
    const uiVolumeSlider = document.getElementById('uiVolumeSlider');
    const uiVolumeValue = document.getElementById('uiVolumeValue');
    const spatialAudioCheckbox = document.getElementById('spatialAudioCheckbox');
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
    const setupInfoPanel = createInfoPanel();
}
