import { NetworkMonitor } from './network-monitor';
import { MessageHandler } from './message-handler';
import { AlarmManager } from './alarm-manager';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  console.log('[Phantom Trail] Background script starting...');

  NetworkMonitor.initialize();
  MessageHandler.initialize();
  AlarmManager.initialize();
  void import('../../lib/notification-manager').then(
    ({ NotificationManager }) => NotificationManager.initialize()
  );

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
    await initializePersistentState('startup');
  });

  chrome.runtime.onStartup.addListener(async () => {
    await initializePersistentState('startup');
  });

  // Service-worker restarts do not always emit installation or browser-startup
  // events, so run the idempotent migration/report checks once per worker start.
  void initializePersistentState('startup');

  console.log('[Phantom Trail] Background script initialized');
});

async function initializePersistentState(
  reportSource: 'startup'
): Promise<void> {
  try {
    const [{ SettingsStorage }, { DataMigration }, { ReportService }] =
      await Promise.all([
        import('../../lib/storage/settings-storage'),
        import('../../lib/data-migration'),
        import('../../lib/report-service'),
      ]);
    await SettingsStorage.initializeDefaults();
    await DataMigration.runMigrations();
    await ReportService.ensureCurrentReports(new Date(), reportSource);
  } catch (error) {
    console.error('[Phantom Trail] Persistent-state initialization failed:', error);
  }
}

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
