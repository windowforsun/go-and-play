import { savePersisted } from './store.js';

export function toggleTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyTheme(theme, root = document.documentElement) {
  root.setAttribute('data-theme', theme);
}

// 브라우저 전용 배선. store: createStore 결과, storage: localStorage.
export function initTheme(store, storage, root = document.documentElement) {
  applyTheme(store.get().settings.theme, root);
  return function toggle() {
    const next = toggleTheme(store.get().settings.theme);
    store.set({ settings: { ...store.get().settings, theme: next } });
    applyTheme(next, root);
    savePersisted(store.get(), storage);
  };
}
