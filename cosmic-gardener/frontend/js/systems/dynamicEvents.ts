import { gameStateManager } from '../state';
import { showMessage } from '../ui';
import * as THREE from 'three';
import { scene } from '../threeSetup';

export interface CosmicEvent {
    id: string;
    name: string;
    description: string;
    probability: number;
    minGameYear: number;
    duration: number;
    effects: () => void;
    onStart: () => void;
    onEnd: () => void;
}

class DynamicEventSystem {
    private events: Map<string, CosmicEvent> = new Map();
    private activeEvents: Map<string, { event: CosmicEvent; endTime: number }> = new Map();
    private lastEventCheck = 0;
    private eventCheckInterval = 30; // Check every 30 seconds
    
    constructor() {
        this.registerEvents();
    }
    
    private registerEvents() {
        // 彗星接近イベント
        this.registerEvent({
            id: 'comet_approach',
            name: '彗星接近',
            description: '巨大な彗星が接近中！資源獲得のチャンス',
            probability: 0.05,
            minGameYear: 10,
            duration: 60,
            onStart: () => {
                showMessage('⚠️ 巨大な彗星が接近しています！', 'warning');
                this.createCometVisual();
            },
            effects: () => {
                gameStateManager.updateState(state => ({
                    ...state,
                    resources: {
                        ...state.resources,
                        cosmicDust: state.resources.cosmicDust + 100,
                        energy: state.resources.energy + 50
                    }
                }));
            },
            onEnd: () => {
                showMessage('彗星が通過しました', 'info');
                this.removeCometVisual();
            }
        });
        
        // ソーラーフレアイベント
        this.registerEvent({
            id: 'solar_flare',
            name: 'ソーラーフレア',
            description: '恒星から強力なエネルギーが放出！',
            probability: 0.03,
            minGameYear: 20,
            duration: 30,
            onStart: () => {
                showMessage('☀️ ソーラーフレア発生！エネルギー生産2倍', 'success');
                gameStateManager.updateState(state => ({
                    ...state,
                    temporaryMultipliers: {
                        ...state.temporaryMultipliers,
                        energy: 2.0
                    }
                }));
            },
            effects: () => {
                // Continuous effects handled by multiplier
            },
            onEnd: () => {
                gameStateManager.updateState(state => ({
                    ...state,
                    temporaryMultipliers: {
                        ...state.temporaryMultipliers,
                        energy: 1.0
                    }
                }));
            }
        });
        
        // 時空の歪みイベント
        this.registerEvent({
            id: 'spacetime_distortion',
            name: '時空の歪み',
            description: '時間の流れが不安定に！',
            probability: 0.02,
            minGameYear: 50,
            duration: 45,
            onStart: () => {
                showMessage('🌀 時空の歪み発生！時間の流れが変動します', 'warning');
                this.createDistortionEffect();
            },
            effects: () => {
                // Random time multiplier between 0.5x and 3x
                const randomMultiplier = 0.5 + Math.random() * 2.5;
                gameStateManager.updateState(state => ({
                    ...state,
                    currentTimeMultiplier: randomMultiplier + 'x'
                }));
            },
            onEnd: () => {
                gameStateManager.updateState(state => ({
                    ...state,
                    currentTimeMultiplier: '1x'
                }));
                this.removeDistortionEffect();
            }
        });
    }
    
    private registerEvent(event: CosmicEvent) {
        this.events.set(event.id, event);
    }
    
    update(deltaTime: number) {
        const currentTime = Date.now() / 1000;
        const state = gameStateManager.getState();
        
        // Check for new events
        if (currentTime - this.lastEventCheck > this.eventCheckInterval) {
            this.lastEventCheck = currentTime;
            this.checkForNewEvents(state.gameYear);
        }
        
        // Update active events
        const eventsToRemove: string[] = [];
        this.activeEvents.forEach((activeEvent, id) => {
            if (currentTime > activeEvent.endTime) {
                activeEvent.event.onEnd();
                eventsToRemove.push(id);
            } else {
                activeEvent.event.effects();
            }
        });
        
        // Remove ended events
        eventsToRemove.forEach(id => this.activeEvents.delete(id));
    }
    
    private checkForNewEvents(gameYear: number) {
        this.events.forEach(event => {
            if (gameYear >= event.minGameYear && 
                !this.activeEvents.has(event.id) && 
                Math.random() < event.probability) {
                this.startEvent(event);
            }
        });
    }
    
    private startEvent(event: CosmicEvent) {
        const currentTime = Date.now() / 1000;
        this.activeEvents.set(event.id, {
            event,
            endTime: currentTime + event.duration
        });
        event.onStart();
    }
    
    // Visual effect methods
    private createCometVisual() {
        const cometGeometry = new THREE.SphereGeometry(5, 16, 16);
        const cometMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            emissive: 0x4169E1,
            emissiveIntensity: 2
        });
        const comet = new THREE.Mesh(cometGeometry, cometMaterial);
        comet.name = 'event_comet';
        comet.position.set(1000, 500, 0);
        
        // Add tail effect
        const tailGeometry = new THREE.ConeGeometry(3, 20, 8);
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: 0xADD8E6,
            transparent: true,
            opacity: 0.6
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.z = 10;
        tail.rotation.x = Math.PI / 2;
        comet.add(tail);
        
        scene.add(comet);
    }
    
    private removeCometVisual() {
        const comet = scene.getObjectByName('event_comet');
        if (comet) {
            scene.remove(comet);
        }
    }
    
    private createDistortionEffect() {
        const distortionGeometry = new THREE.TorusGeometry(100, 20, 16, 100);
        const distortionMaterial = new THREE.MeshBasicMaterial({
            color: 0x9400D3,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        const distortion = new THREE.Mesh(distortionGeometry, distortionMaterial);
        distortion.name = 'event_distortion';
        scene.add(distortion);
    }
    
    private removeDistortionEffect() {
        const distortion = scene.getObjectByName('event_distortion');
        if (distortion) {
            scene.remove(distortion);
        }
    }
    
    // Get active events for UI display
    getActiveEvents(): Array<{ event: CosmicEvent; remainingTime: number }> {
        const currentTime = Date.now() / 1000;
        return Array.from(this.activeEvents.values()).map(({ event, endTime }) => ({
            event,
            remainingTime: Math.max(0, endTime - currentTime)
        }));
    }
}

export const dynamicEventSystem = new DynamicEventSystem();