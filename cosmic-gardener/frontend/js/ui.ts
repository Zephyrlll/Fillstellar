
import { gameState, CelestialBody, StarUserData, PlanetUserData } from './state.js';
import { mathCache } from './utils.js';
import { updateProductionUI } from './productionUI.js';

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
    productionScreen: document.getElementById('production-screen'),
    gameTabButton: document.getElementById('gameTabButton'),
    researchTabButton: document.getElementById('researchTabButton'),
    productionTabButton: document.getElementById('productionTabButton'),
    optionsTabButton: document.getElementById('optionsTabButton'),
    starManagementTabButton: document.getElementById('starManagementTabButton'),
    closeOptionsButton: document.getElementById('closeOptionsButton'),
    starListContainer: document.getElementById('star-list-container'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    galaxyMapContainer: document.getElementById('galaxy-map-container'),
    galaxyMapToggle: document.getElementById('galaxy-map-toggle'),
    addAllResourcesButton: document.getElementById('addAllResourcesButton'),
    overlayCosmicDust: document.getElementById('overlayCosmicDust'),
    overlayEnergy: document.getElementById('overlayEnergy'),
    overlayStarCount: document.getElementById('overlayStarCount'),
    overlayThoughtPoints: document.getElementById('overlayThoughtPoints'),
    overlayCosmicActivity: document.getElementById('overlayCosmicActivity'),
    overlayPopulation: document.getElementById('overlayPopulation'),
    resetGameButton: document.getElementById('resetGameButton'),
    resetCameraButton: document.getElementById('resetCameraButton'),
    gravitySlider: document.getElementById('gravitySlider'),
    gravityValue: document.getElementById('gravityValue'),
    simulationSpeedSlider: document.getElementById('simulationSpeedSlider'),
    simulationSpeedValue: document.getElementById('simulationSpeedValue'),
    dragSlider: document.getElementById('dragSlider'),
    dragValue: document.getElementById('dragValue'),
    graphicsQualitySelect: document.getElementById('graphicsQualitySelect'),
    
    // New graphics settings UI elements
    graphicsPresetSelect: document.getElementById('graphicsPresetSelect'),
    resolutionScaleRange: document.getElementById('resolutionScaleRange'),
    resolutionScaleValue: document.getElementById('resolutionScaleValue'),
    textureQualitySelect: document.getElementById('textureQualitySelect'),
    shadowQualitySelect: document.getElementById('shadowQualitySelect'),
    antiAliasingSelect: document.getElementById('antiAliasingSelect'),
    postProcessingSelect: document.getElementById('postProcessingSelect'),
    particleDensityRange: document.getElementById('particleDensityRange'),
    particleDensityValue: document.getElementById('particleDensityValue'),
    viewDistanceSelect: document.getElementById('viewDistanceSelect'),
    frameRateLimitSelect: document.getElementById('frameRateLimitSelect'),
    lightingQualitySelect: document.getElementById('lightingQualitySelect'),
    fogEffectSelect: document.getElementById('fogEffectSelect'),
    objectDetailSelect: document.getElementById('objectDetailSelect'),
    backgroundDetailSelect: document.getElementById('backgroundDetailSelect'),
    uiAnimationsSelect: document.getElementById('uiAnimationsSelect'),
    dynamicQualityCheckbox: document.getElementById('dynamicQualityCheckbox'),
    resetGraphicsButton: document.getElementById('resetGraphicsButton'),
    
    // Performance display elements
    fpsDisplay: document.getElementById('fpsDisplay'),
    frameTimeDisplay: document.getElementById('frameTimeDisplay'),
    memoryDisplay: document.getElementById('memoryDisplay'),
    gpuDisplay: document.getElementById('gpuDisplay'),
    recommendedPresetDisplay: document.getElementById('recommendedPresetDisplay'),
    
    // Collapsible sections
    graphicsHeader: document.getElementById('graphicsHeader'),
    graphicsContent: document.getElementById('graphicsContent'),
    generalSettingsHeader: document.getElementById('generalSettingsHeader'),
    generalSettingsContent: document.getElementById('generalSettingsContent'),
    
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

    // Update time acceleration UI
    updateTimeAccelerationUI();

    // 右下のオーバーレイパネルの更新
    if (ui.overlayCosmicDust) ui.overlayCosmicDust.textContent = String(currentCosmicDust);
    if (ui.overlayEnergy) ui.overlayEnergy.textContent = String(currentEnergy);
    if (ui.overlayStarCount) ui.overlayStarCount.textContent = String(gameState.stars.length);
    if (ui.overlayThoughtPoints) ui.overlayThoughtPoints.textContent = String(currentThoughtPoints);
    
    // 宇宙活動度の計算（天体の総数 + エネルギー生産率）
    const cosmicActivity = gameState.stars.length + Math.floor(currentDustRate || 0);
    if (ui.overlayCosmicActivity) ui.overlayCosmicActivity.textContent = String(cosmicActivity);
    
    // 総人口の表示
    if (ui.overlayPopulation) ui.overlayPopulation.textContent = Math.floor(cachedTotalPopulation || 0).toLocaleString();
    
    updateFocusedBodyUI();
}

function updateTimeAccelerationUI() {
    const timeMultiplierSelect = document.getElementById('timeMultiplierSelect') as HTMLSelectElement;
    const timeMultiplier2xCost = document.getElementById('timeMultiplier2xCost') as HTMLSpanElement;
    const timeMultiplier5xCost = document.getElementById('timeMultiplier5xCost') as HTMLSpanElement;
    const timeMultiplier10xCost = document.getElementById('timeMultiplier10xCost') as HTMLSpanElement;
    const timeMultiplier2xStatus = document.getElementById('timeMultiplier2xStatus') as HTMLSpanElement;
    const timeMultiplier5xStatus = document.getElementById('timeMultiplier5xStatus') as HTMLSpanElement;
    const timeMultiplier10xStatus = document.getElementById('timeMultiplier10xStatus') as HTMLSpanElement;
    const timeMultiplier2xButton = document.getElementById('timeMultiplier2xButton') as HTMLButtonElement;
    const timeMultiplier5xButton = document.getElementById('timeMultiplier5xButton') as HTMLButtonElement;
    const timeMultiplier10xButton = document.getElementById('timeMultiplier10xButton') as HTMLButtonElement;
    
    if (timeMultiplierSelect) {
        timeMultiplierSelect.value = gameState.currentTimeMultiplier.replace('x', '');
        
        // Enable/disable options based on unlocked status
        const options = timeMultiplierSelect.querySelectorAll('option');
        options.forEach(option => {
            const value = option.value + 'x';
            if (value === '1x' || gameState.unlockedTimeMultipliers[value]) {
                option.disabled = false;
            } else {
                option.disabled = true;
            }
        });
    }
    
    if (timeMultiplier2xCost) timeMultiplier2xCost.textContent = String(gameState.timeMultiplierCosts['2x']);
    if (timeMultiplier5xCost) timeMultiplier5xCost.textContent = String(gameState.timeMultiplierCosts['5x']);
    if (timeMultiplier10xCost) timeMultiplier10xCost.textContent = String(gameState.timeMultiplierCosts['10x']);
    
    if (timeMultiplier2xStatus) timeMultiplier2xStatus.textContent = gameState.unlockedTimeMultipliers['2x'] ? '完了' : '未完了';
    if (timeMultiplier5xStatus) timeMultiplier5xStatus.textContent = gameState.unlockedTimeMultipliers['5x'] ? '完了' : '未完了';
    if (timeMultiplier10xStatus) timeMultiplier10xStatus.textContent = gameState.unlockedTimeMultipliers['10x'] ? '完了' : '未完了';
    
    if (timeMultiplier2xButton) timeMultiplier2xButton.disabled = gameState.unlockedTimeMultipliers['2x'] || gameState.thoughtPoints < gameState.timeMultiplierCosts['2x'];
    if (timeMultiplier5xButton) timeMultiplier5xButton.disabled = gameState.unlockedTimeMultipliers['5x'] || gameState.thoughtPoints < gameState.timeMultiplierCosts['5x'];
    if (timeMultiplier10xButton) timeMultiplier10xButton.disabled = gameState.unlockedTimeMultipliers['10x'] || gameState.thoughtPoints < gameState.timeMultiplierCosts['10x'];
}

export function switchTab(activeTab: string) {
    console.log('📑 Switching to tab:', activeTab);
    
    // Hide/show galaxy map toggle based on active tab
    if (ui.galaxyMapToggle) {
        if (activeTab === 'options' || activeTab === 'research' || activeTab === 'starManagement') {
            ui.galaxyMapToggle.style.display = 'none';
        } else {
            ui.galaxyMapToggle.style.display = 'flex';
        }
    }
    
    if (ui.gameScreen) ui.gameScreen.classList.add('hidden-screen');
    if (ui.researchScreen) ui.researchScreen.classList.add('hidden-screen');
    if (ui.productionScreen) ui.productionScreen.classList.add('hidden-screen');
    if (ui.optionsScreen) ui.optionsScreen.classList.add('hidden-screen');
    if (ui.starManagementScreen) ui.starManagementScreen.classList.add('hidden-screen');
    if (ui.gameTabButton) ui.gameTabButton.classList.remove('active-tab');
    if (ui.researchTabButton) ui.researchTabButton.classList.remove('active-tab');
    if (ui.productionTabButton) ui.productionTabButton.classList.remove('active-tab');
    if (ui.optionsTabButton) ui.optionsTabButton.classList.remove('active-tab');
    if (ui.starManagementTabButton) ui.starManagementTabButton.classList.remove('active-tab');

    if (activeTab === 'game') {
        if (ui.gameScreen) ui.gameScreen.classList.remove('hidden-screen');
        if (ui.gameTabButton) ui.gameTabButton.classList.add('active-tab');
    } else if (activeTab === 'research') {
        if (ui.researchScreen) ui.researchScreen.classList.remove('hidden-screen');
        if (ui.researchTabButton) ui.researchTabButton.classList.add('active-tab');
    } else if (activeTab === 'production') {
        if (ui.productionScreen) ui.productionScreen.classList.remove('hidden-screen');
        if (ui.productionTabButton) ui.productionTabButton.classList.add('active-tab');
        updateProductionUI(true);
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

export function showMessage(message: string, typeOrDuration: string | number = 2000) {
    let duration = 2000;
    let messageType = 'info';
    
    if (typeof typeOrDuration === 'number') {
        duration = typeOrDuration;
    } else {
        messageType = typeOrDuration;
        // Set duration based on message type
        switch(messageType) {
            case 'error': duration = 5000; break;
            case 'warning': duration = 3000; break;
            case 'success': duration = 2000; break;
            default: duration = 2000;
        }
    }
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
        map.classList.add('collapsed');
        if (ui.galaxyMapToggle) {
            ui.galaxyMapToggle.textContent = '📡';
            ui.galaxyMapToggle.title = 'レーダーを開く';
        }
        return;
    }
    map.classList.remove('collapsed');
    if (ui.galaxyMapToggle) {
        ui.galaxyMapToggle.textContent = '📶';
        ui.galaxyMapToggle.title = 'レーダーを閉じる';
    }
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

// Production panel management
let isProductionPanelOpen = false;

export function toggleProductionPanel(): void {
    const panel = document.getElementById('production-panel');
    if (!panel) return;
    
    if (isProductionPanelOpen) {
        closeProductionPanel();
    } else {
        openProductionPanel();
    }
}

export function openProductionPanel(): void {
    const panel = document.getElementById('production-panel');
    if (!panel) return;
    
    panel.classList.add('active');
    isProductionPanelOpen = true;
    
    // Force update production UI when panel opens
    updateProductionUI(true);
    
    console.log('🏭 Production panel opened');
}

export function closeProductionPanel(): void {
    const panel = document.getElementById('production-panel');
    if (!panel) return;
    
    panel.classList.remove('active');
    isProductionPanelOpen = false;
    
    console.log('🏭 Production panel closed');
}

export function isProductionPanelVisible(): boolean {
    return isProductionPanelOpen;
}

// === Graphics Settings UI Management === //

export function updateGraphicsUI(): void {
    const graphics = gameState.graphics;
    
    // Update preset selection
    if (ui.graphicsPresetSelect) {
        (ui.graphicsPresetSelect as HTMLSelectElement).value = graphics.preset;
    }
    
    // Update resolution scale
    if (ui.resolutionScaleRange && ui.resolutionScaleValue) {
        const scalePercent = Math.round(graphics.resolutionScale * 100);
        (ui.resolutionScaleRange as HTMLInputElement).value = scalePercent.toString();
        (ui.resolutionScaleValue as HTMLElement).textContent = `${scalePercent}%`;
    }
    
    // Update particle density
    if (ui.particleDensityRange && ui.particleDensityValue) {
        const densityPercent = Math.round(graphics.particleDensity * 100);
        (ui.particleDensityRange as HTMLInputElement).value = densityPercent.toString();
        (ui.particleDensityValue as HTMLElement).textContent = `${densityPercent}%`;
    }
    
    // Update all select elements
    const selectElements = [
        { element: ui.textureQualitySelect, value: graphics.textureQuality },
        { element: ui.shadowQualitySelect, value: graphics.shadowQuality },
        { element: ui.antiAliasingSelect, value: graphics.antiAliasing },
        { element: ui.postProcessingSelect, value: graphics.postProcessing },
        { element: ui.viewDistanceSelect, value: graphics.viewDistance },
        { element: ui.frameRateLimitSelect, value: graphics.frameRateLimit.toString() },
        { element: ui.lightingQualitySelect, value: graphics.lightingQuality },
        { element: ui.fogEffectSelect, value: graphics.fogEffect },
        { element: ui.objectDetailSelect, value: graphics.objectDetail },
        { element: ui.backgroundDetailSelect, value: graphics.backgroundDetail },
        { element: ui.uiAnimationsSelect, value: graphics.uiAnimations }
    ];
    
    selectElements.forEach(({ element, value }) => {
        if (element) {
            (element as HTMLSelectElement).value = value;
        }
    });
    
    // Update performance display
    updatePerformanceDisplay();
    
    // Update device info display
    updateDeviceInfoDisplay();
}

export function updatePerformanceDisplay(): void {
    const perf = gameState.graphics.performance;
    
    if (ui.fpsDisplay) {
        ui.fpsDisplay.textContent = perf.fps.toString();
        
        // Apply color coding based on FPS
        ui.fpsDisplay.className = '';
        if (perf.fps < 30) {
            ui.fpsDisplay.classList.add('fps-critical');
        } else if (perf.fps < 50) {
            ui.fpsDisplay.classList.add('fps-warning');
        }
    }
    
    if (ui.frameTimeDisplay) {
        ui.frameTimeDisplay.textContent = perf.frameTime.toFixed(1);
    }
    
    if (ui.memoryDisplay) {
        ui.memoryDisplay.textContent = perf.memoryUsage.toString();
        
        // Apply color coding based on memory usage
        ui.memoryDisplay.className = '';
        if (perf.memoryUsage > 1000) {
            ui.memoryDisplay.classList.add('memory-critical');
        } else if (perf.memoryUsage > 500) {
            ui.memoryDisplay.classList.add('memory-high');
        }
    }
}

export function updateDeviceInfoDisplay(): void {
    const device = gameState.graphics.deviceInfo;
    
    if (ui.gpuDisplay) {
        ui.gpuDisplay.textContent = device.gpu || '検出中...';
    }
    
    if (ui.recommendedPresetDisplay) {
        ui.recommendedPresetDisplay.textContent = device.recommendedPreset || '中';
        
        // Apply quality color class
        ui.recommendedPresetDisplay.className = `quality-${device.recommendedPreset}`;
    }
}

export function syncUIWithGraphicsState(): void {
    // This function syncs the UI elements with the current graphics state
    // Called when settings are loaded or when preset is applied
    updateGraphicsUI();
}

export function resetGraphicsToDefaults(): void {
    // Reset graphics settings to medium preset
    const mediumPreset = {
        preset: 'medium',
        resolutionScale: 1.0,
        textureQuality: 'medium',
        shadowQuality: 'medium',
        antiAliasing: 'fxaa',
        postProcessing: 'medium',
        particleDensity: 0.5,
        viewDistance: 'medium',
        frameRateLimit: 60,
        vsync: 'adaptive',
        lightingQuality: 'medium',
        fogEffect: 'standard',
        renderPrecision: 'standard',
        objectDetail: 'medium',
        backgroundDetail: 'standard',
        uiAnimations: 'standard'
    };
    
    // Apply settings to gameState
    Object.assign(gameState.graphics, mediumPreset);
    
    // Update UI to reflect changes
    updateGraphicsUI();
    
    console.log('🔄 Graphics settings reset to defaults');
}

export function getGraphicsSettingValue(settingName: string): any {
    const element = ui[settingName + 'Select'] || ui[settingName + 'Range'];
    if (!element) return null;
    
    if (element instanceof HTMLSelectElement) {
        return element.value;
    } else if (element instanceof HTMLInputElement) {
        if (element.type === 'range') {
            return parseFloat(element.value) / 100; // Convert percentage back to decimal
        } else if (element.type === 'checkbox') {
            return element.checked;
        }
        return element.value;
    }
    
    return null;
}

export function setGraphicsSettingValue(settingName: string, value: any): void {
    const element = ui[settingName + 'Select'] || ui[settingName + 'Range'] || ui[settingName + 'Checkbox'];
    if (!element) return;
    
    if (element instanceof HTMLSelectElement) {
        element.value = value.toString();
    } else if (element instanceof HTMLInputElement) {
        if (element.type === 'range') {
            element.value = (value * 100).toString(); // Convert decimal to percentage
        } else if (element.type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value.toString();
        }
    }
}
