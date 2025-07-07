import { gameState } from './state.js';
import { mathCache } from './utils.js';

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
    unlockedBodies: {}
};

// --- UI要素の取得 ----------------------------------------------------
export const ui = {
    gameYear: document.getElementById('gameYear'),
    thoughtSpeedMps: document.getElementById('thoughtSpeedMps'), // 変更
    lightSpeedPercent: document.getElementById('lightSpeedPercent'), // 追加
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
    focusedPlanetGeology: document.getElementById('focusedPlanetGeology'), // 追加
    focusedPlanetGeologyRow: document.getElementById('focused-planet-geology-row'), // 追加
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
    timeMultiplier2xCost: document.getElementById('timeMultiplier2xCost'),
    timeMultiplier2xStatus: document.getElementById('timeMultiplier2xStatus'),
    timeMultiplier2xButton: document.getElementById('timeMultiplier2xButton'),
    timeMultiplier5xCost: document.getElementById('timeMultiplier5xCost'),
    timeMultiplier5xStatus: document.getElementById('timeMultiplier5xStatus'),
    timeMultiplier5xButton: document.getElementById('timeMultiplier5xButton'),
    timeMultiplier10xCost: document.getElementById('timeMultiplier10xCost'),
    timeMultiplier10xStatus: document.getElementById('timeMultiplier10xStatus'),
    timeMultiplier10xButton: document.getElementById('timeMultiplier10xButton'),
    timeMultiplierSelect: document.getElementById('timeMultiplierSelect'),
    createAsteroidButton: document.getElementById('createAsteroidButton'),
    createCometButton: document.getElementById('createCometButton'),
    createMoonButton: document.getElementById('createMoonButton'),
    createDwarfPlanetButton: document.getElementById('createDwarfPlanetButton'),
    createPlanetButton: document.getElementById('createPlanetButton'),
    createStarButton: document.getElementById('createStarButton'),
    asteroidCostDisplay: document.getElementById('asteroidCostDisplay'),
    cometCostDisplay: document.getElementById('cometCostDisplay'),
    moonCostDisplay: document.getElementById('moonCostDisplay'),
    dwarfPlanetCostDisplay: document.getElementById('dwarfPlanetCostDisplay'),
    planetCostDisplay: document.getElementById('planetCostDisplay'),
    starCostDisplay: document.getElementById('starCostDisplay'),
    overlayCosmicDust: document.getElementById('overlayCosmicDust'),
    overlayEnergy: document.getElementById('overlayEnergy'),
    overlayStarCount: document.getElementById('overlayStarCount'),
    overlayThoughtPoints: document.getElementById('overlayThoughtPoints'),
    overlayCosmicActivity: document.getElementById('overlayCosmicActivity'),
    overlayPopulation: document.getElementById('overlayPopulation'),
    uiArea: document.getElementById('ui-area'),
    gameScreen: document.getElementById('game-screen'),
    researchScreen: document.getElementById('research-screen'),
    optionsScreen: document.getElementById('options-screen'),
    gameTabButton: document.getElementById('gameTabButton'),
    researchTabButton: document.getElementById('researchTabButton'),
    optionsTabButton: document.getElementById('optionsTabButton'),
    closeOptionsButton: document.getElementById('closeOptionsButton'),
    graphicsQualitySelect: document.getElementById('graphicsQualitySelect'),
    unitSystemSelect: document.getElementById('unitSystemSelect'),
    resetGameButton: document.getElementById('resetGameButton'),
    addCosmicDustButton: document.getElementById('addCosmicDustButton'),
    addEnergyButton: document.getElementById('addEnergyButton'),
    addDarkMatterButton: document.getElementById('addDarkMatterButton'),
    starManagementTabButton: document.getElementById('starManagementTabButton'),
    starManagementScreen: document.getElementById('star-management-screen'),
    starListContainer: document.getElementById('star-list-container'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    gravitySlider: document.getElementById('gravitySlider'),
    gravityValue: document.getElementById('gravityValue'),
    simulationSpeedSlider: document.getElementById('simulationSpeedSlider'),
    simulationSpeedValue: document.getElementById('simulationSpeedValue'),
    dragSlider: document.getElementById('dragSlider'),
    dragValue: document.getElementById('dragValue'),
    addAllResourcesButton: document.getElementById('addAllResourcesButton'),
    galaxyMapContainer: document.getElementById('galaxy-map-container'),
    
    // Cache frequently queried elements
    starActionsDropdowns: null,
    collapsibleHeaders: null
};

export function updateUI() {
    // Calculate current values
    const currentGameYear = Math.floor(gameState.gameYear);
    const currentCosmicDust = Math.floor(gameState.cosmicDust);
    const currentDustRate = (gameState.currentDustRate || 0).toFixed(1);
    const currentEnergy = Math.floor(gameState.energy);
    const currentOrganicMatter = Math.floor(gameState.organicMatter);
    const currentBiomass = Math.floor(gameState.biomass);
    const currentDarkMatter = Math.floor(gameState.darkMatter);
    const currentThoughtPoints = Math.floor(gameState.thoughtPoints);
    const currentStarCount = gameState.stars.length;
    const currentCosmicActivity = Math.floor(gameState.cosmicActivity);
    const currentTotalPopulation = Math.floor(gameState.cachedTotalPopulation || 0);

    // --- Update UI elements if they have changed ---

    // Game Year
    if (previousUIValues.gameYear !== currentGameYear) {
        if (ui.gameYear) ui.gameYear.textContent = currentGameYear;
        previousUIValues.gameYear = currentGameYear;
    }

    // Cosmic Dust
    if (previousUIValues.cosmicDust !== currentCosmicDust) {
        if (ui.cosmicDust) ui.cosmicDust.textContent = currentCosmicDust;
        if (ui.overlayCosmicDust) ui.overlayCosmicDust.textContent = currentCosmicDust;
        previousUIValues.cosmicDust = currentCosmicDust;
    }

    // Dust Rate
    if (previousUIValues.dustRate !== currentDustRate) {
        if (ui.dustRate) ui.dustRate.textContent = currentDustRate;
        previousUIValues.dustRate = currentDustRate;
    }

    // Energy
    if (previousUIValues.energy !== currentEnergy) {
        if (ui.energy) ui.energy.textContent = currentEnergy;
        if (ui.overlayEnergy) ui.overlayEnergy.textContent = currentEnergy;
        previousUIValues.energy = currentEnergy;
    }

    // Organic Matter
    if (previousUIValues.organicMatter !== currentOrganicMatter) {
        if (ui.organicMatter) ui.organicMatter.textContent = currentOrganicMatter;
        previousUIValues.organicMatter = currentOrganicMatter;
    }

    // Biomass
    if (previousUIValues.biomass !== currentBiomass) {
        if (ui.biomass) ui.biomass.textContent = currentBiomass;
        previousUIValues.biomass = currentBiomass;
    }

    // Star Count
    if (previousUIValues.starCount !== currentStarCount) {
        if (ui.starCount) ui.starCount.textContent = currentStarCount;
        if (ui.overlayStarCount) ui.overlayStarCount.textContent = currentStarCount;
        previousUIValues.starCount = currentStarCount;
    }
    
    // Cosmic Activity
    if (previousUIValues.cosmicActivity !== currentCosmicActivity) {
        if (ui.overlayCosmicActivity) ui.overlayCosmicActivity.textContent = currentCosmicActivity;
        previousUIValues.cosmicActivity = currentCosmicActivity;
    }

    // Total Population
    if (previousUIValues.totalPopulation !== currentTotalPopulation) {
        if (ui.overlayPopulation) ui.overlayPopulation.textContent = currentTotalPopulation.toLocaleString();
        previousUIValues.totalPopulation = currentTotalPopulation;
    }

    // Thought Speed
    const LIGHT_SPEED = 299792458;
    const currentThoughtSpeedMps = gameState.thoughtSpeedMps;
    const currentLightSpeedPercent = ((currentThoughtSpeedMps / LIGHT_SPEED) * 100).toFixed(2);
    if (previousUIValues.thoughtSpeedMps !== currentThoughtSpeedMps) {
        if (ui.thoughtSpeedMps) ui.thoughtSpeedMps.textContent = currentThoughtSpeedMps.toLocaleString(undefined, { maximumFractionDigits: 0 });
        previousUIValues.thoughtSpeedMps = currentThoughtSpeedMps;
    }
    if (previousUIValues.lightSpeedPercent !== currentLightSpeedPercent) {
        if (ui.lightSpeedPercent) ui.lightSpeedPercent.textContent = currentLightSpeedPercent;
        previousUIValues.lightSpeedPercent = currentLightSpeedPercent;
    }

    // Upgrades
    const nextDustUpgradeCost = mathCache.getDustUpgradeCost();
    if (previousUIValues.dustUpgradeLevel !== gameState.dustUpgradeLevel) {
        if (ui.dustUpgradeLevel) ui.dustUpgradeLevel.textContent = gameState.dustUpgradeLevel;
        previousUIValues.dustUpgradeLevel = gameState.dustUpgradeLevel;
    }
    if (previousUIValues.dustUpgradeCost !== nextDustUpgradeCost) {
        if (ui.dustUpgradeCost) ui.dustUpgradeCost.textContent = nextDustUpgradeCost;
        if (ui.upgradeDustButton) ui.upgradeDustButton.disabled = gameState.energy < nextDustUpgradeCost;
        previousUIValues.dustUpgradeCost = nextDustUpgradeCost;
    }
    const nextConverterCost = mathCache.getConverterCost();
    if (previousUIValues.darkMatterConverterLevel !== gameState.darkMatterConverterLevel) {
        if (ui.darkMatterConverterLevel) ui.darkMatterConverterLevel.textContent = gameState.darkMatterConverterLevel;
        previousUIValues.darkMatterConverterLevel = gameState.darkMatterConverterLevel;
    }
    if (previousUIValues.darkMatterConverterCost !== nextConverterCost) {
        if (ui.darkMatterConverterCost) ui.darkMatterConverterCost.textContent = nextConverterCost;
        if (ui.upgradeDarkMatterConverterButton) ui.upgradeDarkMatterConverterButton.disabled = gameState.energy < nextConverterCost;
        previousUIValues.darkMatterConverterCost = nextConverterCost;
    }

    // Research Buttons
    if (previousUIValues.researchStates.enhancedDust !== gameState.researchEnhancedDust) {
        if (ui.researchEnhancedDustStatus) ui.researchEnhancedDustStatus.textContent = gameState.researchEnhancedDust ? '完了' : '未完了';
        if (ui.researchEnhancedDustButton) ui.researchEnhancedDustButton.disabled = gameState.researchEnhancedDust || gameState.darkMatter < 1;
        previousUIValues.researchStates.enhancedDust = gameState.researchEnhancedDust;
    }
    if (previousUIValues.researchStates.advancedEnergy !== gameState.researchAdvancedEnergy) {
        if (ui.researchAdvancedEnergyStatus) ui.researchAdvancedEnergyStatus.textContent = gameState.researchAdvancedEnergy ? '完了' : '未完了';
        if (ui.researchAdvancedEnergyButton) ui.researchAdvancedEnergyButton.disabled = gameState.researchAdvancedEnergy || gameState.darkMatter < 5;
        previousUIValues.researchStates.advancedEnergy = gameState.researchAdvancedEnergy;
    }

    // Unlockable bodies
    if (previousUIValues.unlockedBodies.moon !== gameState.unlockedCelestialBodies.moon) {
        if (ui.researchMoonStatus) ui.researchMoonStatus.textContent = gameState.unlockedCelestialBodies.moon ? '完了' : '未完了';
        if (ui.researchMoonButton) ui.researchMoonButton.disabled = gameState.unlockedCelestialBodies.moon || gameState.darkMatter < 10;
        if (ui.createMoonButton) ui.createMoonButton.style.display = gameState.unlockedCelestialBodies.moon ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.moon = gameState.unlockedCelestialBodies.moon;
    }
    if (previousUIValues.unlockedBodies.dwarfPlanet !== gameState.unlockedCelestialBodies.dwarfPlanet) {
        if (ui.researchDwarfPlanetStatus) ui.researchDwarfPlanetStatus.textContent = gameState.unlockedCelestialBodies.dwarfPlanet ? '完了' : '未完了';
        if (ui.researchDwarfPlanetButton) ui.researchDwarfPlanetButton.disabled = gameState.unlockedCelestialBodies.dwarfPlanet || gameState.darkMatter < 20;
        if (ui.createDwarfPlanetButton) ui.createDwarfPlanetButton.style.display = gameState.unlockedCelestialBodies.dwarfPlanet ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.dwarfPlanet = gameState.unlockedCelestialBodies.dwarfPlanet;
    }
    if (previousUIValues.unlockedBodies.planet !== gameState.unlockedCelestialBodies.planet) {
        if (ui.researchPlanetStatus) ui.researchPlanetStatus.textContent = gameState.unlockedCelestialBodies.planet ? '完了' : '未完了';
        if (ui.researchPlanetButton) ui.researchPlanetButton.disabled = gameState.unlockedCelestialBodies.planet || gameState.darkMatter < 50;
        if (ui.createPlanetButton) ui.createPlanetButton.style.display = gameState.unlockedCelestialBodies.planet ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.planet = gameState.unlockedCelestialBodies.planet;
    }
    if (previousUIValues.unlockedBodies.star !== gameState.researchStar) {
        if (ui.researchStarStatus) ui.researchStarStatus.textContent = gameState.researchStar ? '完了' : '未完了';
        if (ui.researchStarButton) ui.researchStarButton.disabled = gameState.researchStar || gameState.darkMatter < 100;
        if (ui.createStarButton) ui.createStarButton.style.display = gameState.researchStar ? 'inline-block' : 'none';
        previousUIValues.unlockedBodies.star = gameState.researchStar;
    }
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

let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2; // Update galaxy map every 0.2 seconds (slower than UI)
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
    map.innerHTML = ''; // マップをクリア

    // Cache map size to avoid repeated clientWidth calls (causes layout reflow)
    let mapSize;
    if (previousGalaxyMapState.mapSize === -1) {
        mapSize = map.clientWidth;
        previousGalaxyMapState.mapSize = mapSize;
    } else {
        mapSize = previousGalaxyMapState.mapSize;
    }
    
    const mapScale = 40000; // 3D空間のどのくらいの範囲をマップに表示するか

    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (!blackHole) return;

    const centerX = blackHole.position.x;
    const centerZ = blackHole.position.z;

    // Use DocumentFragment for batch DOM operations
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
                marker.style.transform = 'translate(-50%, -50%)'; // 中央に配置
            } else if (star.userData.type === 'star') {
                marker.style.width = '2px';
                marker.style.height = '2px';
                marker.style.backgroundColor = 'white';
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)'; // 中央に配置
            }
            fragment.appendChild(marker);
        }
    });

    // Single DOM operation instead of multiple appendChild calls
    map.appendChild(fragment);
}

// Debounced galaxy map update function
export function debouncedUpdateGalaxyMap() {
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    const currentStarCount = gameState.stars.length;
    const currentIsMapVisible = gameState.isMapVisible;
    const currentBlackHolePos = blackHole ? `${blackHole.position.x},${blackHole.position.z}` : null;
    
    // Check if significant changes have occurred
    const significantChange = 
        previousGalaxyMapState.starCount !== currentStarCount ||
        previousGalaxyMapState.isMapVisible !== currentIsMapVisible ||
        previousGalaxyMapState.blackHolePosition !== currentBlackHolePos;
    
    if (significantChange) {
        updateGalaxyMap();
        previousGalaxyMapState.starCount = currentStarCount;
        previousGalaxyMapState.isMapVisible = currentIsMapVisible;
        previousGalaxyMapState.blackHolePosition = currentBlackHolePos;
    }
}