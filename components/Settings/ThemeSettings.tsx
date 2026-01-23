import { useState, useEffect } from 'react';
import { ThemeManager, Theme } from '../../lib/theme-manager';

export function ThemeSettings() {
  const [theme, setTheme] = useState<Theme>(Theme.AUTO);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const currentTheme = await ThemeManager.getCurrentTheme();
      setTheme(currentTheme);
    };
    loadTheme();

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: Theme }>;
      setTheme(customEvent.detail.theme);
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  const handleThemeChange = async (newTheme: Theme) => {
    setIsLoading(true);
    try {
      await ThemeManager.setTheme(newTheme);
    } catch (error) {
      console.error('Failed to change theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
          Theme Preference
        </label>
        <div className="space-y-2">
          <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
            <input
              type="radio"
              name="theme"
              value={Theme.AUTO}
              checked={theme === Theme.AUTO}
              onChange={() => handleThemeChange(Theme.AUTO)}
              disabled={isLoading}
              className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-[var(--text-secondary)]"
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
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Auto
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Follow system preference
                </div>
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
            <input
              type="radio"
              name="theme"
              value={Theme.LIGHT}
              checked={theme === Theme.LIGHT}
              onChange={() => handleThemeChange(Theme.LIGHT)}
              disabled={isLoading}
              className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-[var(--text-secondary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41" />
              </svg>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Light
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Bright theme for daytime use
                </div>
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
            <input
              type="radio"
              name="theme"
              value={Theme.DARK}
              checked={theme === Theme.DARK}
              onChange={() => handleThemeChange(Theme.DARK)}
              disabled={isLoading}
              className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-[var(--text-secondary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Dark
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Easy on eyes for low-light environments
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            Applying theme...
          </span>
        </div>
      )}
    </div>
  );
}
