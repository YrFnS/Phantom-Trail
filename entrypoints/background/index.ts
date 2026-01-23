import { NetworkMonitor } from './network-monitor';
import { MessageHandler } from './message-handler';
import { AlarmManager } from './alarm-manager';

export default defineBackground(() => {
  console.log('[Phantom Trail] Background script starting...');

  // Initialize core systems
  NetworkMonitor.initialize();
  MessageHandler.initialize();
  AlarmManager.initialize();

  // Update badge when tab changes
  chrome.tabs.onActivated.addListener(async activeInfo => {
    await updateBadgeForTab(activeInfo.tabId);
  });

  // Update badge when tab is updated
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      await updateBadgeForTab(tabId);
    }
  });

  // Handle keyboard shortcuts
  chrome.commands.onCommand.addListener(async command => {
    console.log('[Phantom Trail] Keyboard command received:', command);
    try {
      const { KeyboardShortcuts } =
        await import('../../lib/keyboard-shortcuts');
      await KeyboardShortcuts.handleCommand(command);
    } catch (error) {
      console.error('[Phantom Trail] Keyboard shortcut failed:', error);
    }
  });

  // Handle extension installation and startup
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Phantom Trail] Extension installed/updated');

    try {
      // Initialize default settings
      const { SettingsStorage } =
        await import('../../lib/storage/settings-storage');
      await SettingsStorage.initializeDefaults();

      // Run data migration to clean up any corrupted data
      const { DataMigration } = await import('../../lib/data-migration');
      await DataMigration.runMigrations();
    } catch (error) {
      console.error('[Phantom Trail] Failed to initialize:', error);
    }
  });

  // Also run migration on startup (in case of extension reload)
  chrome.runtime.onStartup.addListener(async () => {
    console.log('[Phantom Trail] Extension startup');

    try {
      const { DataMigration } = await import('../../lib/data-migration');
      await DataMigration.runMigrations();
    } catch (error) {
      console.error('[Phantom Trail] Failed to run startup migration:', error);
    }
  });

  console.log('[Phantom Trail] Background script initialized');
});

// Update badge for specific tab
async function updateBadgeForTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    const domain = new URL(tab.url).hostname;

    // Get tracking events for this domain
    const { EventsStorage } = await import('../../lib/storage/events-storage');
    const events = await EventsStorage.getRecentEvents(100);
    const domainEvents = events.filter(e => e.domain === domain);

    // Calculate privacy score
    const { calculatePrivacyScore } = await import('../../lib/privacy-score');
    const score = calculatePrivacyScore(domainEvents);

    // Update badge
    const { BadgeManager } = await import('../../lib/badge-manager');
    await BadgeManager.updateBadge(tabId, score);
  } catch (error) {
    console.error('[Phantom Trail] Failed to update badge:', error);
  }
}

// Import defineBackground from WXT
import { defineBackground } from 'wxt/utils/define-background';
