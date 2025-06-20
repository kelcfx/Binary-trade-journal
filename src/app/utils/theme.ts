'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export const useTheme = (): [Theme, React.Dispatch<React.SetStateAction<Theme>>] => {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemIsDark = mediaQuery.matches;

    const applyTheme = (themeValue: Theme) => {
      if (themeValue === 'dark' || (themeValue === 'auto' && systemIsDark)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return [theme, setTheme];
};
