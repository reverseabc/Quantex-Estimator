import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, setTheme } from './theme';

/**
 * Light / dark switch. `variant="row"` is the full-width sidebar button;
 * `variant="icon"` is a compact round button (used on the login screen).
 */
export const ThemeToggle = ({ variant = 'row' }) => {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener('qx:theme', onChange);
    return () => window.removeEventListener('qx:theme', onChange);
  }, []);

  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        title={label}
        aria-label={label}
        className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-[#5ABBCE] shadow-sm transition-colors"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={label}
      className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-[#5ABBCE] rounded-lg transition-colors mb-2 group"
    >
      {isDark ? (
        <Sun size={18} className="group-hover:text-[#5ABBCE]" />
      ) : (
        <Moon size={18} className="group-hover:text-[#5ABBCE]" />
      )}
      <span className="font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
