import * as THREE from 'three';
import { scene, camera, renderer, composer } from './threeSetup.js';
import { gameState } from './state.js';
import { ui, switchTab, showMessage, updateUI } from './ui.js';
import { saveGame } from './saveload.js';
import { createCelestialBody } from './celestialBody.js';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache } from './utils.js';
import { addTimelineLog } from './timeline.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let focusedStar = null; // events.jsでフォーカスされた星を管理

// 仮のfocusOnStar関数。本来はmain.jsにあるべきだが、循環参照を避けるためここに置く
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

    function updatePosition(event) {
        if (!currentTarget) return;
        // パネルをマウスカーソルの右下に配置
        panel.style.left = `${event.clientX + 15}px`;
        panel.style.top = `${event.clientY + 15}px`;
    }

    return (elementId, title, contentFn) => {
        const element = document.getElementById(elementId);
        if (!element) {
            // console.warn(`Info panel target not found: ${elementId}`);
            return;
        }
        
        // 親要素にリスナーを設定
        const parent = element.parentElement;

        parent.addEventListener('mouseenter', () => {
            show(parent, title, contentFn);
        });
        parent.addEventListener('mouseleave', hide);
        parent.addEventListener('mousemove', updatePosition);
    };
}

export function setupEventListeners() {
    // Prevent multiple event listener registrations
    if (eventListenersSetup) return;
    eventListenersSetup = true;
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        
        // Invalidate cached map size on resize
        previousGalaxyMapState.mapSize = -1;
    });

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
            gameState.isMapVisible = !gameState.isMapVisible;
            updateGalaxyMap(); // 表示状態を即座に更新
        }
    });

    ui.gameTabButton.addEventListener('click', () => switchTab('game'));
    ui.researchTabButton.addEventListener('click', () => switchTab('research'));
    ui.optionsTabButton.addEventListener('click', () => switchTab('options'));
    ui.starManagementTabButton.addEventListener('click', () => switchTab('starManagement'));
    ui.closeOptionsButton.addEventListener('click', () => switchTab('game'));

    // 開閉式メニ���ー - cache the querySelectorAll result
    ui.collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    ui.collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.style.padding = '0 15px';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.padding = '15px';
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (ui.uiArea.contains(event.target)) return; // UI上は無視
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true); // scene全体を再帰的にチェック

        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            // 親をたどって、gameState.starsに含まれる最上位のオブジェクトを見つける
            while (intersectedObject.parent && !gameState.stars.includes(intersectedObject)) {
                intersectedObject = intersectedObject.parent;
            }

            // 見つかったオブジェクトがstars配列にあればフォーカスする
            if (gameState.stars.includes(intersectedObject)) {
                focusOnStar(intersectedObject);
            }
        }
    });

    // 小惑星・彗星・月・準惑星・惑星の作成機能
    const creationMapping = {
        createAsteroidButton: { type: 'asteroid', cost: 100 },
        createCometButton: { type: 'comet', cost: 500 },
        createMoonButton: { type: 'moon', cost: 1000 },
        createDwarfPlanetButton: { type: 'dwarfPlanet', cost: 2500 },
        createPlanetButton: { type: 'planet', cost: 10000 },
    };

    for (const [buttonId, { type, cost }] of Object.entries(creationMapping)) {
        const button = ui[buttonId];
        if (!button) continue;

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
            if (!isCreating) return;

            if (!focusedStar || focusedStar.userData.type !== 'star') {
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
            const parentRadius = (focusedStar.children[0] ? focusedStar.children[0].scale.x : focusedStar.scale.x) || 1;
            const orbitalRadius = parentRadius + 20 + Math.random() * (parentRadius * 5);
            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3(orbitalRadius * Math.cos(angle), (Math.random() - 0.5) * 20, orbitalRadius * Math.sin(angle));
            
            if (orbitalRadius <= 0) {
                console.error(`[Creation Error] Invalid orbitalRadius (${orbitalRadius}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const orbitalSpeed = Math.sqrt((gameState.physics.G * focusedStar.userData.mass) / orbitalRadius);

            if (!isFinite(orbitalSpeed)) {
                console.error(`[Creation Error] Calculated orbitalSpeed is not finite (${orbitalSpeed}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const relativeVelocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
            const finalVelocity = focusedStar.userData.velocity.clone().add(relativeVelocity);
            const finalPosition = focusedStar.position.clone().add(position);
            
            if (!isFinite(finalPosition.x) || !isFinite(finalVelocity.x)) {
                 console.error(`[Creation Error] Final position or velocity is not finite. Skipping creation.`);
                 stopCreation();
                 return;
            }

            const newBody = createCelestialBody(type, {
                position: finalPosition,
                velocity: finalVelocity,
                parent: focusedStar
            });
            gameState.stars.push(newBody);
            scene.add(newBody);
            
            // ログエントリを追加
            const typeNames = {
                'asteroid': '小惑星',
                'comet': '彗星',
                'moon': '衛星',
                'dwarfPlanet': '準惑星',
                'planet': '惑星'
            };
            const bodyName = newBody.userData.name || typeNames[type] || type;
            const parentName = focusedStar.userData.name || '恒星';
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
    
    // 恒星生成関数を分離
    const createStarAction = (starName = null) => {
        const cost = 100000;
        if (gameState.cosmicDust < cost) {
            showMessage('宇宙の塵が足りません。');
            return false;
        }
        
        // 名前が指定されていない場合は自動生成
        const name = starName || `恒星-${gameState.stars.filter(s => s.userData.type === 'star').length + 1}`;
        
        gameState.cosmicDust -= cost;
        const radius = 5000 + Math.random() * 10000; //生成される恒星のブラックホールからの距離
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
        
        // ログエントリを追加
        addTimelineLog(`恒星「${name}」が銀河に誕生しました`, 'creation');
        
        saveGame();
        return true;
    };

    // 恒星生成ボタン（長押し対応）
    let isCreatingStars = false;
    let starCreationInterval = null;
    let starCreationCount = 0;

    ui.createStarButton.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (isCreatingStars) return;
        isCreatingStars = true;
        starCreationCount = 0;

        // 最初の星の名前をユーザーに尋ねる
        const firstStarName = prompt('最初の恒星の名前を入力してください:', '輝く星');
        if (!firstStarName) {
            isCreatingStars = false;
            return; // ユーザーがキャンセルした場合は何もしない
        }

        // 最初の星を生成
        if (createStarAction(firstStarName)) {
            starCreationCount++;

            // 500ms後に連続生成を開始
            starCreationInterval = setTimeout(() => {
                const continuousCreation = () => {
                    if (!isCreatingStars) return;

                    if (createStarAction()) { // 名前なし���自動生成
                        starCreationCount++;

                        // 次の生成までの遅延（曲線的に速くなる）
                        let delay;
                        if (starCreationCount <= 2) delay = 800;
                        else if (starCreationCount <= 4) delay = 600;
                        else if (starCreationCount <= 7) delay = 400;
                        else if (starCreationCount <= 11) delay = 250;
                        else if (starCreationCount <= 16) delay = 150;
                        else delay = 100;

                        starCreationInterval = setTimeout(continuousCreation, delay);
                    } else {
                        // リソース不足で停止
                        stopStarCreation();
                    }
                };
                continuousCreation();
            }, 500);
        } else {
            // 最初の星の生成に失敗した場合
            isCreatingStars = false;
        }
    });

    // 停止処理
    const stopStarCreation = () => {
        if (isCreatingStars) {
            isCreatingStars = false;
            if (starCreationInterval) {
                clearTimeout(starCreationInterval);
                starCreationInterval = null;
            }
        }
    };

    ui.createStarButton.addEventListener('mouseup', stopStarCreation);
    ui.createStarButton.addEventListener('mouseleave', stopStarCreation);
    document.addEventListener('mouseup', stopStarCreation);

    if (ui.upgradeDustButton) {
        ui.upgradeDustButton.addEventListener('mousedown', () => {
        let upgradeTimeout;
        let upgradeCount = 0;

        const upgradeAction = () => {
            const cost = mathCache.getDustUpgradeCost();
            if (gameState.energy >= cost) {
                gameState.energy -= cost;
                gameState.dustUpgradeLevel++;
                updateUI();
                saveGame();
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

        upgradeAction(); // 最初のクリックで一度実行

        const clearUpgrade = () => clearTimeout(upgradeTimeout);
        ui.upgradeDustButton.addEventListener('mouseup', clearUpgrade, { once: true });
        ui.upgradeDustButton.addEventListener('mouseleave', clearUpgrade, { once: true });
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
                gameState.darkMatterConverterLevel++;
                gameState.darkMatter++;
                updateUI();
                saveGame();
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
        ui.upgradeDarkMatterConverterButton.addEventListener('mouseup', clearUpgrade, { once: true });
        ui.upgradeDarkMatterConverterButton.addEventListener('mouseleave', clearUpgrade, { once: true });
        });
    }

    // Research button event listeners with safety checks
    if (ui.researchEnhancedDustButton) {
        ui.researchEnhancedDustButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.researchEnhancedDust) {
                gameState.darkMatter -= 1;
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
                gameState.unlockedCelestialBodies.planet = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchStarButton) {
        ui.researchStarButton.addEventListener('click', () => {
            const cost = 5; // コストを明示
            if (gameState.darkMatter >= cost && !gameState.unlockedCelestialBodies.star) {
                gameState.darkMatter -= cost;
                gameState.unlockedCelestialBodies.star = true;
                updateUI();
                saveGame();
            }
        });
    }

    ui.gravitySlider.addEventListener('input', (event) => {
        gameState.physics.G = parseFloat(event.target.value);
        ui.gravityValue.textContent = event.target.value;
    });

    ui.simulationSpeedSlider.addEventListener('input', (event) => {
        gameState.physics.simulationSpeed = parseFloat(event.target.value);
        ui.simulationSpeedValue.textContent = `${event.target.value}x`;
    });

    ui.dragSlider.addEventListener('input', (event) => {
        gameState.physics.dragFactor = parseFloat(event.target.value);
        ui.dragValue.textContent = event.target.value;
    });

    ui.addAllResourcesButton.addEventListener('click', () => {
        gameState.cosmicDust += 100000000;
        gameState.energy += 1000000;
        gameState.darkMatter += 10;
        updateUI();
        showMessage('全リソースを追加しました。');
    });

    ui.graphicsQualitySelect.addEventListener('change', (event) => {
        gameState.graphicsQuality = event.target.value;
        applyGraphicsQuality();
        saveGame();
    });

    ui.unitSystemSelect.addEventListener('change', (event) => {
        gameState.currentUnitSystem = event.target.value;
        saveGame();
        updateUI();
    });

    ui.resetGameButton.addEventListener('click', () => {
        if (confirm('本当にすべての進行状況をリセットしますか？')) {
            localStorage.removeItem('cosmicGardenerState');
            location.reload();
        }
    });

    // --- Info Panels Setup ---
    const setupInfoPanel = createInfoPanel();
}