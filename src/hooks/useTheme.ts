import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// AA Contrast compliance checker
export const checkContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = hex.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

export const meetsAAContrast = (foreground: string, background: string): boolean => {
  return checkContrastRatio(foreground, background) >= 4.5;
};

export const useTheme = (): ThemeContextType => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('theme') as Theme) || 'auto';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateResolvedTheme = () => {
      if (theme === 'auto') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme === 'dark' ? 'dark' : 'light');
      }
    };

    const handleChange = () => {
      if (theme === 'auto') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    updateResolvedTheme();

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('auto');
    } else {
      setTheme('light');
    }
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  };
};