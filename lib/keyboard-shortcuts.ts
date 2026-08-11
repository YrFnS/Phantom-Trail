import { BaseStorage } from './storage/base-storage';

export interface ShortcutConfig {
  command: 'toggle-popup' | 'quick-analysis';
  keys: string;
  description: string;
  category: 'navigation' | 'analysis';
  enabled: boolean;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    command: 'toggle-popup',
    keys: 'Ctrl+Shift+P',
    description: 'Open the Phantom Trail popup',
    category: 'navigation',
    enabled: true,
  },
  {
    command: 'quick-analysis',
    keys: 'Ctrl+Shift+A',
    description: 'Open the current-page evidence dashboard',
    category: 'analysis',
    enabled: true,
  },
];

const STORAGE_KEY = 'keyboardShortcuts';
const REQUESTED_VIEW_KEY = 'phantom_trail_requested_popup_view';

export class KeyboardShortcuts {
  static async handleCommand(command: string): Promise<void> {
    const shortcuts = await this.getShortcuts();
    const shortcut = shortcuts.find(item => item.command === command);
    if (!shortcut?.enabled) return;

    switch (shortcut.command) {
      case 'toggle-popup':
        await this.openPopup();
        return;
      case 'quick-analysis':
        await this.openPopup('dashboard');
    }
  }

  static async getShortcuts(): Promise<ShortcutConfig[]> {
    const stored = await BaseStorage.get<unknown>(STORAGE_KEY);
    return this.normalizeShortcuts(stored);
  }

  static async toggleShortcut(command: string): Promise<void> {
    const shortcuts = await this.getShortcuts();
    const index = shortcuts.findIndex(item => item.command === command);
    if (index === -1) return;
    shortcuts[index] = {
      ...shortcuts[index],
      enabled: !shortcuts[index].enabled,
    };
    await BaseStorage.set(STORAGE_KEY, shortcuts);
  }

  static async resetToDefaults(): Promise<void> {
    await BaseStorage.set(
      STORAGE_KEY,
      DEFAULT_SHORTCUTS.map(item => ({ ...item }))
    );
  }

  static normalizeShortcuts(value: unknown): ShortcutConfig[] {
    const stored = Array.isArray(value) ? value : [];
    return DEFAULT_SHORTCUTS.map(defaultShortcut => {
      const candidate = stored.find(
        item =>
          item &&
          typeof item === 'object' &&
          (item as { command?: unknown }).command === defaultShortcut.command
      ) as Partial<ShortcutConfig> | undefined;
      return {
        ...defaultShortcut,
        enabled: candidate?.enabled !== false,
      };
    });
  }

  private static async openPopup(
    requestedView?: 'dashboard'
  ): Promise<void> {
    if (requestedView) {
      try {
        await chrome.storage.session.set({
          [REQUESTED_VIEW_KEY]: requestedView,
        });
      } catch {
        // The popup still opens at its default view if session storage fails.
      }
    }

    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.warn('Chrome could not open the extension popup:', error);
    }
  }
}
