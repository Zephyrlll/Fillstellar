// Wrapper for anime.js to handle import issues
declare global {
  interface Window {
    anime: any;
  }
}

// Dynamic import as fallback
let animeLib: any;

export async function loadAnime() {
  if (typeof window !== 'undefined' && window.anime) {
    animeLib = window.anime;
  } else {
    try {
      const module = await import('animejs');
      animeLib = module.default || module;
    } catch (error) {
      console.error('[ANIMATION] Failed to load anime.js:', error);
      // Fallback to no-op
      animeLib = () => ({ play: () => {}, pause: () => {} });
    }
  }
  return animeLib;
}

export function getAnime() {
  return animeLib || (() => ({ play: () => {}, pause: () => {} }));
}