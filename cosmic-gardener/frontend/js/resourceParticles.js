// Resource Quality Visual Effects
import * as THREE from 'three';
import { QualityTier, QUALITY_MULTIPLIERS } from './resourceSystem.js';
import { scene } from './threeSetup.js';
class ResourceParticleSystem {
    particles = [];
    particlePool = [];
    particleGeometry;
    constructor() {
        // Create reusable particle geometry
        this.particleGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(30); // 10 particles * 3 coordinates
        for (let i = 0; i < 30; i += 3) {
            vertices[i] = (Math.random() - 0.5) * 2;
            vertices[i + 1] = (Math.random() - 0.5) * 2;
            vertices[i + 2] = (Math.random() - 0.5) * 2;
        }
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
    createQualityParticles(element, quality) {
        if (quality <= QualityTier.STANDARD)
            return; // Only show particles for high quality+
        const qualityData = QUALITY_MULTIPLIERS[quality];
        const color = new THREE.Color(qualityData.particleColor);
        // Get or create particle system from pool
        let particleSystem = this.particlePool.pop();
        if (!particleSystem) {
            const material = new THREE.PointsMaterial({
                size: 0.5,
                transparent: true,
                opacity: 0.8,
                vertexColors: false,
                blending: THREE.AdditiveBlending
            });
            particleSystem = new THREE.Points(this.particleGeometry.clone(), material);
        }
        // Update material color
        particleSystem.material.color = color;
        particleSystem.material.opacity = 0.8;
        // Position relative to UI element
        const rect = element.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth * 2 - 1;
        const y = -(rect.top + rect.height / 2) / window.innerHeight * 2 + 1;
        // Convert screen coordinates to 3D world position
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(scene.children[0]); // Assuming camera is first child
        particleSystem.position.copy(vector);
        scene.add(particleSystem);
        this.particles.push({
            mesh: particleSystem,
            quality,
            lifetime: 0,
            maxLifetime: 2 + quality * 0.5, // Higher quality = longer lifetime
            targetElement: element
        });
    }
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.lifetime += deltaTime;
            // Update particle animation
            const progress = particle.lifetime / particle.maxLifetime;
            const material = particle.mesh.material;
            // Fade out
            material.opacity = 0.8 * (1 - progress);
            // Float upward
            particle.mesh.position.y += deltaTime * 0.5;
            // Rotate
            particle.mesh.rotation.y += deltaTime * 2;
            // Scale based on quality
            const scale = 1 + QUALITY_MULTIPLIERS[particle.quality].glowIntensity * progress;
            particle.mesh.scale.setScalar(scale);
            // Remove expired particles
            if (particle.lifetime >= particle.maxLifetime) {
                scene.remove(particle.mesh);
                this.particlePool.push(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
    // Create glow effect for resource containers
    addQualityGlow(element, quality) {
        const qualityData = QUALITY_MULTIPLIERS[quality];
        // Add CSS glow effect
        element.style.boxShadow = `
            0 0 ${10 * qualityData.glowIntensity}px ${qualityData.color},
            inset 0 0 ${5 * qualityData.glowIntensity}px ${qualityData.particleColor}
        `;
        // Add pulsing animation for legendary items
        if (quality === QualityTier.LEGENDARY) {
            element.style.animation = 'legendary-pulse 2s ease-in-out infinite';
        }
    }
    // Clear all particles
    clear() {
        this.particles.forEach(particle => {
            scene.remove(particle.mesh);
            this.particlePool.push(particle.mesh);
        });
        this.particles = [];
    }
}
// Global particle system instance
export const resourceParticleSystem = new ResourceParticleSystem();
// CSS animations for quality effects
const style = document.createElement('style');
style.textContent = `
    @keyframes legendary-pulse {
        0%, 100% { 
            filter: brightness(1) drop-shadow(0 0 10px #ffd700);
            transform: scale(1);
        }
        50% { 
            filter: brightness(1.2) drop-shadow(0 0 20px #ffd700);
            transform: scale(1.02);
        }
    }
    
    .quality-poor {
        filter: grayscale(50%);
    }
    
    .quality-standard {
        /* No special effect */
    }
    
    .quality-high {
        filter: brightness(1.1);
    }
    
    .quality-perfect {
        filter: brightness(1.2) hue-rotate(270deg);
    }
    
    .quality-legendary {
        filter: brightness(1.3);
    }
`;
document.head.appendChild(style);
