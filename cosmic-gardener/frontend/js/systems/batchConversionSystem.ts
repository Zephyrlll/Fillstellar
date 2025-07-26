// Advanced Batch Conversion System

import { 
    BatchConversionJob, 
    BatchJobStatus, 
    BatchQueue, 
    BatchExecutionState,
    BatchSchedulingStrategy,
    BatchMetrics,
    BatchTemplate,
    BatchNotification
} from '@/types/batchConversion';
import { ConversionRecipe, ResourceType, QualityTier } from '@/resourceSystem';
import { CONVERSION_RECIPES } from '@/conversionRecipes';
import { conversionEngine } from '@/conversionEngine';
import { gameState } from '@/state';
import { showMessage } from '@/ui';
import { addTimelineLog } from '@/timeline';

export class BatchConversionSystem {
    private queue: BatchQueue;
    private schedulingStrategy: BatchSchedulingStrategy;
    private templates: Map<string, BatchTemplate>;
    private notifications: BatchNotification[];
    private updateInterval: number;
    private lastUpdate: number;
    private isPaused: boolean;
    
    constructor() {
        this.queue = {
            jobs: [],
            activeJobs: new Map(),
            completedJobs: [],
            failedJobs: []
        };
        
        this.schedulingStrategy = this.createDefaultStrategy();
        this.templates = new Map();
        this.notifications = [];
        this.lastUpdate = Date.now();
        this.isPaused = false;
        
        // Start update loop
        this.updateInterval = setInterval(() => this.update(), 1000);
        
        // Initialize default templates
        this.initializeDefaultTemplates();
    }
    
    private createDefaultStrategy(): BatchSchedulingStrategy {
        return {
            name: 'Priority-FIFO',
            description: '優先度順、同じ優先度ならFIFO',
            prioritizeJobs: (jobs: BatchConversionJob[]) => {
                return [...jobs].sort((a, b) => {
                    if (a.priority !== b.priority) {
                        return b.priority - a.priority; // Higher priority first
                    }
                    return a.createdAt - b.createdAt; // Earlier jobs first
                });
            }
        };
    }
    
    private initializeDefaultTemplates() {
        // Basic resource processing template
        this.templates.set('basic_processing', {
            id: 'basic_processing',
            name: '基本資源処理',
            description: '基本的な資源の精製と処理',
            jobs: [
                { recipeId: 'processed_metal_basic', quantity: 10, priority: 5 },
                { recipeId: 'silicon_extraction', quantity: 10, priority: 5 },
                { recipeId: 'biomass_cultivation', quantity: 5, priority: 4 }
            ],
            tags: ['basic', 'starter']
        });
        
        // Energy production template
        this.templates.set('energy_production', {
            id: 'energy_production',
            name: 'エネルギー生産',
            description: 'エネルギー資源の大量生産',
            jobs: [
                { recipeId: 'thermal_generation', quantity: 20, priority: 8 },
                { recipeId: 'electric_conversion', quantity: 15, priority: 7 }
            ],
            tags: ['energy', 'production']
        });
    }
    
    // Add a job to the queue
    addJob(recipeId: string, quantity: number, priority: number = 5, options?: {
        facilityRestrictions?: string[];
        qualityRequirement?: QualityTier;
    }): string {
        const job: BatchConversionJob = {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            recipeId,
            quantity,
            priority: Math.max(0, Math.min(10, priority)),
            createdAt: Date.now(),
            status: BatchJobStatus.QUEUED,
            ...options
        };
        
        this.queue.jobs.push(job);
        
        const recipe = CONVERSION_RECIPES[recipeId];
        const recipeName = recipe?.name || recipeId;
        
        addTimelineLog(`バッチジョブ追加: ${recipeName} x${quantity} (優先度: ${priority})`);
        this.addNotification('info', `ジョブがキューに追加されました: ${recipeName} x${quantity}`);
        
        return job.id;
    }
    
    // Add multiple jobs from a template
    addJobsFromTemplate(templateId: string): string[] {
        const template = this.templates.get(templateId);
        if (!template) {
            console.error('[BATCH] Template not found:', templateId);
            return [];
        }
        
        const jobIds: string[] = [];
        
        template.jobs.forEach(jobDef => {
            const jobId = this.addJob(jobDef.recipeId, jobDef.quantity, jobDef.priority);
            jobIds.push(jobId);
        });
        
        showMessage(`テンプレート「${template.name}」からジョブを追加しました`, 2000);
        
        return jobIds;
    }
    
    // Cancel a job
    cancelJob(jobId: string): boolean {
        // Check if job is in queue
        const queueIndex = this.queue.jobs.findIndex(j => j.id === jobId);
        if (queueIndex !== -1) {
            const job = this.queue.jobs[queueIndex];
            this.queue.jobs.splice(queueIndex, 1);
            
            const recipe = CONVERSION_RECIPES[job.recipeId];
            this.addNotification('info', `ジョブをキャンセルしました: ${recipe?.name || job.recipeId}`);
            return true;
        }
        
        // Check if job is active
        const activeState = this.queue.activeJobs.get(jobId);
        if (activeState) {
            // Mark as completed with current progress
            const job = this.findJobById(jobId);
            if (job) {
                job.status = BatchJobStatus.COMPLETED;
                this.queue.completedJobs.push(job);
                this.queue.activeJobs.delete(jobId);
                
                const recipe = CONVERSION_RECIPES[job.recipeId];
                this.addNotification('warning', 
                    `実行中のジョブを停止しました: ${recipe?.name || job.recipeId} ` +
                    `(${activeState.conversionsCompleted}/${job.quantity} 完了)`
                );
                return true;
            }
        }
        
        return false;
    }
    
    // Pause/resume batch processing
    togglePause(): void {
        this.isPaused = !this.isPaused;
        this.addNotification('info', this.isPaused ? 'バッチ処理を一時停止しました' : 'バッチ処理を再開しました');
    }
    
    // Main update loop
    private update(): void {
        if (this.isPaused) return;
        
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        
        // Process active jobs
        this.updateActiveJobs();
        
        // Start new jobs if facilities are available
        this.processQueue();
        
        // Clean up old notifications
        this.cleanupNotifications();
        
        this.lastUpdate = now;
    }
    
    private updateActiveJobs(): void {
        const completedJobs: string[] = [];
        
        this.queue.activeJobs.forEach((state, jobId) => {
            const job = this.findJobById(jobId);
            if (!job) return;
            
            // Count active conversions for this job
            const activeConversions = conversionEngine.getActiveConversions()
                .filter(conv => state.assignedFacilities.includes(conv.id));
            
            // Update completed count
            const previousCompleted = state.conversionsCompleted;
            state.conversionsCompleted = job.quantity - activeConversions.length - 
                (job.quantity - state.conversionsStarted);
            
            // Check if job is complete
            if (state.conversionsCompleted >= job.quantity) {
                completedJobs.push(jobId);
            } else if (state.conversionsCompleted > previousCompleted) {
                // Update estimated completion time
                const completionRate = state.conversionsCompleted / job.quantity;
                const elapsedTime = Date.now() - state.startTime;
                state.estimatedCompletionTime = state.startTime + (elapsedTime / completionRate);
            }
        });
        
        // Complete finished jobs
        completedJobs.forEach(jobId => {
            const job = this.findJobById(jobId);
            if (job) {
                job.status = BatchJobStatus.COMPLETED;
                this.queue.completedJobs.push(job);
                this.queue.activeJobs.delete(jobId);
                
                const recipe = CONVERSION_RECIPES[job.recipeId];
                this.addNotification('info', 
                    `バッチジョブ完了: ${recipe?.name || job.recipeId} x${job.quantity}`,
                    jobId
                );
                addTimelineLog(`バッチジョブ完了: ${recipe?.name || job.recipeId} x${job.quantity}`);
            }
        });
    }
    
    private processQueue(): void {
        if (this.queue.jobs.length === 0) return;
        
        // Get available facilities
        const allFacilities = conversionEngine.getAllFacilities();
        const availableFacilities = allFacilities.filter(f => 
            f.isActive && !conversionEngine.isFacilityBusy(f.id)
        );
        
        if (availableFacilities.length === 0) return;
        
        // Sort jobs by priority
        const prioritizedJobs = this.schedulingStrategy.prioritizeJobs(this.queue.jobs);
        
        // Try to start jobs
        for (const job of prioritizedJobs) {
            if (availableFacilities.length === 0) break;
            
            // Check if we can start this job
            const recipe = CONVERSION_RECIPES[job.recipeId];
            if (!recipe) continue;
            
            // Check if facility can handle this recipe
            const eligibleFacilities = availableFacilities.filter(f => {
                // Check facility restrictions
                if (job.facilityRestrictions && !job.facilityRestrictions.includes(f.id)) {
                    return false;
                }
                // Check if facility supports this recipe
                return f.recipes.includes(job.recipeId);
            });
            
            if (eligibleFacilities.length === 0) continue;
            
            // Check resource availability
            const maxConversions = conversionEngine.getMaxConversions(job.recipeId);
            if (maxConversions === 0) {
                // Move to failed if no resources
                this.moveJobToFailed(job, '資源不足');
                continue;
            }
            
            // Start the job
            const conversionsToStart = Math.min(
                job.quantity,
                maxConversions,
                eligibleFacilities.length * 5 // Max 5 conversions per facility in parallel
            );
            
            if (conversionsToStart > 0) {
                this.startBatchJob(job, eligibleFacilities, conversionsToStart);
                
                // Remove from queue
                const index = this.queue.jobs.indexOf(job);
                if (index !== -1) {
                    this.queue.jobs.splice(index, 1);
                }
                
                // Mark facilities as used
                eligibleFacilities.forEach(f => {
                    const idx = availableFacilities.indexOf(f);
                    if (idx !== -1) availableFacilities.splice(idx, 1);
                });
            }
        }
    }
    
    private startBatchJob(job: BatchConversionJob, facilities: any[], conversionsToStart: number): void {
        job.status = BatchJobStatus.IN_PROGRESS;
        
        const state: BatchExecutionState = {
            jobId: job.id,
            conversionsStarted: 0,
            conversionsCompleted: 0,
            conversionsFailled: 0,
            assignedFacilities: [],
            startTime: Date.now(),
            estimatedCompletionTime: 0
        };
        
        // Distribute conversions across facilities
        const conversionsPerFacility = Math.ceil(conversionsToStart / facilities.length);
        let remainingConversions = conversionsToStart;
        
        for (const facility of facilities) {
            if (remainingConversions <= 0) break;
            
            const toStart = Math.min(conversionsPerFacility, remainingConversions);
            const result = conversionEngine.startBatchConversion(
                job.recipeId, 
                toStart, 
                facility.id
            );
            
            state.conversionsStarted += result.started;
            state.conversionsFailled += result.failed;
            remainingConversions -= result.started;
            
            if (result.started > 0) {
                state.assignedFacilities.push(facility.id);
            }
        }
        
        // Calculate estimated completion time
        const recipe = CONVERSION_RECIPES[job.recipeId];
        if (recipe && state.conversionsStarted > 0) {
            const avgFacilityEfficiency = facilities.reduce((sum, f) => 
                sum + f.efficiency * (1 + f.level * 0.1), 0
            ) / facilities.length;
            
            const estimatedDuration = (recipe.time * 1000) / avgFacilityEfficiency;
            state.estimatedCompletionTime = Date.now() + estimatedDuration;
        }
        
        this.queue.activeJobs.set(job.id, state);
        
        const recipeName = recipe?.name || job.recipeId;
        this.addNotification('info', 
            `バッチジョブ開始: ${recipeName} - ${state.conversionsStarted}/${job.quantity} 変換を開始`,
            job.id
        );
    }
    
    private moveJobToFailed(job: BatchConversionJob, reason: string): void {
        job.status = BatchJobStatus.FAILED;
        this.queue.failedJobs.push({
            job,
            reason,
            timestamp: Date.now()
        });
        
        // Remove from active queue
        const index = this.queue.jobs.indexOf(job);
        if (index !== -1) {
            this.queue.jobs.splice(index, 1);
        }
        
        const recipe = CONVERSION_RECIPES[job.recipeId];
        this.addNotification('error', 
            `バッチジョブ失敗: ${recipe?.name || job.recipeId} - ${reason}`,
            job.id
        );
    }
    
    private findJobById(jobId: string): BatchConversionJob | undefined {
        // Check queued jobs
        let job = this.queue.jobs.find(j => j.id === jobId);
        if (job) return job;
        
        // Check completed jobs
        job = this.queue.completedJobs.find(j => j.id === jobId);
        if (job) return job;
        
        // Check failed jobs
        const failed = this.queue.failedJobs.find(f => f.job.id === jobId);
        if (failed) return failed.job;
        
        return undefined;
    }
    
    private addNotification(severity: 'info' | 'warning' | 'error', message: string, jobId?: string): void {
        const notification: BatchNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: severity === 'error' ? 'job_failed' : 'job_complete',
            jobId,
            message,
            timestamp: Date.now(),
            severity
        };
        
        this.notifications.push(notification);
        
        // Show message to user
        if (severity === 'error') {
            showMessage(`❌ ${message}`, 3000);
        }
    }
    
    private cleanupNotifications(): void {
        const maxAge = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        
        this.notifications = this.notifications.filter(n => 
            now - n.timestamp < maxAge
        );
    }
    
    // Get current metrics
    getMetrics(): BatchMetrics {
        const totalJobsQueued = this.queue.jobs.length;
        const totalJobsCompleted = this.queue.completedJobs.length;
        const totalJobsFailed = this.queue.failedJobs.length;
        
        // Calculate average completion time
        let totalCompletionTime = 0;
        let completedWithTime = 0;
        
        this.queue.completedJobs.forEach(job => {
            const state = this.queue.activeJobs.get(job.id);
            if (state && state.estimatedCompletionTime > state.startTime) {
                totalCompletionTime += state.estimatedCompletionTime - state.startTime;
                completedWithTime++;
            }
        });
        
        const averageCompletionTime = completedWithTime > 0 ? 
            totalCompletionTime / completedWithTime / 1000 : 0; // in seconds
        
        // Calculate facility utilization
        const facilityUtilization = new Map<string, number>();
        const allFacilities = conversionEngine.getAllFacilities();
        
        allFacilities.forEach(facility => {
            const isBusy = conversionEngine.isFacilityBusy(facility.id);
            facilityUtilization.set(facility.id, isBusy ? 100 : 0);
        });
        
        // Calculate resource throughput (simplified)
        const resourceThroughput = new Map<ResourceType, number>();
        
        return {
            totalJobsQueued,
            totalJobsCompleted,
            totalJobsFailed,
            averageCompletionTime,
            facilityUtilization,
            resourceThroughput
        };
    }
    
    // Get queue status
    getQueueStatus() {
        return {
            queued: this.queue.jobs,
            active: Array.from(this.queue.activeJobs.entries()).map(([jobId, state]) => ({
                job: this.findJobById(jobId),
                state
            })),
            completed: this.queue.completedJobs.slice(-10), // Last 10 completed
            failed: this.queue.failedJobs.slice(-5), // Last 5 failed
            isPaused: this.isPaused,
            templates: Array.from(this.templates.values()),
            notifications: this.notifications.slice(-10) // Last 10 notifications
        };
    }
    
    // Cleanup
    destroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Global instance
export const batchConversionSystem = new BatchConversionSystem();