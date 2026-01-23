import { useState, useEffect } from 'react';
import { ThemeManager, Theme } from '../../lib/theme-manager';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(Theme.AUTO);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: Theme }>;
      setTheme(customEvent.detail.theme);
    };

    const loadTheme = async () => {
      const currentTheme = await ThemeManager.getCurrentTheme();
      setTheme(currentTheme);
    };

    loadTheme();

    if (typeof window !== 'undefined') {
      window.addEventListener('themechange', handleThemeChange);
      return () => window.removeEventListener('themechange', handleThemeChange);
    }
  }, []);

  const toggleTheme = async () => {
    setIsLoading(true);
    try {
      await ThemeManager.toggleTheme();
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    if (theme === Theme.AUTO) {
      return (
        <svg
          className={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41" />
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            opacity="0.5"
          />
        </svg>
      );
    }

    if (theme === Theme.LIGHT) {
      return (
        <svg
          className={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41" />
        </svg>
      );
    }

    return (
      <svg
        className={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  };

  const buttonSize = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <button
      onClick={toggleTheme}
      disabled={isLoading}
      className={`${buttonSize} rounded-md hover:bg-[var(--bg-tertiary)] hover:border hover:border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${className}`}
      title={`Current: ${theme} theme`}
      aria-label={`Switch theme (current: ${theme})`}
    >
      {isLoading ? (
        <div
          className={`animate-spin rounded-full border-b-2 border-current ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`}
        />
      ) : (
        getIcon()
      )}
    </button>
  );
}
