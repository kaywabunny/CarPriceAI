import { useState, useEffect } from 'react';

/**
 * Hook to detect current theme (light/dark)
 * Returns true if dark mode is active, false if light mode
 */
export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Check on mount
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen to system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      if (savedTheme === 'system') {
        checkTheme();
      }
    };
    mediaQuery.addEventListener('change', handleSystemTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemTheme);
    };
  }, []);

  return isDark;
};
