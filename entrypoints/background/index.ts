import { NetworkMonitor } from './network-monitor';
import { MessageHandler } from './message-handler';
import { AlarmManager } from './alarm-manager';

export default defineBackground(() => {
  console.log('[Phantom Trail] Background script starting...');

  // Initialize core systems
  NetworkMonitor.initialize();
  MessageHandler.initialize();
  AlarmManager.initialize();

  // Handle extension installation
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Phantom Trail] Extension installed/updated');
    
    // Initialize default settings
    try {
      const { StorageManager } = await import('../../lib/storage-manager');
      await StorageManager.initializeDefaults();
    } catch (error) {
      console.error('[Phantom Trail] Failed to initialize defaults:', error);
    }
  });

  console.log('[Phantom Trail] Background script initialized');
});

// Import defineBackground from WXT
import { defineBackground } from 'wxt/utils/define-background';
