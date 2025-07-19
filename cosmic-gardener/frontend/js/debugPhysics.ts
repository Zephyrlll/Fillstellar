import { gameState } from './state.js';
import { physicsConfig } from './physicsConfig.js';

export function debugOrbitalMechanics() {
    console.log('=== Orbital Mechanics Debug ===');
    
    const physicsSettings = physicsConfig.getPhysics();
    console.log('Physics Settings:', {
        G: physicsSettings.G,
        dragFactor: physicsSettings.dragFactor,
        softeningFactor: physicsSettings.softeningFactor
    });
    
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    const star = gameState.stars.find(s => s.userData.type === 'star');
    
    if (!blackHole || !star) {
        console.log('Black hole or star not found');
        return;
    }
    
    const distance = star.position.distanceTo(blackHole.position);
    const relativePosition = star.position.clone().sub(blackHole.position);
    const velocity = star.userData.velocity;
    const speed = velocity.length();
    
    // Calculate expected circular orbit speed
    const expectedSpeed = Math.sqrt(physicsSettings.G * blackHole.userData.mass / distance);
    
    // Calculate angular momentum
    const angularMomentum = relativePosition.clone().cross(velocity);
    const angularMomentumMagnitude = angularMomentum.length();
    
    // Calculate orbital energy
    const kineticEnergy = 0.5 * star.userData.mass * speed * speed;
    const potentialEnergy = -physicsSettings.G * blackHole.userData.mass * star.userData.mass / distance;
    const totalEnergy = kineticEnergy + potentialEnergy;
    
    console.log('Black Hole:', {
        mass: blackHole.userData.mass,
        position: blackHole.position.toArray()
    });
    
    console.log('Star:', {
        mass: star.userData.mass,
        position: star.position.toArray(),
        velocity: velocity.toArray(),
        speed: speed,
        expectedCircularSpeed: expectedSpeed,
        speedRatio: speed / expectedSpeed
    });
    
    console.log('Orbital Parameters:', {
        distance: distance,
        angularMomentum: angularMomentumMagnitude,
        kineticEnergy: kineticEnergy,
        potentialEnergy: potentialEnergy,
        totalEnergy: totalEnergy,
        isElliptical: totalEnergy < 0 ? 'Yes (bound)' : 'No (unbound)'
    });
    
    // Check for numerical issues
    const acceleration = star.userData.acceleration;
    if (acceleration) {
        console.log('Current Acceleration:', {
            vector: acceleration.toArray(),
            magnitude: acceleration.length()
        });
    }
}

// Export to window for easy debugging
(window as any).debugOrbitalMechanics = debugOrbitalMechanics;