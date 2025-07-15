import * as THREE from 'three';
import { gameState } from './state.js';
import { celestialObjectPools, starGeometry } from './utils.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
import { soundManager } from './sound.js';
function createStar() {
    const starTypes = [
        { type: 'red', tempMin: 2400, tempMax: 3700, massMin: 0.08, massMax: 0.45 },
        { type: 'orange', tempMin: 3700, tempMax: 5200, massMin: 0.45, massMax: 0.8 },
        { type: 'yellow', tempMin: 5200, tempMax: 6000, massMin: 0.8, massMax: 1.04 },
        { type: 'white', tempMin: 6000, tempMax: 7500, massMin: 1.04, massMax: 1.4 },
        { type: 'blue', tempMin: 7500, tempMax: 30000, massMin: 1.4, massMax: 16 }
    ];
    const selectedType = starTypes[Math.floor(Math.random() * starTypes.length)];
    const age = Math.random() * 500;
    const temperature = Math.floor(Math.random() * (selectedType.tempMax - selectedType.tempMin + 1)) + selectedType.tempMin;
    const mass = Math.random() * (selectedType.massMax - selectedType.massMin) + selectedType.massMin;
    const starData = {
        age: age.toFixed(2),
        temperature: temperature,
        mass: parseFloat(mass.toFixed(2)),
        spectralType: selectedType.type
    };
    starData.lifespan = calculateStarLifespan(starData);
    return starData;
}
function calculateStarLifespan(starData) {
    if (starData.mass < 0.1)
        return 1000;
    if (starData.mass < 0.5)
        return 500;
    if (starData.mass < 1.0)
        return 200;
    if (starData.mass < 2.0)
        return 50;
    if (starData.mass < 5.0)
        return 10;
    return 5;
}
function createPlanet(parentStar) {
    const parentMass = parentStar.userData.mass;
    const mass = parentMass * (Math.random() * 0.005 + 0.0001);
    const radius = Math.cbrt(mass);
    const temperature = Math.floor(Math.random() * 300) - 150;
    const atmosphere = Math.random();
    const water = Math.random();
    let planetType = (mass < parentMass * 0.01) ? 'rocky' : 'gas_giant';
    let subType = 'unknown';
    let geologicalActivity = 0;
    if (planetType === 'rocky') {
        geologicalActivity = Math.random();
        if (water > 0.7 && temperature > -50 && temperature < 50) {
            subType = 'ocean_world';
        }
        else if (temperature < -50) {
            subType = 'ice_world';
            geologicalActivity *= 0.2;
        }
        else if (water < 0.1 && temperature > 0) {
            subType = 'desert_world';
        }
        else {
            subType = 'terran';
        }
    }
    else {
        subType = (temperature > 0) ? 'jupiter_like' : 'neptune_like';
    }
    const planetData = {
        mass: parseFloat(mass.toFixed(5)),
        radius: parseFloat(radius.toFixed(5)),
        planetType: planetType,
        subType: subType,
        temperature: temperature,
        atmosphere: atmosphere.toFixed(2),
        water: water.toFixed(2),
        geologicalActivity: geologicalActivity.toFixed(2)
    };
    planetData.habitability = calculateHabitability(planetData);
    return planetData;
}
function calculateHabitability(planetData) {
    let score = 0;
    const temp = planetData.temperature;
    if (temp >= 0 && temp <= 40)
        score += 40;
    else if (temp > -50 && temp < 90)
        score += 20;
    const atm = parseFloat(planetData.atmosphere);
    if (atm >= 0.5 && atm <= 0.8)
        score += 30;
    else if (atm > 0.2 && atm < 1.0)
        score += 15;
    const water = parseFloat(planetData.water);
    score += water * 30;
    return Math.min(100, Math.max(0, Math.floor(score)));
}
export function checkLifeSpawn(planetObject) {
    const userData = planetObject.userData;
    if (userData.type !== 'planet' ||
        userData.hasLife ||
        userData.planetType !== 'rocky' ||
        (userData.subType !== 'terran' && userData.subType !== 'ocean_world') ||
        userData.habitability < 70) {
        return;
    }
    const spawnChance = (userData.habitability / 100) * 0.0001;
    if (Math.random() < spawnChance) {
        userData.hasLife = true;
        userData.lifeStage = 'microbial';
        userData.population = 10;
        const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
        const radius = planetObject.children[0].scale.x;
        const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
        const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
        auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
        auraSphere.name = 'life_aura';
        auraSphere.userData.originalRadius = radius * 1.1;
        auraSphere.userData.materialType = 'lifeAura';
        planetObject.add(auraSphere);
        showMessage(`${userData.name} に生命が誕生しました！`);
        addTimelineLog(`${userData.name}に生命が誕生しました`, 'evolution');
        // 生命誕生サウンドの再生
        soundManager.playEvolutionSound('microbial', planetObject.position);
    }
}
export function evolveLife(planetObject) {
    const userData = planetObject.userData;
    if (!userData.hasLife)
        return;
    const currentStage = userData.lifeStage;
    const ageInYears = gameState.gameYear - userData.creationYear;
    let nextStage = null;
    switch (currentStage) {
        case 'microbial':
            if (ageInYears >= 50)
                nextStage = 'plant';
            break;
        case 'plant':
            if (ageInYears >= 100)
                nextStage = 'animal';
            break;
        case 'animal':
            if (ageInYears >= 200)
                nextStage = 'intelligent';
            break;
    }
    if (nextStage) {
        userData.lifeStage = nextStage;
        showMessage(`${userData.name} の生命が ${nextStage} に進化しました！`);
        const stageNames = {
            'plant': '植物',
            'animal': '動物',
            'intelligent': '知的生命体'
        };
        addTimelineLog(`${userData.name}で生命が${stageNames[nextStage]}に進化しました`, 'evolution');
        // 進化サウンドの再生
        soundManager.playEvolutionSound(nextStage, planetObject.position);
        if (nextStage === 'intelligent') {
            const planetMesh = planetObject.children[0];
            if (planetMesh && planetMesh.material && planetMesh.material.map) {
                const texture = planetMesh.material.map;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        if (brightness < 80 && Math.random() < 0.1) {
                            data[i] = 255;
                            data[i + 1] = 220;
                            data[i + 2] = 180;
                        }
                    }
                    context.putImageData(imageData, 0, 0);
                    texture.needsUpdate = true;
                }
            }
        }
    }
}
const createRealisticPlanetMaps = (subType, water, atmosphere) => {
    const width = 512, height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalContext = normalCanvas.getContext('2d');
    if (!context || !normalContext) {
        return { map: null, normalMap: null };
    }
    let baseColor, landColor, oceanColor;
    switch (subType) {
        case 'jupiter_like':
            baseColor = new THREE.Color(0xD2B48C);
            for (let y = 0; y < height; y++) {
                const bandFactor = Math.sin(y / (height / (Math.random() * 12 + 6))) * 0.5 + 0.5;
                const c = baseColor.clone().offsetHSL(0, bandFactor * 0.2 - 0.1, bandFactor * 0.1 - 0.05);
                context.fillStyle = c.getStyle();
                context.fillRect(0, y, width, 1);
            }
            break;
        case 'neptune_like':
            baseColor = new THREE.Color(0x4169E1);
            for (let y = 0; y < height; y++) {
                const bandFactor = Math.sin(y / (height / (Math.random() * 8 + 4))) * 0.5 + 0.5;
                const c = baseColor.clone().offsetHSL(0, 0, bandFactor * 0.3 - 0.15);
                context.fillStyle = c.getStyle();
                context.fillRect(0, y, width, 1);
            }
            break;
        case 'ocean_world':
            oceanColor = new THREE.Color(0x1e90ff);
            landColor = new THREE.Color(0x32cd32);
            context.fillStyle = oceanColor.getStyle();
            context.fillRect(0, 0, width, height);
            for (let i = 0; i < 1000; i++) {
                context.fillStyle = landColor.getStyle();
                context.fillRect(Math.random() * width, Math.random() * height, 3, 3);
            }
            break;
        case 'ice_world':
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            for (let i = 0; i < 50; i++) {
                context.strokeStyle = '#cccccc';
                context.beginPath();
                context.moveTo(Math.random() * width, Math.random() * height);
                context.lineTo(Math.random() * width, Math.random() * height);
                context.stroke();
            }
            break;
        case 'desert_world':
            context.fillStyle = new THREE.Color(0xF4A460).getStyle();
            context.fillRect(0, 0, width, height);
            for (let i = 0; i < height; i += 4) {
                context.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                context.fillRect(0, i, width, 2);
            }
            break;
        case 'terran':
        default:
            oceanColor = new THREE.Color(0x4682b4);
            landColor = new THREE.Color(0x228b22);
            context.fillStyle = oceanColor.getStyle();
            context.fillRect(0, 0, width, height);
            for (let i = 0; i < 50000; i++) {
                if (Math.random() > water) {
                    context.fillStyle = landColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2).getStyle();
                    context.fillRect(Math.random() * width, Math.random() * height, 2, 2);
                }
            }
            break;
    }
    normalContext.drawImage(canvas, 0, 0);
    const imgData = context.getImageData(0, 0, width, height);
    const normalData = normalContext.createImageData(width, height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            const tx = (imgData.data[i - 4] - imgData.data[i + 4]) / 255;
            const ty = (imgData.data[i - width * 4] - imgData.data[i + width * 4]) / 255;
            const normal = new THREE.Vector3(tx, ty, 1).normalize();
            normalData.data[i] = (normal.x * 0.5 + 0.5) * 255;
            normalData.data[i + 1] = (normal.y * 0.5 + 0.5) * 255;
            normalData.data[i + 2] = (normal.z * 0.5 + 0.5) * 255;
            normalData.data[i + 3] = 255;
        }
    }
    normalContext.putImageData(normalData, 0, 0);
    return { map: new THREE.CanvasTexture(canvas), normalMap: new THREE.CanvasTexture(normalCanvas) };
};
export function createCelestialBody(type, options = {}) {
    let body;
    const materialParams = { color: new THREE.Color(0xffffff), roughness: 0.8, metalness: 0.2, emissive: new THREE.Color(0x000000), emissiveIntensity: 0.2 };
    let radius = 1;
    let gameMass = 0;
    let starParams = null;
    let planetParams = null;
    const starColors = {
        'red': new THREE.Color(0xFF4000),
        'orange': new THREE.Color(0xFFA500),
        'yellow': new THREE.Color(0xFFFF00),
        'white': new THREE.Color(0xFFFFFF),
        'blue': new THREE.Color(0x87CEEB)
    };
    const createRealisticAsteroid = (radius) => {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const position = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
            vertex.fromBufferAttribute(position, i);
            vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.6);
            if (Math.random() < 0.1) {
                vertex.multiplyScalar(0.9 + Math.random() * 0.05);
            }
            position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.computeVertexNormals();
        return geometry;
    };
    if (options.isLoading) {
        const data = options.userData;
        gameMass = data.mass;
        radius = data.radius || 1;
        if (type === 'planet')
            planetParams = data;
        else if (type === 'star')
            starParams = data;
    }
    else {
        switch (type) {
            case 'star':
                starParams = createStar();
                gameMass = starParams.mass * 1000;
                break;
            case 'planet':
                planetParams = createPlanet(options.parent);
                gameMass = planetParams.mass;
                console.log(`[Mass Debug] Created planet with mass string: "${planetParams.mass}", parsed to: ${gameMass}`);
                break;
            case 'moon':
                const parentMassForMoon = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForMoon * (Math.random() * 0.0002 + 0.00002);
                break;
            case 'dwarfPlanet':
                const parentMassForDwarfPlanet = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForDwarfPlanet * (Math.random() * 0.0005 + 0.00005);
                break;
            case 'asteroid':
                const parentMassForAsteroid = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForAsteroid * (Math.random() * 0.00001 + 0.000001);
                break;
            case 'comet':
                const parentMassForComet = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForComet * (Math.random() * 0.000005 + 0.0000005);
                break;
            case 'black_hole':
                gameMass = options.mass || 10000000;
                radius = options.radius || 500;
                break;
        }
    }
    switch (type) {
        case 'black_hole':
            const blackHoleGroup = new THREE.Group();
            const horizonMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.9,
                depthTest: false,
                fog: false
            });
            const horizon = new THREE.Mesh(starGeometry.clone(), horizonMaterial);
            horizon.scale.set(radius, radius, radius);
            horizon.renderOrder = 1000;
            horizon.frustumCulled = false;
            blackHoleGroup.add(horizon);
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.8,
                side: THREE.BackSide,
                depthTest: false,
                fog: false
            });
            const outline = new THREE.Mesh(starGeometry.clone(), outlineMaterial);
            outline.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
            outline.renderOrder = 999;
            outline.frustumCulled = false;
            blackHoleGroup.add(outline);
            const edgeGlowGeometry = new THREE.TorusGeometry(radius * 1.02, radius * 0.05, 16, 100);
            const edgeGlowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 1.0,
                depthTest: false,
                fog: false
            });
            const edgeGlow = new THREE.Mesh(edgeGlowGeometry, edgeGlowMaterial);
            edgeGlow.name = 'black_hole_edge_glow';
            edgeGlow.renderOrder = 1001;
            edgeGlow.frustumCulled = false;
            blackHoleGroup.add(edgeGlow);
            const diskGeometry = new THREE.RingGeometry(radius * 1.1, radius * 2.5, 64);
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const context = canvas.getContext('2d');
            if (context) {
                const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
                gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, 256, 256);
                const diskTexture = new THREE.CanvasTexture(canvas);
                const diskMaterial = new THREE.MeshBasicMaterial({
                    map: diskTexture,
                    side: THREE.DoubleSide,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    opacity: 0.9,
                    fog: false
                });
                const disk = new THREE.Mesh(diskGeometry, diskMaterial);
                disk.rotation.x = Math.PI / 2;
                disk.renderOrder = 998;
                disk.frustumCulled = false;
                blackHoleGroup.add(disk);
            }
            blackHoleGroup.frustumCulled = false;
            body = blackHoleGroup;
            break;
        case 'star':
            // 恒星は大きいが、ゲーム性を考慮して適度に調整
            radius = Math.max(Math.cbrt(gameMass) * 8.0, 15.0);
            const starColor = starColors[starParams.spectralType] || new THREE.Color(0xffffff);
            materialParams.color.set(starColor);
            materialParams.emissive.set(starColor);
            materialParams.emissiveIntensity = 1.8;
            materialParams.metalness = 0.0;
            materialParams.roughness = 1.0;
            const starSphereGeometry = celestialObjectPools.getSphereGeometry(radius);
            const starMaterial = celestialObjectPools.getMaterial('star', materialParams);
            body = new THREE.Mesh(starSphereGeometry, starMaterial);
            body.scale.set(radius, radius, radius);
            body.userData.originalRadius = radius;
            body.userData.materialType = 'star';
            break;
        case 'planet':
            // 惑星は恒星より小さいが、視認できるサイズを確保
            radius = Math.max(Math.cbrt(gameMass) * 2.5, 3.0);
            const maps = createRealisticPlanetMaps(planetParams.subType, parseFloat(planetParams.water), parseFloat(planetParams.atmosphere));
            if (maps.map && maps.normalMap) {
                const planetMaterial = celestialObjectPools.getMaterial('planet', {
                    map: maps.map,
                    normalMap: maps.normalMap,
                    normalScale: new THREE.Vector2(0.8, 0.8),
                    emissive: new THREE.Color(0x001133),
                    emissiveIntensity: 0.15,
                    roughness: 0.6,
                    metalness: 0.1,
                    envMapIntensity: 0.5
                });
                const planetGeometry = celestialObjectPools.getSphereGeometry(radius);
                const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
                planetMesh.scale.set(radius, radius, radius);
                planetMesh.userData.originalRadius = radius;
                planetMesh.userData.materialType = 'planet';
                body = new THREE.Group();
                body.add(planetMesh);
                if (parseFloat(planetParams.atmosphere) > 0.1) {
                    let atmosphereColor = 0xffffff;
                    if (planetParams.subType === 'neptune_like')
                        atmosphereColor = 0x4169E1;
                    else if (planetParams.subType === 'terran' || planetParams.subType === 'ocean_world')
                        atmosphereColor = 0x87ceeb;
                    const atmosphereMaterial = celestialObjectPools.getMaterial('atmosphere', {
                        color: atmosphereColor,
                        transparent: true,
                        opacity: parseFloat(planetParams.atmosphere) * 0.3,
                        blending: THREE.AdditiveBlending
                    });
                    const atmosphereGeometry = celestialObjectPools.getSphereGeometry(radius * 1.05);
                    const atmosphereSphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                    atmosphereSphere.name = 'atmosphere';
                    atmosphereSphere.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
                    atmosphereSphere.userData.originalRadius = radius * 1.05;
                    atmosphereSphere.userData.materialType = 'atmosphere';
                    body.add(atmosphereSphere);
                }
                if (planetParams.planetType === 'gas_giant' && Math.random() < 0.5) {
                    const ringTexture = new THREE.CanvasTexture(document.createElement('canvas'));
                    const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64), ringMaterial);
                    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
                    body.add(ring);
                }
            }
            break;
        case 'moon':
            // 衛星は惑星より小さいが、最小サイズを確保
            radius = Math.max(Math.cbrt(gameMass) * 1.8, 1.5);
            const moonGeometry = celestialObjectPools.getSphereGeometry(radius);
            const moonMaterial = new THREE.MeshStandardMaterial({
                color: 0x999999,
                roughness: 0.8,
                metalness: 0.1,
                emissive: new THREE.Color(0x333333),
                emissiveIntensity: 0.1
            });
            body = new THREE.Mesh(moonGeometry, moonMaterial);
            body.scale.set(radius, radius, radius);
            // 視認性向上のため薄いアウトラインを追加
            const moonOutlineGeometry = celestialObjectPools.getSphereGeometry(radius);
            const moonOutlineMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.2,
                side: THREE.BackSide
            });
            const moonOutline = new THREE.Mesh(moonOutlineGeometry, moonOutlineMaterial);
            moonOutline.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
            body.add(moonOutline);
            break;
        case 'dwarfPlanet':
            // 準惑星は惑星と衛星の中間サイズ
            radius = Math.max(Math.cbrt(gameMass) * 2.0, 2.0);
            const dwarfGeometry = celestialObjectPools.getSphereGeometry(radius);
            const dwarfMaterial = new THREE.MeshStandardMaterial({
                color: 0xaa8866,
                roughness: 0.9,
                metalness: 0.2
            });
            body = new THREE.Mesh(dwarfGeometry, dwarfMaterial);
            body.scale.set(radius, radius, radius);
            break;
        case 'asteroid':
            // 小惑星は小さいが、視認できる最小サイズを確保
            radius = Math.max(Math.cbrt(gameMass) * 1.0, 0.8);
            const asteroidGeom = createRealisticAsteroid(radius);
            const asteroidMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.9,
                metalness: 0.5,
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 0.05
            });
            body = new THREE.Mesh(asteroidGeom, asteroidMaterial);
            // 視認性向上のため薄いアウトラインを追加
            const asteroidOutlineGeometry = celestialObjectPools.getSphereGeometry(radius);
            const asteroidOutlineMaterial = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa,
                transparent: true,
                opacity: 0.15,
                side: THREE.BackSide
            });
            const asteroidOutline = new THREE.Mesh(asteroidOutlineGeometry, asteroidOutlineMaterial);
            asteroidOutline.scale.set(radius * 1.08, radius * 1.08, radius * 1.08);
            body.add(asteroidOutline);
            break;
        case 'comet':
            // 彗星は小惑星より少し大きく、コマの視認性を確保
            radius = Math.max(Math.cbrt(gameMass) * 1.2, 1.0);
            const coreGeometry = new THREE.SphereGeometry(radius, 16, 16);
            const coreMaterial = new THREE.MeshBasicMaterial({
                color: 0xaaddff,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8
            });
            body = new THREE.Mesh(coreGeometry, coreMaterial);
            // 彗星のコマ効果を追加
            const comaGeometry = new THREE.SphereGeometry(radius * 2, 12, 12);
            const comaMaterial = new THREE.MeshBasicMaterial({
                color: 0x66aaff,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            const coma = new THREE.Mesh(comaGeometry, comaMaterial);
            body.add(coma);
            // 視認性向上のためのアウトライン
            const cometOutlineGeometry = new THREE.SphereGeometry(radius * 1.1, 12, 12);
            const cometOutlineMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            const cometOutline = new THREE.Mesh(cometOutlineGeometry, cometOutlineMaterial);
            body.add(cometOutline);
            break;
        default:
            body = new THREE.Mesh(starGeometry.clone(), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
            break;
    }
    let finalUserData = {
        type: type,
        name: options.name || `${type}-${Math.random().toString(16).slice(2, 8)}`,
        creationYear: gameState.gameYear,
        mass: gameMass,
        velocity: options.velocity ? options.velocity.clone() : new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        isStatic: type === 'black_hole',
        radius: radius
    };
    const additionalData = options.isLoading ? options.userData : (planetParams || starParams);
    if (additionalData) {
        Object.assign(finalUserData, body.userData, additionalData);
        if (typeof finalUserData.mass === 'string') {
            finalUserData.mass = parseFloat(finalUserData.mass) || 0;
        }
        finalUserData.mass = gameMass;
        if (Array.isArray(finalUserData.velocity)) {
            finalUserData.velocity = new THREE.Vector3().fromArray(finalUserData.velocity);
        }
        if (!finalUserData.acceleration) {
            finalUserData.acceleration = new THREE.Vector3(0, 0, 0);
        }
        else if (Array.isArray(finalUserData.acceleration)) {
            finalUserData.acceleration = new THREE.Vector3().fromArray(finalUserData.acceleration);
        }
        if (!isFinite(finalUserData.velocity.x) || !isFinite(finalUserData.velocity.y) || !isFinite(finalUserData.velocity.z)) {
            console.warn(`Invalid velocity detected for ${finalUserData.name}, resetting to zero.`);
            finalUserData.velocity.set(0, 0, 0);
        }
        if (!isFinite(finalUserData.acceleration.x) || !isFinite(finalUserData.acceleration.y) || !isFinite(finalUserData.acceleration.z)) {
            console.warn(`Invalid acceleration detected for ${finalUserData.name}, resetting to zero.`);
            finalUserData.acceleration.set(0, 0, 0);
        }
    }
    body.userData = finalUserData;
    if (options.position) {
        body.position.copy(options.position);
    }
    if (type === 'star' && !options.isLoading) {
        const pointLight = new THREE.PointLight(materialParams.emissive, 2, 4000);
        body.add(pointLight);
    }
    return body;
}
