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
  },
  
  // Interactive gameplay tutorial
  {
    id: 'first-asteroid',
    name: '最初の小惑星を作ろう',
    description: '実際に天体を作成してみる',
    category: TutorialCategory.BASICS,
    autoStart: false,
    priority: 90,
    prerequisite: 'welcome',
    steps: [
      {
        id: 'asteroid-1',
        title: '小惑星を作成しよう',
        content: '画面右側の「小惑星を作成」ボタンをクリックしてください。宇宙の塵100を消費して小惑星を作成できます。',
        targetElement: '.create-asteroid-button',
        position: 'left',
        requireAction: 'create-asteroid',
        skipable: false
      },
      {
        id: 'asteroid-2',
        title: '素晴らしい！',
        content: '最初の天体を作成しました！小惑星は重力で相互作用し、衝突して成長することがあります。',
        position: 'center'
      },
      {
        id: 'asteroid-3',
        title: '短期目標を確認',
        content: '画面右上の短期目標パネルを見てください。次に何をすべきかが常に表示されています。',
        targetElement: '#short-term-goals',
        position: 'left'
      }
    ]
  },
  
  // Star creation tutorial
  {
    id: 'first-star',
    name: '恒星の作成',
    description: 'エネルギー生産の要となる恒星を作る',
    category: TutorialCategory.BASICS,
    autoStart: false,
    priority: 80,
    triggerCondition: 'dust >= 1000',
    steps: [
      {
        id: 'star-1',
        title: '恒星を作る準備ができました！',
        content: '宇宙の塵が1000以上溜まりました。恒星を作成してエネルギー生産を始めましょう。',
        position: 'center'
      },
      {
        id: 'star-2',
        title: '恒星作成ボタン',
        content: '「恒星を作成」ボタンをクリックして、最初の恒星を配置してください。',
        targetElement: '.create-star-button',
        position: 'left',
        requireAction: 'create-star'
      },
      {
        id: 'star-3',
        title: 'エネルギー生産開始！',
        content: '恒星はエネルギーを生産します。エネルギーは研究や高度な天体作成に必要です。',
        position: 'center'
      }
    ]
  },
  
  // Research tutorial
  {
    id: 'research-basics',
    name: '研究システム',
    description: '新技術の解放方法を学ぶ',
    category: TutorialCategory.BASICS,
    autoStart: false,
    priority: 70,
    triggerCondition: 'energy >= 100',
    steps: [
      {
        id: 'research-1',
        title: '研究を始めよう',
        content: 'エネルギーが100以上溜まりました。研究システムで新しい技術を解放できます。',
        position: 'center'
      },
      {
        id: 'research-2',
        title: '研究ラボを開く',
        content: '画面右側の「研究ラボ」ボタンをクリックしてください。',
        targetElement: '.research-lab-button',
        position: 'left',
        requireAction: 'open-research'
      },
      {
        id: 'research-3',
        title: '技術を選択',
        content: '利用可能な研究項目から興味のあるものを選んで研究を開始しましょう。新しい天体タイプや効率向上が解放されます。',
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