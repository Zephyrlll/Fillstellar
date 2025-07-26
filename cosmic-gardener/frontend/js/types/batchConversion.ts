// Batch Conversion System Types

import { ResourceType, QualityTier } from '@/resourceSystem';
import { ConversionRecipe } from '@/resourceSystem';

export interface BatchConversionJob {
    id: string;
    recipeId: string;
    quantity: number;
    priority: number; // 0-10, higher = more priority
    createdAt: number;
    status: BatchJobStatus;
    facilityRestrictions?: string[]; // Optional: limit to specific facilities
    qualityRequirement?: QualityTier; // Optional: minimum quality requirement
}

export enum BatchJobStatus {
    QUEUED = 'queued',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    PAUSED = 'paused'
}

export interface BatchQueue {
    jobs: BatchConversionJob[];
    activeJobs: Map<string, BatchExecutionState>;
    completedJobs: BatchConversionJob[];
    failedJobs: Array<{
        job: BatchConversionJob;
        reason: string;
        timestamp: number;
    }>;
}

export interface BatchExecutionState {
    jobId: string;
    conversionsStarted: number;
    conversionsCompleted: number;
    conversionsFailled: number;
    assignedFacilities: string[];
    startTime: number;
    estimatedCompletionTime: number;
}

export interface BatchSchedulingStrategy {
    name: string;
    description: string;
    prioritizeJobs(jobs: BatchConversionJob[], facilities: string[]): BatchConversionJob[];
}

export interface BatchMetrics {
    totalJobsQueued: number;
    totalJobsCompleted: number;
    totalJobsFailed: number;
    averageCompletionTime: number;
    facilityUtilization: Map<string, number>; // facility id -> utilization percentage
    resourceThroughput: Map<ResourceType, number>; // resources produced per minute
}

export interface BatchTemplate {
    id: string;
    name: string;
    description: string;
    jobs: Array<{
        recipeId: string;
        quantity: number;
        priority: number;
    }>;
    tags: string[];
}

export interface BatchNotification {
    id: string;
    type: 'job_complete' | 'job_failed' | 'queue_empty' | 'resource_shortage';
    jobId?: string;
    message: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'error';
}