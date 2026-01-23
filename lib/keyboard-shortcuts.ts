import { ExportService } from './export-service';
import { calculatePrivacyScore } from './privacy-score';

import { BaseStorage } from './storage/base-storage';
import { EventsStorage } from './storage/events-storage';

export interface ShortcutConfig {
  command: string;
  keys: string;
  description: string;
  category: 'navigation' | 'analysis' | 'data' | 'ui';
  enabled: boolean;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    command: 'toggle-popup',
    keys: 'Ctrl+Shift+P',
    description: 'Open/close extension popup',
    category: 'navigation',
    enabled: true,
  },
  {
    command: 'quick-analysis',
    keys: 'Ctrl+Shift+A',
    description: 'Quick privacy analysis of current site',
    category: 'analysis',
    enabled: true,
  },
  {
    command: 'export-data',
    keys: 'Ctrl+Shift+E',
    description: 'Export privacy data',
    category: 'data',
    enabled: true,
  },
];

export const IN_PAGE_SHORTCUTS: Record<string, string> = {
  'Ctrl+Shift+T': 'toggle-tracking-overlay',
  'Ctrl+Shift+S': 'show-site-analysis',
  'Ctrl+Shift+B': 'toggle-blocking-mode',
  Escape: 'close-overlays',
};

export class KeyboardShortcuts {
  private static readonly STORAGE_KEY = 'keyboardShortcuts';

  static async handleCommand(command: string): Promise<void> {
    const shortcuts = await this.getShortcuts();
    const shortcut = shortcuts.find(s => s.command === command);

    if (!shortcut || !shortcut.enabled) {
      return;
    }

    try {
      switch (command) {
        case 'toggle-popup':
          await this.togglePopup();
          break;
        case 'quick-analysis':
          await this.performQuickAnalysis();
          break;
        case 'export-data':
          await this.exportPrivacyData();
          break;
        default:
          console.warn('Unknown command:', command);
      }
    } catch (error) {
      console.error('Shortcut execution failed:', error);
    }
  }

  static async getShortcuts(): Promise<ShortcutConfig[]> {
    const stored = await BaseStorage.get<ShortcutConfig[]>(this.STORAGE_KEY);
    return stored || DEFAULT_SHORTCUTS;
  }

  static async updateShortcut(command: string, keys: string): Promise<void> {
    const shortcuts = await this.getShortcuts();
    const index = shortcuts.findIndex(s => s.command === command);

    if (index !== -1) {
      shortcuts[index].keys = keys;
      await BaseStorage.set(this.STORAGE_KEY, shortcuts);
    }
  }

  static async toggleShortcut(command: string): Promise<void> {
    const shortcuts = await this.getShortcuts();
    const index = shortcuts.findIndex(s => s.command === command);

    if (index !== -1) {
      shortcuts[index].enabled = !shortcuts[index].enabled;
      await BaseStorage.set(this.STORAGE_KEY, shortcuts);
    }
  }

  static async resetToDefaults(): Promise<void> {
    await BaseStorage.set(this.STORAGE_KEY, DEFAULT_SHORTCUTS);
  }

  private static async togglePopup(): Promise<void> {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // Toggle popup by sending message to content script
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TOGGLE_POPUP',
          source: 'keyboard_shortcut',
        });
      } catch {
        // If content script not available, open popup normally
        chrome.action.openPopup();
      }
    }
  }

  private static async performQuickAnalysis(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab?.url) return;

    try {
      const domain = new URL(activeTab.url).hostname;
      const isHttps = activeTab.url.startsWith('https:');

      // Get recent events for this domain
      const events = await EventsStorage.getRecentEvents(100);
      const domainEvents = events.filter(
        event => event.domain === domain || event.url.includes(domain)
      );

      // Calculate privacy score
      const score = calculatePrivacyScore(domainEvents, isHttps);

      // Send analysis to content script for display
      await chrome.tabs.sendMessage(activeTab.id!, {
        type: 'SHOW_QUICK_ANALYSIS',
        data: {
          domain,
          score,
          eventCount: domainEvents.length,
        },
      });
    } catch (error) {
      console.error('Quick analysis failed:', error);
    }
  }

  private static async exportPrivacyData(): Promise<void> {
    try {
      const events = await EventsStorage.getRecentEvents(1000);

      await ExportService.exportAsJSON(events);

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/icon-48.png',
        title: 'Phantom Trail',
        message: 'Privacy data exported successfully',
      });
    } catch {
      console.error('Export failed');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/icon-48.png',
        title: 'Phantom Trail',
        message: 'Export failed. Please try again.',
      });
    }
  }

  static showShortcutFeedback(action: string): void {
    // This will be called from content script
    const notification = document.createElement('div');
    notification.className = 'phantom-trail-shortcut-feedback';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      ">
        🛡️ ${action}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }
}
