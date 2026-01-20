import { StorageManager } from '../../lib/storage-manager';
import { TrackerDatabase } from '../../lib/tracker-db';
import type { TrackingEvent } from '../../lib/types';

export class NetworkMonitor {
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) return;

    chrome.webRequest.onBeforeRequest.addListener(
      this.handleRequest.bind(this),
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    this.isInitialized = true;
    console.log('[Phantom Trail] Network monitoring initialized');
  }

  private static handleRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
    // Make async call without blocking
    this.processRequest(details).catch(error => {
      console.error('[Network Monitor] Request processing failed:', error);
    });
  }

  private static async processRequest(details: chrome.webRequest.WebRequestBodyDetails): Promise<void> {
    try {
      if (!details.url || details.tabId === -1) return;

      // Use comprehensive tracker detection
      const trackerInfo = TrackerDatabase.classifyUrl(details.url);
      
      if (trackerInfo) {
        const url = new URL(details.url);
        const domain = url.hostname;

        const event: TrackingEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          url: details.url,
          domain: domain,
          trackerType: TrackerDatabase.getTrackerType(trackerInfo.category),
          riskLevel: trackerInfo.riskLevel,
          description: trackerInfo.description || `${trackerInfo.name} detected`
        };

        // Store the event
        await StorageManager.addTrackingEvent(event);

        console.log('[Network Monitor] Tracker detected:', {
          domain,
          type: trackerInfo.category,
          risk: trackerInfo.riskLevel
        });

        // Notify content script if needed
        if (details.tabId > 0) {
          chrome.tabs.sendMessage(details.tabId, {
            type: 'TRACKER_DETECTED',
            event
          }).catch(() => {
            // Ignore errors if content script not ready
          });
        }
      }
    } catch (error) {
      console.error('[Network Monitor] Request handling failed:', error);
    }
  }
}
