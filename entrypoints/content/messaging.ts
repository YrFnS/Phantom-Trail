import { ContentMessaging } from '../../lib/content-messaging';

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

export function setupMessaging(): void {
  // Skip setup if context is invalid
  if (!isContextValid()) {
    console.log('[Phantom Trail] Skipping messaging setup, context invalid');
    return;
  }

  console.log('[Phantom Trail] Messaging initialized');

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true; // Keep message channel open for async response
  });

  // Listen for P2P discovery messages
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'PHANTOM_TRAIL_P2P_DISCOVERY') {
      handleP2PDiscovery(event.data);
    }
  });

  // Set up periodic context monitoring
  setInterval(() => {
    if (!isContextValid()) {
      console.log('[Phantom Trail] Context lost, attempting recovery...');
      // The ContentMessaging class will handle reconnection automatically
    }
  }, 10000); // Check every 10 seconds
}

function handleMessage(_message: unknown, sendResponse: (response?: unknown) => void): void {
  try {
    // Check context before handling
    if (!isContextValid()) {
      sendResponse({ error: 'Extension context invalid' });
      return;
    }

    sendResponse({
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    });
  } catch (error) {
    console.warn('[Phantom Trail] Message handling error:', error);
    sendResponse({ error: 'Message handling failed' });
  }
}

function handleP2PDiscovery(data: { extensionId: string; version: string }): void {
  try {
    // Check context before handling P2P discovery
    if (!isContextValid()) {
      console.log('[Phantom Trail] Skipping P2P discovery, context invalid');
      return;
    }

    if (data.extensionId === chrome.runtime.id) {
      // Respond to P2P discovery using the improved messaging system
      ContentMessaging.sendTrackingEvent({
        id: `p2p-discovery-${Date.now()}`,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        trackerType: 'analytics',
        riskLevel: 'low',
        description: 'P2P discovery response'
      }).catch(error => {
        console.warn('[Phantom Trail] P2P discovery response failed:', error);
      });
    }
  } catch (error) {
    console.warn('[Phantom Trail] P2P discovery error:', error);
  }
}
