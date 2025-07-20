/**
 * Tutorial System Types
 * Progressive tutorial definitions
 */

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;  // CSS selector for highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: TutorialAction;
  condition?: TutorialCondition;
  skipable?: boolean;
}

export interface TutorialAction {
  type: 'click' | 'hover' | 'wait' | 'custom';
  target?: string;  // CSS selector
  duration?: number;  // For wait actions
  callback?: () => void;  // For custom actions
}

export interface TutorialCondition {
  type: 'resource' | 'celestial' | 'ui_action' | 'phase' | 'custom';
  target?: string;
  value?: number;
  check?: () => boolean;  // For custom conditions
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  category: TutorialCategory;
  steps: TutorialStep[];
  requiredPhase?: number;
  prerequisite?: string;  // Previous tutorial ID
  autoStart?: boolean;
  priority?: number;
}

export enum TutorialCategory {
  BASICS = 'basics',
  RESOURCES = 'resources',
  CELESTIAL = 'celestial',
  LIFE = 'life',
  RESEARCH = 'research',
  PRESTIGE = 'prestige',
  ADVANCED = 'advanced'
}

export interface TutorialState {
  currentTutorial?: string;
  currentStep?: number;
  completedTutorials: Set<string>;
  skippedTutorials: Set<string>;
  tutorialHistory: TutorialHistoryEntry[];
  isActive: boolean;
  isPaused: boolean;
}

export interface TutorialHistoryEntry {
  tutorialId: string;
  startTime: number;
  completionTime?: number;
  wasSkipped: boolean;
  stepsCompleted: number;
}