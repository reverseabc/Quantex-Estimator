/**
 * Light / dark theme.
 * The choice is saved per browser. With no saved choice, it follows the
 * device setting (prefers-color-scheme). index.html applies it before the
 * app loads so there's no white flash on dark mode.
 */
const STORAGE_KEY = 'qx-theme';

export function getTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  root.classList.toggle('dark', theme === 'dark');
  window.setTimeout(() => root.classList.remove('theme-transition'), 250);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: theme still applies for this visit */
  }
  window.dispatchEvent(new CustomEvent('qx:theme', { detail: theme }));
}
