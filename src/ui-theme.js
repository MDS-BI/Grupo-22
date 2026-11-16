export const THEME_STORAGE_KEY = 'compras.ui.theme';

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { /* storage unavailable */
    return null;
  }
}

export function getSystemTheme() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch { /* matchMedia unavailable */
    return 'light';
  }
}

export function resolveTheme() {
  return getStoredTheme() || getSystemTheme();
}

export function applyTheme(theme, { persist = true } = {}) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, resolved); } catch { /* storage unavailable */ }
  }
  return resolved;
}

export function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || getSystemTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || resolveTheme();
  return applyTheme(current === 'dark' ? 'light' : 'dark');
}
