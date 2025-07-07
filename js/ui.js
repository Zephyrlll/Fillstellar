
import { gameState } from './state.js';
import { mathCache } from './utils.js';

let messageTimeout;

// UI dirty checking - previous values cache
const previousUIValues = {
    gameYear: -1,
    cosmicDust: -1,
    dustRate: -1,
    energy: -1,
    organicMatter: -1,
    biomass: -1,
    darkMatter: -1,
    thoughtPoints: -1,
    starCount: -1,
    thoughtSpeedMps: -1,
    lightSpeedPercent: -1,
    dustUpgradeLevel: -1,
    dustUpgradeCost: -1,
    darkMatterConverterLevel: -1,
    darkMatterConverterCost: -1,
    totalPopulation: -1,
    researchStates: {},
    unlockedBodies: {},
    focusedBody: null
};

// --- UI要素の取得 ----------------------------------------------------
export const ui = {
    gameYear: document.getElementById('gameYear'),
    thoughtSpeedMps: document.getElementById('thoughtSpeedMps'),
    lightSpeedPercent: document.getElementById('lightSpeedPercent'),
    cosmicDust: document.getElementById('resource-cosmicDust'),
    dustRate: document.getElementById('dustRate'),
    energy: document.getElementById('resource-energy'),
    organicMatter: document.getElementById('resource-organicMatter'),
    biomass: document.getElementById('resource-biomass'),
    darkMatter: document.getElementById('resource-darkMatter'),
    thoughtPoints: document.getElementById('resource-thoughtPoints'),
    starCount: document.getElementById('starCount'),
    dustUpgradeLevel: document.getElementById('dustUpgradeLevel'),
    dustUpgradeCost: document.getElementById('dustUpgradeCost'),
    upgradeDustButton: document.getElementById('upgradeDustButton'),
    darkMatterConverterLevel: document.getElementById('darkMatterConverterLevel'),
    darkMatterConverterCost: document.getElementById('darkMatterConverterCost'),
    upgradeDarkMatterConverterButton: document.getElementById('upgradeDarkMatterConverterButton'),
    focusedStarName: document.getElementById('focused-star-name'),
    starParameters: document.getElementById('star-parameters'),
    planetParameters: document.getElementById('planet-parameters'),
    focusedStarAge: document.getElementById('focused-star-age'),
    focusedStarTemp: document.getElementById('focused-star-temp'),
    focusedStarMass: document.getElementById('focused-star-mass'),
    focusedStarLifespan: document.getElementById('focused-star-lifespan'),
    focusedStarSpeed: document.getElementById('focused-star-speed'),
    focusedPlanetType: document.getElementById('focused-planet-type'),
    focusedPlanetMass: document.getElementById('focused-planet-mass'),
    focusedPlanetRadius: document.getElementById('focused-planet-radius'),
    focusedPlanetAtmosphere: document.getElementById('focused-planet-atmosphere'),
    focusedPlanetWater: document.getElementById('focused-planet-water'),
    focusedPlanetHabitability: document.getElementById('focused-planet-habitability'),
    focusedPlanetHasLife: document.getElementById('focused-planet-hasLife'),
    focusedPlanetLifeStage: document.getElementById('focused-planet-lifeStage'),
    focusedPlanetPopulation: document.getElementById('focused-planet-population'),
    focusedPlanetGeology: document.getElementById('focusedPlanetGeology'),
    focusedPlanetGeologyRow: document.getElementById('focused-planet-geology-row'),
    focusedPlanetSpeed: document.getElementById('focused-planet-speed'),
    researchEnhancedDustStatus: document.getElementById('researchEnhancedDustStatus'),
    researchAdvancedEnergyStatus: document.getElementById('researchAdvancedEnergyStatus'),
    researchMoonStatus: document.getElementById('researchMoonStatus'),
    researchDwarfPlanetStatus: document.getElementById('researchDwarfPlanetStatus'),
    researchPlanetStatus: document.getElementById('researchPlanetStatus'),
    researchStarStatus: document.getElementById('researchStarStatus'),
    researchStarCost: document.getElementById('researchStarCost'),
    researchEnhancedDustButton: document.getElementById('researchEnhancedDustButton'),
    researchAdvancedEnergyButton: document.getElementById('researchAdvancedEnergyButton'),
    researchMoonButton: document.getElementById('researchMoonButton'),
    researchDwarfPlanetButton: document.getElementById('researchDwarfPlanetButton'),
    researchPlanetButton: document.getElementById('researchPlanetButton'),
    researchStarButton: document.getElementById('researchStarButton'),
    createAsteroidButton: document.getElementById('createAsteroidButton'),
    createCometButton: document.getElementById('createCometButton'),
    createMoonButton: document.getElementById('createMoonButton'),
    createDwarfPlanetButton: document.getElementById('createDwarfPlanetButton'),
    createPlanetButton: document.getElementById('createPlanetButton'),
    createStarButton: document.getElementById('createStarButton'),
    uiArea: document.getElementById('ui-area'),
    gameScreen: document.getElementById('game-screen'),
    researchScreen: document.getElementById('research-screen'),
    optionsScreen: document.getElementById('options-screen'),
    starManagementScreen: document.getElementById('star-management-screen'),
    gameTabButton: document.getElementById('gameTabButton'),
    researchTabButton: document.getElementById('researchTabButton'),
    optionsTabButton: document.getElementById('optionsTabButton'),
    starManagementTabButton: document.getElementById('starManagementTabButton'),
    closeOptionsButton: document.getElementById('closeOptionsButton'),
    starListContainer: document.getElementById('star-list-container'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    galaxyMapContainer: document.getElementById('galaxy-map-container'),
    addAllResourcesButton: document.getElementById('addAllResourcesButton'),
    resetGameButton: document.getElementById('resetGameButton'),
    gravitySlider: document.getElementById('gravitySlider'),
    gravityValue: document.getElementById('gravityValue'),
    simulationSpeedSlider: document.getElementById('simulationSpeedSlider'),
    simulationSpeedValue: document.getElementById('simulationSpeedValue'),
    dragSlider: document.getElementById('dragSlider'),
    dragValue: document.getElementById('dragValue'),
    graphicsQualitySelect: document.getElementById('graphicsQualitySelect'),
    unitSystemSelect: document.getElementById('unitSystemSelect'),
};

function updateFocusedBodyUI() {
    const focusedBody = gameState.focusedObject;

    if (previousUIValues.focusedBody === focusedBody) {
        if (!focusedBody) return;
        const userData = focusedBody.userData;
        if (userData.type === 'star') {
            ui.focusedStarAge.textContent = userData.age;
            ui.focusedStarTemp.textContent = userData.temperature;
            ui.focusedStarMass.textContent = userData.mass;
            ui.focusedStarLifespan.textContent = userData.lifespan;
            ui.focusedStarSpeed.textContent = userData.velocity.length().toFixed(2);
        } else if (userData.type === 'planet') {
            ui.focusedPlanetMass.textContent = userData.mass;
            ui.focusedPlanetRadius.textContent = userData.radius;
            ui.focusedPlanetAtmosphere.textContent = userData.atmosphere;
            ui.focusedPlanetWater.textContent = userData.water;
            ui.focusedPlanetHabitability.textContent = userData.habitability;
            ui.focusedPlanetHasLife.textContent = userData.hasLife ? 'はい' : 'いいえ';
            ui.focusedPlanetLifeStage.textContent = userData.lifeStage || '--';
            ui.focusedPlanetPopulation.textContent = Math.floor(userData.population || 0).toLocaleString();
            ui.focusedPlanetSpeed.textContent = userData.velocity.length().toFixed(2);
        }
        return;
    }

    if (focusedBody) {
        const userData = focusedBody.userData;
        ui.focusedStarName.textContent = userData.name;

        if (userData.type === 'star') {
            ui.starParameters.classList.remove('hidden');
            ui.planetParameters.classList.add('hidden');
            ui.focusedStarAge.textContent = userData.age;
            ui.focusedStarTemp.textContent = userData.temperature;
            ui.focusedStarMass.textContent = userData.mass;
            ui.focusedStarLifespan.textContent = userData.lifespan;
            ui.focusedStarSpeed.textContent = userData.velocity.length().toFixed(2);
        } else if (userData.type === 'planet') {
            ui.starParameters.classList.add('hidden');
            ui.planetParameters.classList.remove('hidden');
            ui.focusedPlanetType.textContent = userData.subType || userData.planetType;
            ui.focusedPlanetMass.textContent = userData.mass;
            ui.focusedPlanetRadius.textContent = userData.radius;
            ui.focusedPlanetAtmosphere.textContent = userData.atmosphere;
            ui.focusedPlanetWater.textContent = userData.water;
            ui.focusedPlanetHabitability.textContent = userData.habitability;
            ui.focusedPlanetHasLife.textContent = userData.hasLife ? 'はい' : 'いいえ';
            ui.focusedPlanetLifeStage.textContent = userData.lifeStage || '--';
            ui.focusedPlanetPopulation.textContent = Math.floor(userData.population || 0).toLocaleString();
            ui.focusedPlanetSpeed.textContent = userData.velocity.length().toFixed(2);
            if (userData.geologicalActivity) {
                ui.focusedPlanetGeologyRow.style.display = '';
                ui.focusedPlanetGeology.textContent = `${(userData.geologicalActivity * 100).toFixed(0)} %`;
            } else {
                ui.focusedPlanetGeologyRow.style.display = 'none';
            }
        } else {
            ui.starParameters.classList.add('hidden');
            ui.planetParameters.classList.add('hidden');
        }
    } else {
        ui.focusedStarName.textContent = 'フォーカス中の星はありません';
        ui.starParameters.classList.add('hidden');
        ui.planetParameters.classList.add('hidden');
    }
    previousUIValues.focusedBody = focusedBody;
}

export function updateUI() {
    const {
        gameYear, cosmicDust, energy, organicMatter, biomass, darkMatter, thoughtPoints,
        dustUpgradeLevel, darkMatterConverterLevel,
        researchEnhancedDust, researchAdvancedEnergy,
        unlockedCelestialBodies,
        currentDustRate, cachedTotalPopulation
    } = gameState;

    const currentGameYear = Math.floor(gameYear);
    const currentCosmicDust = Math.floor(cosmicDust);
    const currentEnergy = Math.floor(energy);
    const currentDarkMatter = Math.floor(darkMatter);
    const nextDustUpgradeCost = mathCache.getDustUpgradeCost();
    const nextConverterCost = mathCache.getConverterCost();

    if (previousUIValues.gameYear !== currentGameYear) {
        if (ui.gameYear) ui.gameYear.textContent = currentGameYear;
        previousUIValues.gameYear = currentGameYear;
    }
    if (previousUIValues.cosmicDust !== currentCosmicDust) {
        if (ui.cosmicDust) ui.cosmicDust.textContent = currentCosmicDust;
        previousUIValues.cosmicDust = currentCosmicDust;
    }
     if (previousUIValues.energy !== currentEnergy) {
        if (ui.energy) ui.energy.textContent = currentEnergy;
        previousUIValues.energy = currentEnergy;
    }
    if (previousUIValues.darkMatter !== currentDarkMatter) {
        if (ui.darkMatter) ui.darkMatter.textContent = currentDarkMatter;
        previousUIValues.darkMatter = currentDarkMatter;
    }
    const currentOrganicMatter = Math.floor(organicMatter);
    if (previousUIValues.organicMatter !== currentOrganicMatter) {
        if (ui.organicMatter) ui.organicMatter.textContent = currentOrganicMatter;
        previousUIValues.organicMatter = currentOrganicMatter;
    }
    const currentBiomass = Math.floor(biomass);
    if (previousUIValues.biomass !== currentBiomass) {
        if (ui.biomass) ui.biomass.textContent = currentBiomass;
        previousUIValues.biomass = currentBiomass;
    }
    const currentThoughtPoints = Math.floor(thoughtPoints);
     if (previousUIValues.thoughtPoints !== currentThoughtPoints) {
        if (ui.thoughtPoints) ui.thoughtPoints.textContent = currentThoughtPoints;
        previousUIValues.thoughtPoints = currentThoughtPoints;
    }
    const currentDustRateStr = (currentDustRate || 0).toFixed(1);
    if (previousUIValues.dustRate !== currentDustRateStr) {
        if (ui.dustRate) ui.dustRate.textContent = currentDustRateStr;
        previousUIValues.dustRate = currentDustRateStr;
    }

    if (ui.upgradeDustButton) ui.upgradeDustButton.disabled = currentEnergy < nextDustUpgradeCost;
    if (ui.upgradeDarkMatterConverterButton) ui.upgradeDarkMatterConverterButton.disabled = currentEnergy < nextConverterCost;

    if (previousUIValues.dustUpgradeLevel !== dustUpgradeLevel) {
        if (ui.dustUpgradeLevel) ui.dustUpgradeLevel.textContent = dustUpgradeLevel;
        previousUIValues.dustUpgradeLevel = dustUpgradeLevel;
    }
    if (previousUIValues.dustUpgradeCost !== nextDustUpgradeCost) {
        if (ui.dustUpgradeCost) ui.dustUpgradeCost.textContent = nextDustUpgradeCost;
        previousUIValues.dustUpgradeCost = nextDustUpgradeCost;
    }
    if (previousUIValues.darkMatterConverterLevel !== darkMatterConverterLevel) {
        if (ui.darkMatterConverterLevel) ui.darkMatterConverterLevel.textContent = darkMatterConverterLevel;
        previousUIValues.darkMatterConverterLevel = darkMatterConverterLevel;
    }
    if (previousUIValues.darkMatterConverterCost !== nextConverterCost) {
        if (ui.darkMatterConverterCost) ui.darkMatterConverterCost.textContent = nextConverterCost;
        previousUIValues.darkMatterConverterCost = nextConverterCost;
    }

    if (ui.researchEnhancedDustButton) ui.researchEnhancedDustButton.disabled = researchEnhancedDust || currentDarkMatter < 1;
    if (ui.researchAdvancedEnergyButton) ui.researchAdvancedEnergyButton.disabled = researchAdvancedEnergy || currentDarkMatter < 2;
    if (ui.researchMoonButton) ui.researchMoonButton.disabled = unlockedCelestialBodies.moon || currentDarkMatter < 1;
    if (ui.researchDwarfPlanetButton) ui.researchDwarfPlanetButton.disabled = unlockedCelestialBodies.dwarfPlanet || currentDarkMatter < 2;
    if (ui.researchPlanetButton) ui.researchPlanetButton.disabled = unlockedCelestialBodies.planet || currentDarkMatter < 3;
    const researchStarCost = 5;
    if (ui.researchStarButton) ui.researchStarButton.disabled = unlockedCelestialBodies.star || currentDarkMatter < researchStarCost;

    if (previousUIValues.researchStates.enhancedDust !== researchEnhancedDust) {
        if (ui.researchEnhancedDustStatus) ui.researchEnhancedDustStatus.textContent = researchEnhancedDust ? '完了' : '未完了';
        previousUIValues.researchStates.enhancedDust = researchEnhancedDust;
    }
    if (previousUIValues.researchStates.advancedEnergy !== researchAdvancedEnergy) {
        if (ui.researchAdvancedEnergyStatus) ui.researchAdvancedEnergyStatus.textContent = researchAdvancedEnergy ? '完了' : '未完了';
        previousUIValues.researchStates.advancedEnergy = researchAdvancedEnergy;
    }
    if (previousUIValues.unlockedBodies.moon !== unlockedCelestialBodies.moon) {
        if (ui.researchMoonStatus) ui.researchMoonStatus.textContent = unlockedCelestialBodies.moon ? '完了' : '未完了';
        if (ui.createMoonButton) ui.createMoonButton.style.display = unlockedCelestialBodies.moon ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.moon = unlockedCelestialBodies.moon;
    }
    if (previousUIValues.unlockedBodies.dwarfPlanet !== unlockedCelestialBodies.dwarfPlanet) {
        if (ui.researchDwarfPlanetStatus) ui.researchDwarfPlanetStatus.textContent = unlockedCelestialBodies.dwarfPlanet ? '完了' : '未完了';
        if (ui.createDwarfPlanetButton) ui.createDwarfPlanetButton.style.display = unlockedCelestialBodies.dwarfPlanet ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.dwarfPlanet = unlockedCelestialBodies.dwarfPlanet;
    }
    if (previousUIValues.unlockedBodies.planet !== unlockedCelestialBodies.planet) {
        if (ui.researchPlanetStatus) ui.researchPlanetStatus.textContent = unlockedCelestialBodies.planet ? '完了' : '未完了';
        if (ui.createPlanetButton) ui.createPlanetButton.style.display = unlockedCelestialBodies.planet ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.planet = unlockedCelestialBodies.planet;
    }
    if (previousUIValues.unlockedBodies.star !== unlockedCelestialBodies.star) {
        if (ui.researchStarStatus) ui.researchStarStatus.textContent = unlockedCelestialBodies.star ? '完了' : '未完了';
        if (ui.researchStarCost) ui.researchStarCost.textContent = researchStarCost;
        if (ui.createStarButton) ui.createStarButton.style.display = unlockedCelestialBodies.star ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.star = unlockedCelestialBodies.star;
    }
    
    updateFocusedBodyUI();
}

export function switchTab(activeTab) {
    ui.gameScreen.classList.add('hidden-screen');
    ui.researchScreen.classList.add('hidden-screen');
    ui.optionsScreen.classList.add('hidden-screen');
    ui.starManagementScreen.classList.add('hidden-screen');
    ui.gameTabButton.classList.remove('active-tab');
    ui.researchTabButton.classList.remove('active-tab');
    ui.optionsTabButton.classList.remove('active-tab');
    ui.starManagementTabButton.classList.remove('active-tab');

    if (activeTab === 'game') {
        ui.gameScreen.classList.remove('hidden-screen');
        ui.gameTabButton.classList.add('active-tab');
    } else if (activeTab === 'research') {
        ui.researchScreen.classList.remove('hidden-screen');
        ui.researchTabButton.classList.add('active-tab');
    } else if (activeTab === 'options') {
        ui.optionsScreen.classList.remove('hidden-screen');
        ui.optionsTabButton.classList.add('active-tab');
    } else if (activeTab === 'starManagement') {
        ui.starManagementScreen.classList.remove('hidden-screen');
        ui.starManagementTabButton.classList.add('active-tab');
        updateStarList();
    }
}

function updateStarList() {
    const starListContainer = ui.starListContainer;
    if (!starListContainer) return;

    starListContainer.innerHTML = ''; // Clear existing list

    const celestialBodies = gameState.stars.filter(s => s.userData.type === 'star' || s.userData.type === 'black_hole');

    if (celestialBodies.length === 0) {
        starListContainer.innerHTML = '<p>現在、管理対象の天体はありません。</p>';
        return;
    }

    // ソート状態を保持する変数
    let sortColumn = 'name';
    let sortDirection = 'asc';

    const renderTable = () => {
        // ソート処理
        celestialBodies.sort((a, b) => {
            const valA = a.userData[sortColumn];
            const valB = b.userData[sortColumn];
            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        starListContainer.innerHTML = ''; // 再描画のためにクリア

        const table = document.createElement('table');
        table.className = 'star-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = [
            { key: 'name', text: '名前' },
            { key: 'type', text: '種類' },
            { key: 'mass', text: '質量' },
            { key: 'temperature', text: '温度 (K)' },
            { key: 'age', text: '年齢 (億年)' },
            { key: 'lifespan', text: '寿命 (億年)' },
        ];

        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.text;
            th.dataset.sortKey = header.key;
            if (header.key === sortColumn) {
                th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
            th.addEventListener('click', () => {
                if (sortColumn === header.key) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = header.key;
                    sortDirection = 'asc';
                }
                renderTable();
            });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        celestialBodies.forEach(body => {
            const row = document.createElement('tr');
            const userData = body.userData;
            const typeText = userData.type === 'black_hole' ? 'ブラックホール' : (userData.spectralType || '恒星');
            row.innerHTML = `
                <td>${userData.name || 'N/A'}</td>
                <td>${typeText}</td>
                <td>${parseFloat(userData.mass).toExponential(2)}</td>
                <td>${userData.temperature || '-'}</td>
                <td>${userData.age ? parseFloat(userData.age).toFixed(2) : '-'}</td>
                <td>${userData.lifespan || '-'}</td>
            `;
            row.addEventListener('click', () => {
                gameState.focusedObject = body;
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        starListContainer.appendChild(table);
    };

    renderTable(); // 初期描画
}

export function showMessage(message, duration = 2000) {
    clearTimeout(messageTimeout);
    ui.messageText.textContent = message;
    ui.messageOverlay.style.display = 'block';
    ui.messageOverlay.classList.remove('hidden');
    ui.messageOverlay.style.opacity = 1;
    messageTimeout = setTimeout(() => {
        ui.messageOverlay.style.opacity = 0;
        ui.messageOverlay.addEventListener('transitionend', () => ui.messageOverlay.classList.add('hidden'), { once: true });
    }, duration);
}

let previousGalaxyMapState = {
    starCount: -1,
    isMapVisible: false,
    blackHolePosition: null,
    mapSize: -1
};

function updateGalaxyMap() {
    const map = ui.galaxyMapContainer;
    if (!map) return;

    if (!gameState.isMapVisible) {
        map.style.display = 'none';
        return;
    }
    map.style.display = 'block';
    map.innerHTML = '';

    let mapSize;
    if (previousGalaxyMapState.mapSize === -1) {
        mapSize = map.clientWidth;
        previousGalaxyMapState.mapSize = mapSize;
    } else {
        mapSize = previousGalaxyMapState.mapSize;
    }
    
    const mapScale = 40000;

    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (!blackHole) return;

    const centerX = blackHole.position.x;
    const centerZ = blackHole.position.z;

    const fragment = document.createDocumentFragment();

    gameState.stars.forEach(star => {
        const marker = document.createElement('div');
        marker.style.position = 'absolute';

        const relativeX = star.position.x - centerX;
        const relativeZ = star.position.z - centerZ;

        const mapX = (relativeX / mapScale) * mapSize + (mapSize / 2);
        const mapY = (relativeZ / mapScale) * mapSize + (mapSize / 2);

        if (mapX >= 0 && mapX < mapSize && mapY >= 0 && mapY < mapSize) {
            marker.style.left = `${mapX}px`;
            marker.style.top = `${mapY}px`;

            if (star.userData.type === 'black_hole') {
                marker.style.width = '5px';
                marker.style.height = '5px';
                marker.style.backgroundColor = 'red';
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)';
            } else if (star.userData.type === 'star') {
                marker.style.width = '2px';
                marker.style.height = '2px';
                marker.style.backgroundColor = 'white';
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)';
            }
            fragment.appendChild(marker);
        }
    });

    map.appendChild(fragment);
}

export function debouncedUpdateGalaxyMap() {
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    const currentStarCount = gameState.stars.length;
    const currentIsMapVisible = gameState.isMapVisible;
    const currentBlackHolePos = blackHole ? `${blackHole.position.x},${blackHole.position.z}` : null;
    
    const significantChange = 
        previousGalaxyMapState.starCount !== currentStarCount ||
        previousUIValues.isMapVisible !== currentIsMapVisible ||
        previousGalaxyMapState.blackHolePosition !== currentBlackHolePos;
    
    if (significantChange) {
        updateGalaxyMap();
        previousGalaxyMapState.starCount = currentStarCount;
        previousUIValues.isMapVisible = currentIsMapVisible;
        previousGalaxyMapState.blackHolePosition = currentBlackHolePos;
    }
}
