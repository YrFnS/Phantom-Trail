import { EventsStorage } from '../../lib/storage/events-storage';
import { TrackerDatabase } from '../../lib/tracker-db';
import type { TrackingEvent } from '../../lib/types';

export class NetworkMonitor {
  private static isInitialized = false;
  private static readonly OBSERVABLE_PROTOCOLS = new Set(['http:', 'https:']);

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

  private static handleRequest(
    details: chrome.webRequest.WebRequestBodyDetails
  ): void {
    this.processRequest(details).catch(error => {
      console.error('[Network Monitor] Request processing failed:', error);
    });
  }

  private static async processRequest(
    details: chrome.webRequest.WebRequestBodyDetails
  ): Promise<void> {
    try {
      if (!details.url || details.tabId === -1) return;

      const url = new URL(details.url);
      if (!this.OBSERVABLE_PROTOCOLS.has(url.protocol) || !url.hostname) {
        return;
      }

      const trackerInfo = TrackerDatabase.classifyUrl(details.url);
      if (!trackerInfo) return;

      const domain = url.hostname.toLowerCase();
      const categoryLabel = trackerInfo.category.toLowerCase();
      const event: TrackingEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
        url: details.url,
        domain,
        trackerType: TrackerDatabase.getTrackerType(trackerInfo.category),
        riskLevel: trackerInfo.riskLevel,
        description: `The requested URL or hostname matched a prototype ${categoryLabel} rule; this classification can be wrong and does not prove tracking intent, data collection, sharing, or sale`,
      };

      await EventsStorage.addEvent(event);

      console.log('[Network Monitor] Detector rule matched:', {
        domain,
        category: trackerInfo.category,
        riskLabel: trackerInfo.riskLevel,
      });

      if (details.tabId >= 0) {
        chrome.tabs
          .sendMessage(details.tabId, {
            type: 'TRACKER_DETECTED',
            event,
          })
          .catch(() => {
            // The page may not have a content script or may still be loading.
          });
      }
    } catch (error) {
      console.error('[Network Monitor] Request handling failed:', error);
    }
  }
}
