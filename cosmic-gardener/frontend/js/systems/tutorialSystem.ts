/**
 * Tutorial System
 * Progressive tutorial implementation
 */

import { gameState, gameStateManager } from '../state.js';
import { 
  Tutorial, 
  TutorialStep, 
  TutorialState,
  TutorialHistoryEntry 
} from '../types/tutorial.js';
import { 
  getTutorialById, 
  getNextTutorial, 
  getAvailableTutorials 
} from './tutorialDefinitions.js';
import { phaseManager } from './phaseManager.js';
import { animationSystem } from './simpleAnimations.js';

export class TutorialSystem {
  private static instance: TutorialSystem;
  private state: TutorialState;
  private currentTutorial: Tutorial | null = null;
  private currentStepIndex: number = 0;
  private container: HTMLDivElement | null = null;
  private highlightElement: HTMLDivElement | null = null;
  private checkInterval: number | null = null;
  
  private constructor() {
    this.state = this.loadState();
    console.log('[TUTORIAL] System initialized');
  }
  
  static getInstance(): TutorialSystem {
    if (!TutorialSystem.instance) {
      TutorialSystem.instance = new TutorialSystem();
    }
    return TutorialSystem.instance;
  }
  
  // Initialize tutorial system
  init(): void {
    console.log('[TUTORIAL] Initializing tutorial system');
    this.createUI();
    
    // Delay auto-start to ensure everything is loaded
    setTimeout(() => {
      console.log('[TUTORIAL] Checking for auto-start tutorials');
      this.checkForAutoStart();
    }, 2000);
    
    // Check for new tutorials periodically
    this.checkInterval = window.setInterval(() => {
      if (!this.state.isActive) {
        this.checkForAutoStart();
      }
    }, 5000);
  }
  
  // Create tutorial UI
  private createUI(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'tutorial-container';
    this.container.className = 'tutorial-container hidden';
    document.body.appendChild(this.container);
    
    // Create highlight element
    this.highlightElement = document.createElement('div');
    this.highlightElement.id = 'tutorial-highlight';
    this.highlightElement.className = 'tutorial-highlight hidden';
    document.body.appendChild(this.highlightElement);
    
    this.addStyles();
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-container {
        position: fixed;
        z-index: 10000;
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
        border: 2px solid #4a4aff;
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.8);
        max-width: 400px;
        min-width: 300px;
        transition: all 0.3s ease;
      }
      
      .tutorial-container.hidden {
        display: none;
      }
      
      .tutorial-container.position-top {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .tutorial-container.position-bottom {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .tutorial-container.position-left {
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .tutorial-container.position-right {
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
      }
      
      .tutorial-container.position-center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .tutorial-container.position-upper-center {
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .tutorial-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .tutorial-title {
        color: #4a4aff;
        font-size: 18px;
        font-weight: bold;
        margin: 0;
      }
      
      .tutorial-progress {
        color: #aaa;
        font-size: 14px;
      }
      
      .tutorial-content {
        color: #fff;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      
      .tutorial-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .tutorial-btn {
        padding: 8px 16px;
        border: 1px solid #4a4aff;
        background: transparent;
        color: #fff;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .tutorial-btn:hover {
        background: #4a4aff;
        transform: translateY(-2px);
      }
      
      .tutorial-btn.primary {
        background: #4a4aff;
      }
      
      .tutorial-btn.primary:hover {
        background: #5a5aff;
      }
      
      .tutorial-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tutorial-highlight {
        position: fixed;
        border: 3px solid #4a4aff;
        border-radius: 8px;
        pointer-events: none;
        z-index: 9999;
        transition: all 0.3s ease;
        animation: pulse-highlight 2s infinite;
      }
      
      .tutorial-highlight.hidden {
        display: none;
      }
      
      @keyframes pulse-highlight {
        0% { box-shadow: 0 0 10px rgba(74, 74, 255, 0.5); }
        50% { box-shadow: 0 0 30px rgba(74, 74, 255, 1); }
        100% { box-shadow: 0 0 10px rgba(74, 74, 255, 0.5); }
      }
      
      .tutorial-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9998;
        pointer-events: none;
      }
      
      .tutorial-pointer {
        position: absolute;
        width: 30px;
        height: 30px;
        transform: rotate(45deg);
        background: inherit;
        border: inherit;
      }
      
      .tutorial-container.position-top .tutorial-pointer {
        bottom: -15px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        border-top: none;
        border-left: none;
      }
      
      .tutorial-container.position-bottom .tutorial-pointer {
        top: -15px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        border-bottom: none;
        border-right: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Start a tutorial
  startTutorial(tutorialId: string): void {
    if (this.state.isActive) {
      console.warn('[TUTORIAL] Another tutorial is already active');
      return;
    }
    
    const tutorial = getTutorialById(tutorialId);
    if (!tutorial) {
      console.error('[TUTORIAL] Tutorial not found:', tutorialId);
      return;
    }
    
    console.log('[TUTORIAL] Starting tutorial:', tutorialId);
    
    this.currentTutorial = tutorial;
    this.currentStepIndex = 0;
    this.state.isActive = true;
    this.state.currentTutorial = tutorialId;
    this.state.currentStep = 0;
    
    // Add to history
    this.state.tutorialHistory.push({
      tutorialId,
      startTime: Date.now(),
      wasSkipped: false,
      stepsCompleted: 0
    });
    
    this.showStep();
    this.saveState();
  }
  
  // Show current step
  private showStep(): void {
    if (!this.currentTutorial || !this.container) return;
    
    const step = this.currentTutorial.steps[this.currentStepIndex];
    if (!step) {
      this.completeTutorial();
      return;
    }
    
    // Update container content
    this.container.innerHTML = `
      <div class="tutorial-header">
        <h3 class="tutorial-title">${step.title}</h3>
        <span class="tutorial-progress">${this.currentStepIndex + 1}/${this.currentTutorial.steps.length}</span>
      </div>
      <div class="tutorial-content">
        ${step.content}
      </div>
      <div class="tutorial-actions">
        ${step.skipable !== false || this.currentStepIndex > 0 ? '<button class="tutorial-btn" id="tutorial-skip">スキップ</button>' : ''}
        ${this.currentStepIndex > 0 ? '<button class="tutorial-btn" id="tutorial-prev">戻る</button>' : ''}
        <button class="tutorial-btn primary" id="tutorial-next" ${this.isStepComplete(step) ? '' : 'disabled'}>
          ${this.currentStepIndex < this.currentTutorial.steps.length - 1 ? '次へ' : '終わる'}
        </button>
      </div>
    `;
    
    // Set position - handle custom positions
    let positionClass = step.position || 'center';
    // Convert 'center' to 'upper-center' for better visibility
    if (positionClass === 'center') {
      positionClass = 'upper-center';
    }
    this.container.className = `tutorial-container position-${positionClass}`;
    
    // Show highlight if target exists
    if (step.target) {
      this.highlightTarget(step.target);
    } else {
      this.hideHighlight();
    }
    
    // Setup event listeners
    this.setupStepListeners(step);
    
    // Show container
    this.container.classList.remove('hidden');
    animationSystem.fadeIn({
      targets: this.container,
      duration: 300
    });
  }
  
  // Setup step event listeners
  private setupStepListeners(step: TutorialStep): void {
    const skipBtn = document.getElementById('tutorial-skip');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skipTutorial());
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousStep());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }
    
    // Setup action listeners
    if (step.action) {
      this.setupActionListener(step);
    }
    
    // Setup condition checking
    if (step.condition) {
      this.startConditionCheck(step);
    }
  }
  
  // Setup action listener
  private setupActionListener(step: TutorialStep): void {
    if (!step.action) return;
    
    switch (step.action.type) {
      case 'click':
        if (step.action.target) {
          const element = document.querySelector(step.action.target);
          if (element) {
            element.addEventListener('click', () => {
              this.completeStepAction();
            }, { once: true });
          }
        }
        break;
        
      case 'wait':
        setTimeout(() => {
          this.completeStepAction();
        }, step.action.duration || 3000);
        break;
        
      case 'custom':
        if (step.action.callback) {
          step.action.callback();
        }
        break;
    }
  }
  
  // Start condition checking
  private startConditionCheck(step: TutorialStep): void {
    const checkCondition = () => {
      if (this.checkStepCondition(step)) {
        this.completeStepAction();
      } else {
        requestAnimationFrame(checkCondition);
      }
    };
    
    checkCondition();
  }
  
  // Check if step condition is met
  private checkStepCondition(step: TutorialStep): boolean {
    if (!step.condition) return true;
    
    const state = gameStateManager.getState();
    
    switch (step.condition.type) {
      case 'resource':
        const amount = this.getResourceAmount(step.condition.target!, state);
        return amount >= (step.condition.value || 0);
        
      case 'celestial':
        const count = state.stars.filter((body: any) => 
          body.userData.type === step.condition!.target
        ).length;
        return count >= (step.condition.value || 1);
        
      case 'phase':
        return (state.currentGamePhase || 0) >= (step.condition.value || 0);
        
      case 'custom':
        return step.condition.check ? step.condition.check() : true;
        
      default:
        return true;
    }
  }
  
  // Complete step action
  private completeStepAction(): void {
    const nextBtn = document.getElementById('tutorial-next');
    if (nextBtn) {
      nextBtn.removeAttribute('disabled');
    }
  }
  
  // Check if step is complete
  private isStepComplete(step: TutorialStep): boolean {
    if (!step.action && !step.condition) return true;
    
    if (step.condition) {
      return this.checkStepCondition(step);
    }
    
    return false;
  }
  
  // Highlight target element
  private highlightTarget(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element || !this.highlightElement) return;
    
    const rect = element.getBoundingClientRect();
    
    this.highlightElement.style.top = `${rect.top - 5}px`;
    this.highlightElement.style.left = `${rect.left - 5}px`;
    this.highlightElement.style.width = `${rect.width + 10}px`;
    this.highlightElement.style.height = `${rect.height + 10}px`;
    
    this.highlightElement.classList.remove('hidden');
  }
  
  // Hide highlight
  private hideHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.classList.add('hidden');
    }
  }
  
  // Navigation methods
  nextStep(): void {
    if (!this.currentTutorial) return;
    
    this.currentStepIndex++;
    this.state.currentStep = this.currentStepIndex;
    
    // Update history
    const history = this.state.tutorialHistory[this.state.tutorialHistory.length - 1];
    if (history) {
      history.stepsCompleted = this.currentStepIndex;
    }
    
    this.showStep();
    this.saveState();
  }
  
  previousStep(): void {
    if (!this.currentTutorial || this.currentStepIndex === 0) return;
    
    this.currentStepIndex--;
    this.state.currentStep = this.currentStepIndex;
    
    this.showStep();
    this.saveState();
  }
  
  skipTutorial(): void {
    if (!this.currentTutorial) return;
    
    // Update history
    const history = this.state.tutorialHistory[this.state.tutorialHistory.length - 1];
    if (history) {
      history.wasSkipped = true;
      history.completionTime = Date.now();
    }
    
    this.state.skippedTutorials.add(this.currentTutorial.id);
    
    this.endTutorial();
  }
  
  // Complete tutorial
  private completeTutorial(): void {
    if (!this.currentTutorial) return;
    
    // Update history
    const history = this.state.tutorialHistory[this.state.tutorialHistory.length - 1];
    if (history) {
      history.stepsCompleted = this.currentTutorial.steps.length;
      history.completionTime = Date.now();
    }
    
    this.state.completedTutorials.add(this.currentTutorial.id);
    
    // Show completion message
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast({
        message: `チュートリアル「${this.currentTutorial.name}」を完了しました！`,
        type: 'success',
        duration: 3000
      });
    }
    
    this.endTutorial();
  }
  
  // End tutorial
  private endTutorial(): void {
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.state.isActive = false;
    this.state.currentTutorial = undefined;
    this.state.currentStep = undefined;
    
    this.hideHighlight();
    
    if (this.container) {
      animationSystem.fadeOut({
        targets: this.container,
        duration: 300,
        complete: () => {
          this.container?.classList.add('hidden');
        }
      });
    }
    
    this.saveState();
    
    // Check for next auto-start tutorial
    setTimeout(() => {
      this.checkForAutoStart();
    }, 2000);
  }
  
  // Check for auto-start tutorials
  private checkForAutoStart(): void {
    if (this.state.isActive) {
      console.log('[TUTORIAL] Tutorial already active, skipping auto-start check');
      return;
    }
    
    const currentPhase = phaseManager.getPhaseState().currentPhase;
    const nextTutorial = getNextTutorial(currentPhase, this.state.completedTutorials);
    
    console.log('[TUTORIAL] Auto-start check:', {
      currentPhase,
      completedTutorials: Array.from(this.state.completedTutorials),
      nextTutorial: nextTutorial?.id,
      autoStart: nextTutorial?.autoStart
    });
    
    if (nextTutorial && nextTutorial.autoStart) {
      console.log('[TUTORIAL] Starting auto-start tutorial:', nextTutorial.id);
      this.startTutorial(nextTutorial.id);
    }
  }
  
  // Get available tutorials
  getAvailableTutorials(): Tutorial[] {
    const currentPhase = phaseManager.getPhaseState().currentPhase;
    return getAvailableTutorials(currentPhase, this.state.completedTutorials);
  }
  
  // Get tutorial progress
  getTutorialProgress(): { completed: number; total: number; percentage: number } {
    const total = 10; // Total number of tutorials
    const completed = this.state.completedTutorials.size;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  }
  
  // Helper methods
  private getResourceAmount(resource: string, state: any): number {
    switch (resource) {
      case 'cosmicDust': return state.cosmicDust || 0;
      case 'energy': return state.energy || 0;
      case 'organicMatter': return state.organicMatter || 0;
      case 'biomass': return state.biomass || 0;
      case 'darkMatter': return state.darkMatter || 0;
      case 'thoughtPoints': return state.thoughtPoints || 0;
      default: return 0;
    }
  }
  
  // Save/load state
  private saveState(): void {
    localStorage.setItem('tutorialState', JSON.stringify({
      completedTutorials: Array.from(this.state.completedTutorials),
      skippedTutorials: Array.from(this.state.skippedTutorials),
      tutorialHistory: this.state.tutorialHistory
    }));
  }
  
  private loadState(): TutorialState {
    try {
      const saved = localStorage.getItem('tutorialState');
      if (saved) {
        const data = JSON.parse(saved);
        return {
          completedTutorials: new Set(data.completedTutorials || []),
          skippedTutorials: new Set(data.skippedTutorials || []),
          tutorialHistory: data.tutorialHistory || [],
          isActive: false,
          isPaused: false
        };
      }
    } catch (error) {
      console.error('[TUTORIAL] Failed to load state:', error);
    }
    
    return {
      completedTutorials: new Set(),
      skippedTutorials: new Set(),
      tutorialHistory: [],
      isActive: false,
      isPaused: false
    };
  }
  
  // Cleanup
  destroy(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.container?.remove();
    this.highlightElement?.remove();
  }
}

export const tutorialSystem = TutorialSystem.getInstance();