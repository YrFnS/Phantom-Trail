import { defineBackground } from 'wxt/utils/define-background';
import { TrackerDatabase } from '../lib/tracker-db';
import { StorageManager } from '../lib/storage-manager';
import { AIEngine } from '../lib/ai-engine';
import type { TrackingEvent } from '../lib/types';

export default defineBackground({
  main() {
    console.log('Phantom Trail background script loaded');

    // Track significant events for AI analysis
    let significantEventCount = 0;
    let lastAIAnalysis = 0;

    // Initialize tracker detection on web requests
    chrome.webRequest.onBeforeRequest.addListener(
      details => {
        // Process request asynchronously without blocking
        (async () => {
          try {
            // Skip non-HTTP requests and extension requests
            if (
              !details.url.startsWith('http') ||
              details.url.includes('chrome-extension://')
            ) {
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
                trackerType: TrackerDatabase.getTrackerType(
                  trackerInfo.category
                ),
                riskLevel: trackerInfo.riskLevel,
                description: trackerInfo.description,
              };

              // Store the event
              await StorageManager.addEvent(event);

              // Trigger AI analysis for significant events
              await triggerAIAnalysisIfNeeded(event);

              console.log(
                'Tracker detected:',
                trackerInfo.name,
                'on',
                event.domain
              );
            }
          } catch (error) {
            console.error('Failed to process request:', error);
          }
        })();
      },
      { urls: ['<all_urls>'] },
      ['requestBody']
    );

    /**
     * Trigger AI analysis for significant tracking events
     */
    async function triggerAIAnalysisIfNeeded(event: TrackingEvent): Promise<void> {
      try {
        const now = Date.now();
        
        // Count significant events (medium+ risk or new domains)
        if (event.riskLevel === 'medium' || event.riskLevel === 'high' || event.riskLevel === 'critical') {
          significantEventCount++;
        }

        // Trigger AI analysis if:
        // 1. 5+ significant events since last analysis, OR
        // 2. 30+ seconds since last analysis and we have events
        const shouldAnalyze = 
          significantEventCount >= 5 || 
          (now - lastAIAnalysis > 30000 && significantEventCount > 0);

        if (shouldAnalyze) {
          const recentEvents = await StorageManager.getRecentEvents(10);
          await AIEngine.generateNarrative(recentEvents);
          
          // Reset counters
          significantEventCount = 0;
          lastAIAnalysis = now;
        }
      } catch (error) {
        console.error('Failed to trigger AI analysis:', error);
      }
    }

    // Handle extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Phantom Trail extension installed');
    });
  },
});
