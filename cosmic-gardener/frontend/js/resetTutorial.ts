/**
 * Tutorial Reset Utility
 * チュートリアルの進行状況をリセットする
 */

export function resetTutorial(): void {
  // チュートリアルの保存データを削除
  localStorage.removeItem('tutorialState');
  
  console.log('[TUTORIAL] Tutorial progress has been reset');
  console.log('[TUTORIAL] Please refresh the page to see the tutorial again');
  
  // フィードバック表示
  const feedbackSystem = (window as any).feedbackSystem;
  if (feedbackSystem) {
    feedbackSystem.showToast({
      message: 'チュートリアルの進行状況をリセットしました。ページを更新してください。',
      type: 'info',
      duration: 5000
    });
  }
}

// グローバルに公開
(window as any).resetTutorial = resetTutorial;