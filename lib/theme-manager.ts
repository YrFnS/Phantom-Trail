export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export interface ThemeConfig {
  current: Theme;
  autoSwitch: boolean;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  current: Theme.AUTO,
  autoSwitch: true
};

const STORAGE_KEY = 'phantom-trail-theme';

export class ThemeManager {
  private static getMediaQuery() {
    // Check if we're in a browser context (not service worker)
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)');
    }
    // Fallback for service worker context
    return { matches: false };
  }

  static async getCurrentTheme(): Promise<Theme> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const config: ThemeConfig = result[STORAGE_KEY] || DEFAULT_THEME_CONFIG;
      return config.current;
    } catch (error) {
      console.error('Failed to get current theme:', error);
      return Theme.AUTO;
    }
  }

  static async setTheme(theme: Theme): Promise<void> {
    try {
      const config: ThemeConfig = {
        current: theme,
        autoSwitch: theme === Theme.AUTO
      };
      
      await chrome.storage.local.set({ [STORAGE_KEY]: config });
      this.applyTheme(theme);
      
      // Dispatch theme change event (only in browser context)
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('themechange', { 
          detail: { theme } 
        }) as CustomEvent<{ theme: Theme }>);
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }

  static async toggleTheme(): Promise<void> {
    const currentTheme = await this.getCurrentTheme();
    
    let newTheme: Theme;
    if (currentTheme === Theme.AUTO) {
      newTheme = Theme.DARK;
    } else if (currentTheme === Theme.DARK) {
      newTheme = Theme.LIGHT;
    } else {
      newTheme = Theme.DARK;
    }
    
    await this.setTheme(newTheme);
  }

  static getSystemTheme(): Theme {
    const mediaQuery = this.getMediaQuery();
    return mediaQuery.matches ? Theme.DARK : Theme.LIGHT;
  }

  static async setAutoTheme(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.setTheme(Theme.AUTO);
    } else {
      const systemTheme = this.getSystemTheme();
      await this.setTheme(systemTheme);
    }
  }

  static applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove existing theme attributes
    root.removeAttribute('data-theme');
    
    if (theme === Theme.AUTO) {
      const systemTheme = this.getSystemTheme();
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // Also set on body for extension popup
    if (document.body) {
      document.body.removeAttribute('data-theme');
      const appliedTheme = theme === Theme.AUTO ? this.getSystemTheme() : theme;
      document.body.setAttribute('data-theme', appliedTheme);
    }
  }

  static async initializeTheme(): Promise<void> {
    const theme = await this.getCurrentTheme();
    this.applyTheme(theme);
    this.setupSystemThemeListener();
    
    // Set initial theme on document load
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.applyTheme(theme));
      } else {
        this.applyTheme(theme);
      }
    }
  }

  private static setupSystemThemeListener(): void {
    // Only set up listener in browser context (not service worker)
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = this.getMediaQuery();
      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', async () => {
          const currentTheme = await this.getCurrentTheme();
          if (currentTheme === Theme.AUTO) {
            this.applyTheme(Theme.AUTO);
          }
        });
      }
    }
  }
}
