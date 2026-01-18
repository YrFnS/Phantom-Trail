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
  private static mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

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
      
      // Dispatch theme change event
      window.dispatchEvent(new CustomEvent('themechange', { 
        detail: { theme } 
      }) as CustomEvent<{ theme: Theme }>);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }

  static async toggleTheme(): Promise<void> {
    const currentTheme = await this.getCurrentTheme();
    
    if (currentTheme === Theme.AUTO) {
      const systemTheme = this.getSystemTheme();
      const newTheme = systemTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK;
      await this.setTheme(newTheme);
    } else {
      const newTheme = currentTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
      await this.setTheme(newTheme);
    }
  }

  static getSystemTheme(): Theme {
    return this.mediaQuery.matches ? Theme.DARK : Theme.LIGHT;
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
    const root = document.documentElement;
    
    if (theme === Theme.AUTO) {
      const systemTheme = this.getSystemTheme();
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  static async initializeTheme(): Promise<void> {
    const theme = await this.getCurrentTheme();
    this.applyTheme(theme);
    this.setupSystemThemeListener();
  }

  private static setupSystemThemeListener(): void {
    this.mediaQuery.addEventListener('change', async () => {
      const currentTheme = await this.getCurrentTheme();
      if (currentTheme === Theme.AUTO) {
        this.applyTheme(Theme.AUTO);
      }
    });
  }
}
