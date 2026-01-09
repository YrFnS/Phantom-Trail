import { defineBackground } from 'wxt/utils/define-background';
import { TrackerDatabase } from '../lib/tracker-db';
import { StorageManager } from '../lib/storage-manager';
import type { TrackingEvent } from '../lib/types';

export default defineBackground({
  main() {
    console.log('Phantom Trail background script loaded');

    // Initialize tracker detection on web requests
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        // Process request asynchronously without blocking
        (async () => {
          try {
            // Skip non-HTTP requests and extension requests
            if (!details.url.startsWith('http') || details.url.includes('chrome-extension://')) {
              return;
            }

            // Classify the URL as a potential tracker
            const trackerInfo = TrackerDatabase.classifyUrl(details.url);
            
            if (trackerInfo) {
              // Create tracking event
              const event: TrackingEvent = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                url: details.url,
                domain: trackerInfo.domain,
                trackerType: TrackerDatabase.getTrackerType(trackerInfo.category),
                riskLevel: trackerInfo.riskLevel,
                description: trackerInfo.description
              };

              // Store the event
              await StorageManager.addEvent(event);
              
              console.log('Tracker detected:', trackerInfo.name, 'on', event.domain);
            }
          } catch (error) {
            console.error('Failed to process request:', error);
          }
        })();
      },
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    // Handle extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Phantom Trail extension installed');
    });
  }
});
