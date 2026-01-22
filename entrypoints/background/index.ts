import { NetworkMonitor } from './network-monitor';
import { MessageHandler } from './message-handler';
import { AlarmManager } from './alarm-manager';

export default defineBackground(() => {
  console.log('[Phantom Trail] Background script starting...');

  // Initialize core systems
  NetworkMonitor.initialize();
  MessageHandler.initialize();
  AlarmManager.initialize();

  // Handle keyboard shortcuts
  chrome.commands.onCommand.addListener(async (command) => {
    console.log('[Phantom Trail] Keyboard command received:', command);
    try {
      const { KeyboardShortcuts } = await import('../../lib/keyboard-shortcuts');
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
      const { SettingsStorage } = await import('../../lib/storage/settings-storage');
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

// Import defineBackground from WXT
import { defineBackground } from 'wxt/utils/define-background';
