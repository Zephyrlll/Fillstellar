/**
 * Tutorial Definitions
 * All tutorial content and progression
 */

import { Tutorial, TutorialCategory } from '../types/tutorial.js';

export const tutorials: Tutorial[] = [
  // Welcome tutorial - 基本UI説明
  {
    id: 'welcome',
    name: '宇宙へようこそ。',
    description: 'ゲームの基本を学ぶ',
    category: TutorialCategory.BASICS,
    autoStart: true,
    priority: 100,
    steps: [
      {
        id: 'welcome-1',
        title: 'Fillstellarへようこそ！',
        content: 'あなたは宇宙の創造者です。宇宙の塵から始まり、恒星、惑星、そして生命を創造し、最終的には知的生命体を育てることが目的です。',
        position: 'center',
        skipable: false
      },
      {
        id: 'welcome-1b',
        title: 'ゲームの流れ',
        content: '宇宙の塵を集めて天体を創造し、エネルギーや資源を生産します。研究を進めることで新しい天体や技術が解放されます。まずは小惑星を作ってみましょう！',
        position: 'center',
        skipable: false
      },
      {
        id: 'welcome-2',
        title: '年と思考速度',
        content: '画面上を見てください。ここには現在の宇宙の年齢と、活発度によるあなたの思考速度が表示されています。',
        position: 'center'
      },
      {
        id: 'welcome-3',
        title: '基本システムパネル',
        content: '画面左上を見てください。ここにはゲームの基本的なシステムが収納されています。タブを切り替えてみましょう。',
        position: 'center'
      },
      {
        id: 'welcome-4',
        title: 'レーダー',
        content: '画面左下を見てください。ここには恒星の位置を示すレーダーがあります。',
        position: 'center'
      },
      {
        id: 'welcome-5',
        title: '統計やログ',
        content: '画面中央下部を見てください。ここでは統計やログを見ることができます。項目をクリックして△ボタンを押すと表示されます。',
        position: 'center'
      },
      {
        id: 'welcome-6',
        title: '基本ステータスパネル',
        content: '画面右下を見てください。ここにはゲームの基本的な要素の数が表示されています。',
        position: 'center'
      },
      {
        id: 'welcome-7',
        title: 'ボタン',
        content: '画面右側を見てください。複数のボタンがあります。ここではあなたのメインの活動である、研究システム、生産システムなどが収納されています。',
        position: 'center'
      },
      {
        id: 'welcome-8',
        title: '最後に',
        content: 'お疲れさまでした。もうあなたは自由です。ログインすることで、ゲームを最大限楽しめます。ゲームに関するフィードバックを三本線のマークからお願いします。',
        position: 'center'
      }
    ]
  }
];

// Get tutorial by ID
export function getTutorialById(id: string): Tutorial | undefined {
  return tutorials.find(t => t.id === id);
}

// Get tutorials by category
export function getTutorialsByCategory(category: TutorialCategory): Tutorial[] {
  return tutorials.filter(t => t.category === category);
}

// Get available tutorials for phase
export function getAvailableTutorials(currentPhase: number, completedTutorials: Set<string>): Tutorial[] {
  return tutorials.filter(t => {
    // Check phase requirement
    if (t.requiredPhase !== undefined && currentPhase < t.requiredPhase) {
      return false;
    }
    
    // Check if already completed
    if (completedTutorials.has(t.id)) {
      return false;
    }
    
    // Check prerequisite
    if (t.prerequisite && !completedTutorials.has(t.prerequisite)) {
      return false;
    }
    
    return true;
  });
}

// Get next tutorial to show
export function getNextTutorial(currentPhase: number, completedTutorials: Set<string>): Tutorial | undefined {
  const available = getAvailableTutorials(currentPhase, completedTutorials);
  
  // Sort by priority (higher first) and autoStart
  available.sort((a, b) => {
    if (a.autoStart && !b.autoStart) return -1;
    if (!a.autoStart && b.autoStart) return 1;
    return (b.priority || 0) - (a.priority || 0);
  });
  
  return available[0];
}