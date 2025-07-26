// Batch Conversion UI Component

import { batchConversionSystem } from './batchConversionSystem';
import { CONVERSION_RECIPES } from '@/conversionRecipes';
import { conversionEngine } from '@/conversionEngine';
import { ResourceType, QualityTier, RESOURCE_METADATA } from '@/resourceSystem';
import { BatchJobStatus } from '@/types/batchConversion';

export class BatchConversionUI {
    private container: HTMLElement | null = null;
    private updateInterval: number | null = null;
    private selectedRecipeId: string | null = null;
    private quantityInput: HTMLInputElement | null = null;
    private prioritySlider: HTMLInputElement | null = null;
    
    constructor() {
        this.createUI();
    }
    
    private createUI(): void {
        // Create main container
        const container = document.createElement('div');
        container.id = 'batch-conversion-ui';
        container.className = 'batch-conversion-panel';
        container.innerHTML = `
            <div class="batch-header">
                <h3>🏭 バッチ変換システム</h3>
                <div class="batch-controls">
                    <button id="batch-pause-btn" class="control-btn">
                        <span class="pause-icon">⏸️</span>
                        <span class="resume-icon" style="display:none">▶️</span>
                    </button>
                    <button id="batch-close-btn" class="control-btn">✕</button>
                </div>
            </div>
            
            <div class="batch-content">
                <!-- Recipe Selection -->
                <div class="batch-section recipe-selection-section">
                    <h4>レシピ選択</h4>
                    <div class="recipe-grid" id="batch-recipe-grid">
                        <!-- Recipes will be populated here -->
                    </div>
                </div>
                
                <!-- Job Configuration -->
                <div class="batch-section" id="batch-config-section" style="display:none">
                    <h4>ジョブ設定</h4>
                    <div class="job-config">
                        <div class="config-item">
                            <label>数量:</label>
                            <input type="number" id="batch-quantity" min="1" max="1000" value="10">
                            <span id="max-possible" class="hint"></span>
                        </div>
                        <div class="config-item">
                            <label>優先度:</label>
                            <input type="range" id="batch-priority" min="0" max="10" value="5">
                            <span id="priority-value">5</span>
                        </div>
                        <button id="batch-add-job" class="primary-btn">ジョブを追加</button>
                    </div>
                </div>
                
                <!-- Templates -->
                <div class="batch-section">
                    <h4>テンプレート</h4>
                    <div id="batch-templates" class="template-list">
                        <!-- Templates will be populated here -->
                    </div>
                </div>
                
                <!-- Queue Status -->
                <div class="batch-section">
                    <h4>キュー状態</h4>
                    <div id="batch-queue-tabs" class="tab-container">
                        <div class="tab-headers">
                            <button class="tab-header active" data-tab="queued">待機中 (<span id="queued-count">0</span>)</button>
                            <button class="tab-header" data-tab="active">実行中 (<span id="active-count">0</span>)</button>
                            <button class="tab-header" data-tab="completed">完了 (<span id="completed-count">0</span>)</button>
                            <button class="tab-header" data-tab="failed">失敗 (<span id="failed-count">0</span>)</button>
                        </div>
                        <div class="tab-contents">
                            <div class="tab-content active" data-tab="queued">
                                <div id="queued-jobs" class="job-list"></div>
                            </div>
                            <div class="tab-content" data-tab="active">
                                <div id="active-jobs" class="job-list"></div>
                            </div>
                            <div class="tab-content" data-tab="completed">
                                <div id="completed-jobs" class="job-list"></div>
                            </div>
                            <div class="tab-content" data-tab="failed">
                                <div id="failed-jobs" class="job-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Metrics -->
                <div class="batch-section">
                    <h4>統計</h4>
                    <div id="batch-metrics" class="metrics-grid">
                        <!-- Metrics will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.container = container;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Populate initial data
        this.populateRecipes();
        this.updateTemplates();
        
        // Start update loop
        this.startUpdateLoop();
    }
    
    private setupEventListeners(): void {
        // Close button
        const closeBtn = document.getElementById('batch-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());
        
        // Pause button
        const pauseBtn = document.getElementById('batch-pause-btn');
        pauseBtn?.addEventListener('click', () => {
            batchConversionSystem.togglePause();
            const pauseIcon = pauseBtn.querySelector('.pause-icon') as HTMLElement;
            const resumeIcon = pauseBtn.querySelector('.resume-icon') as HTMLElement;
            
            if (pauseIcon && resumeIcon) {
                const isPaused = pauseIcon.style.display === 'none';
                pauseIcon.style.display = isPaused ? 'inline' : 'none';
                resumeIcon.style.display = isPaused ? 'none' : 'inline';
            }
        });
        
        // Priority slider
        this.prioritySlider = document.getElementById('batch-priority') as HTMLInputElement;
        const priorityValue = document.getElementById('priority-value');
        this.prioritySlider?.addEventListener('input', () => {
            if (priorityValue && this.prioritySlider) {
                priorityValue.textContent = this.prioritySlider.value;
            }
        });
        
        // Quantity input
        this.quantityInput = document.getElementById('batch-quantity') as HTMLInputElement;
        
        // Add job button
        const addJobBtn = document.getElementById('batch-add-job');
        addJobBtn?.addEventListener('click', () => this.addJob());
        
        // Tab switching
        const tabHeaders = this.container?.querySelectorAll('.tab-header');
        const tabContents = this.container?.querySelectorAll('.tab-content');
        
        tabHeaders?.forEach(header => {
            header.addEventListener('click', () => {
                const tabName = header.getAttribute('data-tab');
                if (!tabName) return;
                
                // Update active states
                tabHeaders.forEach(h => h.classList.remove('active'));
                tabContents?.forEach(c => c.classList.remove('active'));
                
                header.classList.add('active');
                const content = this.container?.querySelector(`.tab-content[data-tab="${tabName}"]`);
                content?.classList.add('active');
            });
        });
    }
    
    private populateRecipes(): void {
        const grid = document.getElementById('batch-recipe-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Get all recipes that facilities can handle
        const facilities = conversionEngine.getAllFacilities();
        const availableRecipes = new Set<string>();
        
        facilities.forEach(facility => {
            facility.recipes.forEach(recipeId => availableRecipes.add(recipeId));
        });
        
        // Create recipe cards
        availableRecipes.forEach(recipeId => {
            const recipe = CONVERSION_RECIPES[recipeId];
            if (!recipe) return;
            
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.dataset.recipeId = recipeId;
            
            const canAfford = conversionEngine.canAffordRecipe(recipeId);
            const maxPossible = conversionEngine.getMaxConversions(recipeId);
            
            card.innerHTML = `
                <div class="recipe-name">${recipe.name}</div>
                <div class="recipe-cost">
                    ${recipe.inputs.resources.map(input => {
                        const meta = RESOURCE_METADATA[input.type];
                        return `${meta?.symbol || '?'} ${input.amount}`;
                    }).join(', ')}
                </div>
                <div class="recipe-output">
                    → ${recipe.outputs.resources.map(output => {
                        const meta = RESOURCE_METADATA[output.type];
                        return `${meta?.symbol || '?'} ${output.amount}`;
                    }).join(', ')}
                </div>
                <div class="recipe-status ${canAfford ? 'affordable' : 'unaffordable'}">
                    ${canAfford ? `最大: ${maxPossible}` : '資源不足'}
                </div>
            `;
            
            card.addEventListener('click', () => this.selectRecipe(recipeId, maxPossible));
            
            grid.appendChild(card);
        });
    }
    
    private selectRecipe(recipeId: string, maxPossible: number): void {
        this.selectedRecipeId = recipeId;
        
        // Update selected state
        const cards = this.container?.querySelectorAll('.recipe-card');
        cards?.forEach(card => {
            card.classList.toggle('selected', card.dataset.recipeId === recipeId);
        });
        
        // Show config section
        const configSection = document.getElementById('batch-config-section');
        if (configSection) {
            configSection.style.display = 'block';
        }
        
        // Update max possible hint
        const hint = document.getElementById('max-possible');
        if (hint) {
            hint.textContent = `(最大: ${maxPossible})`;
        }
        
        // Set quantity max
        if (this.quantityInput) {
            this.quantityInput.max = maxPossible.toString();
            this.quantityInput.value = Math.min(10, maxPossible).toString();
        }
    }
    
    private addJob(): void {
        if (!this.selectedRecipeId || !this.quantityInput || !this.prioritySlider) return;
        
        const quantity = parseInt(this.quantityInput.value);
        const priority = parseInt(this.prioritySlider.value);
        
        batchConversionSystem.addJob(this.selectedRecipeId, quantity, priority);
        
        // Reset form
        this.quantityInput.value = '10';
        this.prioritySlider.value = '5';
        const priorityValue = document.getElementById('priority-value');
        if (priorityValue) priorityValue.textContent = '5';
        
        // Update recipes to reflect new resource state
        this.populateRecipes();
    }
    
    private updateTemplates(): void {
        const container = document.getElementById('batch-templates');
        if (!container) return;
        
        const status = batchConversionSystem.getQueueStatus();
        
        container.innerHTML = status.templates.map(template => `
            <div class="template-item">
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-desc">${template.description}</div>
                </div>
                <button class="template-btn" onclick="window.batchConversionUI.useTemplate('${template.id}')">
                    使用
                </button>
            </div>
        `).join('');
    }
    
    public useTemplate(templateId: string): void {
        batchConversionSystem.addJobsFromTemplate(templateId);
        this.populateRecipes(); // Update available recipes
    }
    
    private updateQueueStatus(): void {
        const status = batchConversionSystem.getQueueStatus();
        
        // Update counts
        document.getElementById('queued-count')!.textContent = status.queued.length.toString();
        document.getElementById('active-count')!.textContent = status.active.length.toString();
        document.getElementById('completed-count')!.textContent = status.completed.length.toString();
        document.getElementById('failed-count')!.textContent = status.failed.length.toString();
        
        // Update queued jobs
        const queuedContainer = document.getElementById('queued-jobs');
        if (queuedContainer) {
            queuedContainer.innerHTML = status.queued.map(job => this.renderQueuedJob(job)).join('');
        }
        
        // Update active jobs
        const activeContainer = document.getElementById('active-jobs');
        if (activeContainer) {
            activeContainer.innerHTML = status.active
                .filter(item => item.job)
                .map(item => this.renderActiveJob(item.job!, item.state))
                .join('');
        }
        
        // Update completed jobs
        const completedContainer = document.getElementById('completed-jobs');
        if (completedContainer) {
            completedContainer.innerHTML = status.completed
                .reverse()
                .map(job => this.renderCompletedJob(job))
                .join('');
        }
        
        // Update failed jobs
        const failedContainer = document.getElementById('failed-jobs');
        if (failedContainer) {
            failedContainer.innerHTML = status.failed
                .reverse()
                .map(item => this.renderFailedJob(item))
                .join('');
        }
    }
    
    private renderQueuedJob(job: any): string {
        const recipe = CONVERSION_RECIPES[job.recipeId];
        return `
            <div class="job-item queued">
                <div class="job-info">
                    <div class="job-name">${recipe?.name || job.recipeId}</div>
                    <div class="job-details">数量: ${job.quantity} | 優先度: ${job.priority}</div>
                </div>
                <button class="cancel-btn" onclick="window.batchConversionUI.cancelJob('${job.id}')">
                    キャンセル
                </button>
            </div>
        `;
    }
    
    private renderActiveJob(job: any, state: any): string {
        const recipe = CONVERSION_RECIPES[job.recipeId];
        const progress = (state.conversionsCompleted / job.quantity) * 100;
        
        return `
            <div class="job-item active">
                <div class="job-info">
                    <div class="job-name">${recipe?.name || job.recipeId}</div>
                    <div class="job-details">
                        ${state.conversionsCompleted}/${job.quantity} 完了
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <button class="cancel-btn" onclick="window.batchConversionUI.cancelJob('${job.id}')">
                    停止
                </button>
            </div>
        `;
    }
    
    private renderCompletedJob(job: any): string {
        const recipe = CONVERSION_RECIPES[job.recipeId];
        return `
            <div class="job-item completed">
                <div class="job-info">
                    <div class="job-name">✅ ${recipe?.name || job.recipeId}</div>
                    <div class="job-details">数量: ${job.quantity}</div>
                </div>
            </div>
        `;
    }
    
    private renderFailedJob(item: any): string {
        const recipe = CONVERSION_RECIPES[item.job.recipeId];
        return `
            <div class="job-item failed">
                <div class="job-info">
                    <div class="job-name">❌ ${recipe?.name || item.job.recipeId}</div>
                    <div class="job-details">理由: ${item.reason}</div>
                </div>
            </div>
        `;
    }
    
    private updateMetrics(): void {
        const container = document.getElementById('batch-metrics');
        if (!container) return;
        
        const metrics = batchConversionSystem.getMetrics();
        
        container.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${metrics.totalJobsQueued}</div>
                <div class="metric-label">待機中</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${metrics.totalJobsCompleted}</div>
                <div class="metric-label">完了</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${metrics.totalJobsFailed}</div>
                <div class="metric-label">失敗</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${metrics.averageCompletionTime.toFixed(1)}s</div>
                <div class="metric-label">平均完了時間</div>
            </div>
        `;
    }
    
    public cancelJob(jobId: string): void {
        batchConversionSystem.cancelJob(jobId);
    }
    
    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            this.updateQueueStatus();
            this.updateMetrics();
        }, 1000);
    }
    
    public show(): void {
        const panel = document.getElementById('batch-conversion-ui');
        if (panel) {
            panel.style.display = 'block';
            this.populateRecipes(); // Refresh recipes when shown
        }
    }
    
    public hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    public destroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.container) {
            this.container.remove();
        }
        
        batchConversionSystem.destroy();
    }
}

// Create global instance
const batchConversionUI = new BatchConversionUI();
(window as any).batchConversionUI = batchConversionUI;

export { batchConversionUI };