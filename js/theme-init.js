/* Параметры оформления и безопасное сохранение локальных настроек. */
(() => {
  'use strict';
  const memory = Object.assign({}, window.TROPA_INITIAL_STORAGE || {});
  window.TropaStorage = {
    read(key, fallback) {
      try {
        const raw = window.TROPA_PREVIEW ? memory[key] : localStorage.getItem(key);
        return raw === null || raw === undefined ? fallback : JSON.parse(raw);
      } catch (_) { return fallback; }
    },
    write(key, value) {
      const raw = JSON.stringify(value);
      memory[key] = raw;
      if (window.TROPA_PREVIEW) {
        window.parent.postMessage({ tropaStorage: { key, raw } }, '*');
        return true;
      }
      try { localStorage.setItem(key, raw); return true; }
      catch (_) { return false; }
    }
  };
  const saved = window.TropaStorage.read('tropa.theme', null);
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved === 'light' || saved === 'dark' ? saved : (systemDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  document.documentElement.setAttribute('data-bs-theme', theme);
})();
