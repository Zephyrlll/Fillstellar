/**
 * 廃止予定要素の警告システム
 * 開発者が誤って旧UI要素を使用した場合に警告を表示
 */

// 廃止予定の要素IDリスト
const DEPRECATED_ELEMENTS = {
  'ui-area': 'デュアルビューシステムを使用してください',
  'tab-buttons': 'TabManagerを使用してください',
  'floating-controls': 'デュアルビュー内のツールバーを使用してください',
  'game-container-legacy': 'game-containerを使用してください',
  'celestialBodyCount': 'スタッツパネルを使用してください',
  'focused-celestial-body-details': 'スタッツパネルを使用してください'
};

// 廃止予定の関数リスト
const DEPRECATED_FUNCTIONS = {
  'switchTab': 'tabManager.activateTab()を使用してください',
  'updateUIArea': 'updateUI()を使用してください'
};

// getElementByIdをオーバーライド（開発環境のみ）
if (import.meta.env.DEV) {
  const originalGetElementById = document.getElementById.bind(document);
  
  document.getElementById = function(id: string): HTMLElement | null {
    if (DEPRECATED_ELEMENTS[id]) {
      console.warn(
        `⚠️ 廃止予定の要素にアクセスしています: #${id}\n` +
        `👉 代替案: ${DEPRECATED_ELEMENTS[id]}\n` +
        `📚 詳細: DEPRECATED-UI-GUIDE.md を参照してください`
      );
      console.trace(); // スタックトレースを表示
    }
    return originalGetElementById(id);
  };
}

// 廃止予定要素の視覚的マーキング
export function markDeprecatedElements(): void {
  if (!import.meta.env.DEV) return;

  Object.keys(DEPRECATED_ELEMENTS).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      // 赤い枠線を追加
      element.style.outline = '3px dashed red';
      element.style.outlineOffset = '2px';
      
      // ツールチップを追加
      element.title = `⚠️ 廃止予定: ${DEPRECATED_ELEMENTS[id]}`;
      
      // data属性を追加
      element.dataset.deprecated = 'true';
      element.dataset.deprecationMessage = DEPRECATED_ELEMENTS[id];
    }
  });
}

// 廃止予定関数の使用を検知
export function warnDeprecatedFunction(functionName: string): void {
  if (DEPRECATED_FUNCTIONS[functionName]) {
    console.warn(
      `⚠️ 廃止予定の関数を呼び出しています: ${functionName}()\n` +
      `👉 代替案: ${DEPRECATED_FUNCTIONS[functionName]}\n` +
      `📚 詳細: DEPRECATED-UI-GUIDE.md を参照してください`
    );
    console.trace();
  }
}

// 開発者ツール用のヘルパー関数
(window as any).__checkDeprecated = () => {
  console.group('🔍 廃止予定要素の使用状況');
  
  Object.keys(DEPRECATED_ELEMENTS).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const isVisible = element.offsetParent !== null;
      const hasEventListeners = (element as any)._eventListeners?.length > 0;
      
      console.log(
        `📌 #${id}:`,
        {
          存在: true,
          表示: isVisible,
          イベントリスナー: hasEventListeners,
          代替案: DEPRECATED_ELEMENTS[id]
        }
      );
    }
  });
  
  console.groupEnd();
  console.log('💡 ヒント: DEPRECATED-UI-GUIDE.md で移行ガイドを確認してください');
};