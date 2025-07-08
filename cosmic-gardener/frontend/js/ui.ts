
import { gameState, CelestialBody, StarUserData, PlanetUserData } from './state.js';
import { mathCache } from './utils.js';

let messageTimeout: any;

const previousUIValues: any = {
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

export const ui: { [key: string]: HTMLElement | null } = {
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
    overlayCosmicDust: document.getElementById('overlayCosmicDust'),
    overlayEnergy: document.getElementById('overlayEnergy'),
    overlayStarCount: document.getElementById('overlayStarCount'),
    overlayThoughtPoints: document.getElementById('overlayThoughtPoints'),
    overlayCosmicActivity: document.getElementById('overlayCosmicActivity'),
    overlayPopulation: document.getElementById('overlayPopulation'),
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
            const starData = userData as StarUserData;
            if (ui.focusedStarAge) ui.focusedStarAge.textContent = starData.age;
            if (ui.focusedStarTemp) ui.focusedStarTemp.textContent = String(starData.temperature);
            if (ui.focusedStarMass) ui.focusedStarMass.textContent = String(starData.mass);
            if (ui.focusedStarLifespan) ui.focusedStarLifespan.textContent = String(starData.lifespan);
            if (ui.focusedStarSpeed) ui.focusedStarSpeed.textContent = starData.velocity.length().toFixed(2);
        } else if (userData.type === 'planet') {
            const planetData = userData as PlanetUserData;
            if (ui.focusedPlanetMass) ui.focusedPlanetMass.textContent = String(planetData.mass);
            if (ui.focusedPlanetRadius) ui.focusedPlanetRadius.textContent = String(planetData.radius);
            if (ui.focusedPlanetAtmosphere) ui.focusedPlanetAtmosphere.textContent = planetData.atmosphere;
            if (ui.focusedPlanetWater) ui.focusedPlanetWater.textContent = planetData.water;
            if (ui.focusedPlanetHabitability) ui.focusedPlanetHabitability.textContent = String(planetData.habitability);
            if (ui.focusedPlanetHasLife) ui.focusedPlanetHasLife.textContent = planetData.hasLife ? 'はい' : 'いいえ';
            if (ui.focusedPlanetLifeStage) ui.focusedPlanetLifeStage.textContent = planetData.lifeStage || '--';
            if (ui.focusedPlanetPopulation) ui.focusedPlanetPopulation.textContent = Math.floor(planetData.population || 0).toLocaleString();
            if (ui.focusedPlanetSpeed) ui.focusedPlanetSpeed.textContent = planetData.velocity.length().toFixed(2);
        }
        return;
    }

    if (focusedBody) {
        const userData = focusedBody.userData;
        if (ui.focusedStarName) ui.focusedStarName.textContent = userData.name;

        if (userData.type === 'star') {
            const starData = userData as StarUserData;
            if (ui.starParameters) ui.starParameters.classList.remove('hidden');
            if (ui.planetParameters) ui.planetParameters.classList.add('hidden');
            if (ui.focusedStarAge) ui.focusedStarAge.textContent = starData.age;
            if (ui.focusedStarTemp) ui.focusedStarTemp.textContent = String(starData.temperature);
            if (ui.focusedStarMass) ui.focusedStarMass.textContent = String(starData.mass);
            if (ui.focusedStarLifespan) ui.focusedStarLifespan.textContent = String(starData.lifespan);
            if (ui.focusedStarSpeed) ui.focusedStarSpeed.textContent = starData.velocity.length().toFixed(2);
        } else if (userData.type === 'planet') {
            const planetData = userData as PlanetUserData;
            if (ui.starParameters) ui.starParameters.classList.add('hidden');
            if (ui.planetParameters) ui.planetParameters.classList.remove('hidden');
            if (ui.focusedPlanetType) ui.focusedPlanetType.textContent = planetData.subType || planetData.planetType;
            if (ui.focusedPlanetMass) ui.focusedPlanetMass.textContent = String(planetData.mass);
            if (ui.focusedPlanetRadius) ui.focusedPlanetRadius.textContent = String(planetData.radius);
            if (ui.focusedPlanetAtmosphere) ui.focusedPlanetAtmosphere.textContent = planetData.atmosphere;
            if (ui.focusedPlanetWater) ui.focusedPlanetWater.textContent = planetData.water;
            if (ui.focusedPlanetHabitability) ui.focusedPlanetHabitability.textContent = String(planetData.habitability);
            if (ui.focusedPlanetHasLife) ui.focusedPlanetHasLife.textContent = planetData.hasLife ? 'はい' : 'いいえ';
            if (ui.focusedPlanetLifeStage) ui.focusedPlanetLifeStage.textContent = planetData.lifeStage || '--';
            if (ui.focusedPlanetPopulation) ui.focusedPlanetPopulation.textContent = Math.floor(planetData.population || 0).toLocaleString();
            if (ui.focusedPlanetSpeed) ui.focusedPlanetSpeed.textContent = planetData.velocity.length().toFixed(2);
            if (planetData.geologicalActivity) {
                if (ui.focusedPlanetGeologyRow) ui.focusedPlanetGeologyRow.style.display = '';
                if (ui.focusedPlanetGeology) ui.focusedPlanetGeology.textContent = `${(parseFloat(planetData.geologicalActivity) * 100).toFixed(0)} %`;
            } else {
                if (ui.focusedPlanetGeologyRow) ui.focusedPlanetGeologyRow.style.display = 'none';
            }
        } else {
            if (ui.starParameters) ui.starParameters.classList.add('hidden');
            if (ui.planetParameters) ui.planetParameters.classList.add('hidden');
        }
    } else {
        if (ui.focusedStarName) ui.focusedStarName.textContent = 'フォーカス中の星はありません';
        if (ui.starParameters) ui.starParameters.classList.add('hidden');
        if (ui.planetParameters) ui.planetParameters.classList.add('hidden');
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
        if (ui.gameYear) ui.gameYear.textContent = String(currentGameYear);
        previousUIValues.gameYear = currentGameYear;
    }
    if (previousUIValues.cosmicDust !== currentCosmicDust) {
        if (ui.cosmicDust) ui.cosmicDust.textContent = String(currentCosmicDust);
        previousUIValues.cosmicDust = currentCosmicDust;
    }
     if (previousUIValues.energy !== currentEnergy) {
        if (ui.energy) ui.energy.textContent = String(currentEnergy);
        previousUIValues.energy = currentEnergy;
    }
    if (previousUIValues.darkMatter !== currentDarkMatter) {
        if (ui.darkMatter) ui.darkMatter.textContent = String(currentDarkMatter);
        previousUIValues.darkMatter = currentDarkMatter;
    }
    const currentOrganicMatter = Math.floor(organicMatter);
    if (previousUIValues.organicMatter !== currentOrganicMatter) {
        if (ui.organicMatter) ui.organicMatter.textContent = String(currentOrganicMatter);
        previousUIValues.organicMatter = currentOrganicMatter;
    }
    const currentBiomass = Math.floor(biomass);
    if (previousUIValues.biomass !== currentBiomass) {
        if (ui.biomass) ui.biomass.textContent = String(currentBiomass);
        previousUIValues.biomass = currentBiomass;
    }
    const currentThoughtPoints = Math.floor(thoughtPoints);
     if (previousUIValues.thoughtPoints !== currentThoughtPoints) {
        if (ui.thoughtPoints) ui.thoughtPoints.textContent = String(currentThoughtPoints);
        previousUIValues.thoughtPoints = currentThoughtPoints;
    }
    const currentDustRateStr = (currentDustRate || 0).toFixed(1);
    if (previousUIValues.dustRate !== currentDustRateStr) {
        if (ui.dustRate) ui.dustRate.textContent = currentDustRateStr;
        previousUIValues.dustRate = currentDustRateStr;
    }

    if (ui.upgradeDustButton) (ui.upgradeDustButton as HTMLButtonElement).disabled = currentEnergy < nextDustUpgradeCost;
    if (ui.upgradeDarkMatterConverterButton) (ui.upgradeDarkMatterConverterButton as HTMLButtonElement).disabled = currentEnergy < nextConverterCost;

    if (previousUIValues.dustUpgradeLevel !== dustUpgradeLevel) {
        if (ui.dustUpgradeLevel) ui.dustUpgradeLevel.textContent = String(dustUpgradeLevel);
        previousUIValues.dustUpgradeLevel = dustUpgradeLevel;
    }
    if (previousUIValues.dustUpgradeCost !== nextDustUpgradeCost) {
        if (ui.dustUpgradeCost) ui.dustUpgradeCost.textContent = String(nextDustUpgradeCost);
        previousUIValues.dustUpgradeCost = nextDustUpgradeCost;
    }
    if (previousUIValues.darkMatterConverterLevel !== darkMatterConverterLevel) {
        if (ui.darkMatterConverterLevel) ui.darkMatterConverterLevel.textContent = String(darkMatterConverterLevel);
        previousUIValues.darkMatterConverterLevel = darkMatterConverterLevel;
    }
    if (previousUIValues.darkMatterConverterCost !== nextConverterCost) {
        if (ui.darkMatterConverterCost) ui.darkMatterConverterCost.textContent = String(nextConverterCost);
        previousUIValues.darkMatterConverterCost = nextConverterCost;
    }

    if (ui.researchEnhancedDustButton) (ui.researchEnhancedDustButton as HTMLButtonElement).disabled = researchEnhancedDust || currentDarkMatter < 1;
    if (ui.researchAdvancedEnergyButton) (ui.researchAdvancedEnergyButton as HTMLButtonElement).disabled = researchAdvancedEnergy || currentDarkMatter < 2;
    if (ui.researchMoonButton) (ui.researchMoonButton as HTMLButtonElement).disabled = unlockedCelestialBodies.moon || currentDarkMatter < 1;
    if (ui.researchDwarfPlanetButton) (ui.researchDwarfPlanetButton as HTMLButtonElement).disabled = unlockedCelestialBodies.dwarfPlanet || currentDarkMatter < 2;
    if (ui.researchPlanetButton) (ui.researchPlanetButton as HTMLButtonElement).disabled = unlockedCelestialBodies.planet || currentDarkMatter < 3;
    const researchStarCost = 5;
    if (ui.researchStarButton) (ui.researchStarButton as HTMLButtonElement).disabled = unlockedCelestialBodies.star || currentDarkMatter < researchStarCost;

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
        if (ui.researchStarCost) ui.researchStarCost.textContent = String(researchStarCost);
        if (ui.createStarButton) ui.createStarButton.style.display = unlockedCelestialBodies.star ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.star = unlockedCelestialBodies.star;
    }

    // 右下のオーバーレイパネルの更新
    if (ui.overlayCosmicDust) ui.overlayCosmicDust.textContent = String(currentCosmicDust);
    if (ui.overlayEnergy) ui.overlayEnergy.textContent = String(currentEnergy);
    if (ui.overlayStarCount) ui.overlayStarCount.textContent = String(gameState.stars.length);
    if (ui.overlayThoughtPoints) ui.overlayThoughtPoints.textContent = String(currentThoughtPoints);
    
    // 宇宙活動度の計算（天体の総数 + エネルギー生産率）
    const cosmicActivity = gameState.stars.length + Math.floor(currentDustRate || 0);
    if (ui.overlayCosmicActivity) ui.overlayCosmicActivity.textContent = String(cosmicActivity);
    
    // 総人口の表示
    if (ui.overlayPopulation) ui.overlayPopulation.textContent = String(cachedTotalPopulation || 0);
    
    updateFocusedBodyUI();
}

export function switchTab(activeTab: string) {
    if (ui.gameScreen) ui.gameScreen.classList.add('hidden-screen');
    if (ui.researchScreen) ui.researchScreen.classList.add('hidden-screen');
    if (ui.optionsScreen) ui.optionsScreen.classList.add('hidden-screen');
    if (ui.starManagementScreen) ui.starManagementScreen.classList.add('hidden-screen');
    if (ui.gameTabButton) ui.gameTabButton.classList.remove('active-tab');
    if (ui.researchTabButton) ui.researchTabButton.classList.remove('active-tab');
    if (ui.optionsTabButton) ui.optionsTabButton.classList.remove('active-tab');
    if (ui.starManagementTabButton) ui.starManagementTabButton.classList.remove('active-tab');

    if (activeTab === 'game') {
        if (ui.gameScreen) ui.gameScreen.classList.remove('hidden-screen');
        if (ui.gameTabButton) ui.gameTabButton.classList.add('active-tab');
    } else if (activeTab === 'research') {
        if (ui.researchScreen) ui.researchScreen.classList.remove('hidden-screen');
        if (ui.researchTabButton) ui.researchTabButton.classList.add('active-tab');
    } else if (activeTab === 'options') {
        if (ui.optionsScreen) ui.optionsScreen.classList.remove('hidden-screen');
        if (ui.optionsTabButton) ui.optionsTabButton.classList.add('active-tab');
    } else if (activeTab === 'starManagement') {
        if (ui.starManagementScreen) ui.starManagementScreen.classList.remove('hidden-screen');
        if (ui.starManagementTabButton) ui.starManagementTabButton.classList.add('active-tab');
        updateStarList();
    }
}

function updateStarList() {
    const starListContainer = ui.starListContainer;
    if (!starListContainer) return;

    starListContainer.innerHTML = '';

    const celestialBodies = gameState.stars.filter(s => s.userData.type === 'star' || s.userData.type === 'black_hole');

    if (celestialBodies.length === 0) {
        starListContainer.innerHTML = '<p>現在、管理対象の天体はありません。</p>';
        return;
    }

    let sortColumn = 'name';
    let sortDirection = 'asc';

    const renderTable = () => {
        celestialBodies.sort((a, b) => {
            const valA = (a.userData as any)[sortColumn];
            const valB = (b.userData as any)[sortColumn];
            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        starListContainer.innerHTML = '';

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
            const typeText = userData.type === 'black_hole' ? 'ブラックホール' : ((userData as StarUserData).spectralType || '恒星');
            row.innerHTML = `
                <td>${userData.name || 'N/A'}</td>
                <td>${typeText}</td>
                <td>${(userData.mass as number).toExponential(2)}</td>
                <td>${(userData as StarUserData).temperature || '-'}</td>
                <td>${(userData as StarUserData).age ? parseFloat((userData as StarUserData).age).toFixed(2) : '-'}</td>
                <td>${(userData as StarUserData).lifespan || '-'}</td>
            `;
            row.addEventListener('click', () => {
                gameState.focusedObject = body;
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        starListContainer.appendChild(table);
    };

    renderTable();
}

export function showMessage(message: string, duration = 2000) {
    clearTimeout(messageTimeout);
    if (ui.messageText) ui.messageText.textContent = message;
    if (ui.messageOverlay) {
        ui.messageOverlay.style.display = 'block';
        ui.messageOverlay.classList.remove('hidden');
        ui.messageOverlay.style.opacity = '1';
        messageTimeout = setTimeout(() => {
            if (ui.messageOverlay) {
                ui.messageOverlay.style.opacity = '0';
                ui.messageOverlay.addEventListener('transitionend', () => {
                    if (ui.messageOverlay) ui.messageOverlay.classList.add('hidden');
                }, { once: true });
            }
        }, duration);
    }
}

let previousGalaxyMapState: any = {
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
        (previousUIValues as any).isMapVisible !== currentIsMapVisible ||
        previousGalaxyMapState.blackHolePosition !== currentBlackHolePos;
    
    if (significantChange) {
        updateGalaxyMap();
        previousGalaxyMapState.starCount = currentStarCount;
        (previousUIValues as any).isMapVisible = currentIsMapVisible;
        previousGalaxyMapState.blackHolePosition = currentBlackHolePos;
    }
}
