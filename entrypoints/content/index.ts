import { defineContentScript } from 'wxt/utils/define-content-script';
import { setupDOMMonitoring } from './dom-monitoring';
import { setupMessaging } from './messaging';
import { cleanupExpiredSignatures } from './event-detection';

function isContextValid(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.id !== undefined
    );
  } catch {
    return false;
  }
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'ISOLATED',

  async main() {
    console.log('[Phantom Trail] Content script loaded');

    if (!isContextValid()) {
      console.warn(
        '[Phantom Trail] Extension context invalid at startup, retrying...'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!isContextValid()) {
        console.error(
          '[Phantom Trail] Extension context still invalid, aborting initialization'
        );
        return;
      }
    }

    try {
      setupMessaging();
      setupDOMMonitoring();

      if (document.documentElement && isContextValid()) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content-main-world.js');
        script.onload = () => script.remove();
        script.onerror = () => {
          console.warn('[Phantom Trail] Failed to load main world script');
          script.remove();
        };
        (document.head || document.documentElement).appendChild(script);
      }

      const cleanupInterval = setInterval(() => {
        if (isContextValid()) {
          cleanupExpiredSignatures();
        } else {
          clearInterval(cleanupInterval);
        }
      }, 30000);

      console.log('[Phantom Trail] Content script initialization complete');
    } catch (error) {
      console.error(
        '[Phantom Trail] Content script initialization failed:',
        error
      );
    }
  },
});
