import { NetworkMonitor } from './network-monitor';
import { MessageHandler } from './message-handler';
import { AlarmManager } from './alarm-manager';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  console.log('[Phantom Trail] Background script starting...');

  NetworkMonitor.initialize();
  MessageHandler.initialize();
  AlarmManager.initialize();

  chrome.tabs.onActivated.addListener(async activeInfo => {
    await updateBadgeForTab(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      await updateBadgeForTab(tabId);
    }
  });

  chrome.commands.onCommand.addListener(async command => {
    try {
      const { KeyboardShortcuts } =
        await import('../../lib/keyboard-shortcuts');
      await KeyboardShortcuts.handleCommand(command);
    } catch (error) {
      console.error('[Phantom Trail] Keyboard shortcut failed:', error);
    }
  });

  chrome.runtime.onInstalled.addListener(async () => {
    try {
      const { SettingsStorage } =
        await import('../../lib/storage/settings-storage');
      await SettingsStorage.initializeDefaults();
      const { DataMigration } = await import('../../lib/data-migration');
      await DataMigration.runMigrations();
    } catch (error) {
      console.error('[Phantom Trail] Failed to initialize:', error);
    }
  });

  chrome.runtime.onStartup.addListener(async () => {
    try {
      const { DataMigration } = await import('../../lib/data-migration');
      await DataMigration.runMigrations();
    } catch (error) {
      console.error('[Phantom Trail] Failed to run startup migration:', error);
    }
  });

  // Extension reloads do not always produce onInstalled/onStartup in the test
  // lifecycle, so apply non-destructive migration once per worker start too.
  void import('../../lib/data-migration')
    .then(({ DataMigration }) => DataMigration.runMigrations())
    .catch(error => {
      console.error('[Phantom Trail] Worker-start migration failed:', error);
    });

  console.log('[Phantom Trail] Background script initialized');
});

async function updateBadgeForTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^https?:\/\//u.test(tab.url)) return;

    const domain = new URL(tab.url).hostname.toLowerCase();
    const [{ EventsStorage }, { eventMatchesPageDomain }] = await Promise.all([
      import('../../lib/storage/events-storage'),
      import('../../lib/event-attribution.mts'),
    ]);
    const events = await EventsStorage.getRecentEvents(1000);
    const domainEvents = events.filter(event =>
      eventMatchesPageDomain(event, domain)
    );

    const { calculatePrivacyScore } = await import('../../lib/privacy-score');
    const score = calculatePrivacyScore(domainEvents, true, {
      scope: 'page',
      pageDomain: domain,
    });

    const { BadgeManager } = await import('../../lib/badge-manager');
    await BadgeManager.updateBadge(tabId, score);
  } catch (error) {
    console.error('[Phantom Trail] Failed to update badge:', error);
  }
}
