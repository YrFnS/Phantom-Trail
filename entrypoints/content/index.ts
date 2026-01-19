import { defineContentScript } from 'wxt/utils/define-content-script';
import { setupDOMMonitoring } from './dom-monitoring';
import { setupMessaging } from './messaging';
import { handleLinkHover, handleLinkLeave } from './privacy-prediction';
import { cleanupExpiredSignatures } from './event-detection';

/**
 * Check if extension context is still valid
 */
function isContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id !== undefined;
  } catch {
    return false;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',

  async main() {
    console.log('[Phantom Trail] Content script loaded');

    // Check context before initialization
    if (!isContextValid()) {
      console.warn('[Phantom Trail] Extension context invalid at startup, retrying...');
      
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!isContextValid()) {
        console.error('[Phantom Trail] Extension context still invalid, aborting initialization');
        return;
      }
    }

    try {
      // Initialize core systems
      setupMessaging();
      setupDOMMonitoring();

      // Set up privacy prediction on links
      document.addEventListener('mouseover', (event) => {
        if (!isContextValid()) return;
        
        const target = event.target as HTMLElement;
        if (target.tagName === 'A') {
          handleLinkHover(target as HTMLAnchorElement);
        }
      });

      document.addEventListener('mouseout', (event) => {
        if (!isContextValid()) return;
        
        const target = event.target as HTMLElement;
        if (target.tagName === 'A') {
          handleLinkLeave();
        }
      });

      // Inject main world script for deeper tracking detection
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

      // Clean up expired signatures every 30 seconds
      const cleanupInterval = setInterval(() => {
        if (isContextValid()) {
          cleanupExpiredSignatures();
        } else {
          // Clear interval if context is invalid
          clearInterval(cleanupInterval);
        }
      }, 30000);

      console.log('[Phantom Trail] Content script initialization complete');
    } catch (error) {
      console.error('[Phantom Trail] Content script initialization failed:', error);
    }
  }
});
