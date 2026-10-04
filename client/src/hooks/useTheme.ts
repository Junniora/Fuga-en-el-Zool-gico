import { useEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';
const storageKey = 'fuga-theme';
function validTheme(value: string | null | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}
function savedTheme(): Theme | null {
  try {
    return validTheme(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}
function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () =>
      validTheme(document.documentElement.dataset.theme) ??
      savedTheme() ??
      systemTheme(),
  );
  const preference = useRef(savedTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const background = getComputedStyle(root)
      .getPropertyValue('--bg-primary')
      .trim();
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', background);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (preference.current === null)
        setTheme(media.matches ? 'dark' : 'light');
    };
    const syncTabs = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      preference.current = validTheme(event.newValue);
      setTheme(preference.current ?? systemTheme());
    };
    followSystem();
    media.addEventListener('change', followSystem);
    window.addEventListener('storage', syncTabs);
    const frame = requestAnimationFrame(() =>
      document.documentElement.classList.add('theme-ready'),
    );
    return () => {
      media.removeEventListener('change', followSystem);
      window.removeEventListener('storage', syncTabs);
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove('theme-ready');
    };
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    preference.current = next;
    setTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Keep the manual choice for this visit even when persistence is unavailable.
    }
  };
  return { theme, toggleTheme };
}
