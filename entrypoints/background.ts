import { defineBackground } from 'wxt/utils/define-background';
import { TrackerDatabase } from '../lib/tracker-db';
import { StorageManager } from '../lib/storage-manager';
import { AIEngine } from '../lib/ai-engine';
import { NotificationManager } from '../lib/notification-manager';
import { calculatePrivacyScore } from '../lib/privacy-score';
import { ContextDetector } from '../components/LiveNarrative/LiveNarrative.context';
import type { TrackingEvent } from '../lib/types';
import type {
  ContentMessage,
  BackgroundResponse,
} from '../lib/content-messaging';

export default defineBackground({
  main() {
    console.log('Phantom Trail background script loaded');

    // Track significant events for AI analysis
    let significantEventCount = 0;
    let lastAIAnalysis = 0;

    // Throttle tracking events to prevent overwhelming the UI
    const recentDomains = new Map<string, number>();
    const DOMAIN_THROTTLE_MS = 5000; // 5 seconds between same domain events

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
              const now = Date.now();
              const lastSeen = recentDomains.get(trackerInfo.domain) || 0;

              // Throttle events from the same domain
              if (now - lastSeen < DOMAIN_THROTTLE_MS) {
                return;
              }

              recentDomains.set(trackerInfo.domain, now);

              // Clean up old entries
              if (recentDomains.size > 100) {
                const cutoff = now - DOMAIN_THROTTLE_MS * 2;
                for (const [domain, timestamp] of recentDomains.entries()) {
                  if (timestamp < cutoff) {
                    recentDomains.delete(domain);
                  }
                }
              }

              // Create tracking event with context detection
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

              // Enhance risk assessment based on website context
              const context = ContextDetector.detectContext(event);
              const contextualRisk = ContextDetector.assessContextualRisk(
                event,
                context
              );

              // Update risk level if context indicates higher risk
              if (contextualRisk.finalRisk > 0.8) {
                event.riskLevel = 'critical';
              } else if (contextualRisk.finalRisk > 0.6) {
                event.riskLevel = 'high';
              } else if (contextualRisk.finalRisk > 0.4) {
                event.riskLevel = 'medium';
              }

              // Store the event
              await StorageManager.addEvent(event);

              // Show notification for critical/high-risk events
              if (event.riskLevel === 'critical' || event.riskLevel === 'high') {
                await NotificationManager.showPrivacyAlert(event);
              }

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
    async function triggerAIAnalysisIfNeeded(
      event: TrackingEvent
    ): Promise<void> {
      try {
        const now = Date.now();

        // Immediate analysis for critical/high-risk events
        const isHighRisk =
          event.riskLevel === 'critical' || event.riskLevel === 'high';
        const context = ContextDetector.detectContext(event);
        const isHighRiskContext = ContextDetector.isHighRiskContext(
          context,
          event.trackerType
        );

        if (isHighRisk || isHighRiskContext) {
          // Trigger immediate individual event analysis for high-risk events
          await AIEngine.generateEventAnalysis(event);
          console.log(
            'High-risk event analyzed immediately:',
            event.domain,
            event.trackerType
          );
        }

        // Count significant events (medium+ risk or new domains)
        if (
          event.riskLevel === 'medium' ||
          event.riskLevel === 'high' ||
          event.riskLevel === 'critical'
        ) {
          significantEventCount++;
        }

        // Trigger batch AI analysis if:
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
      
      // Set up daily cleanup alarm for 30-day data retention
      chrome.alarms.create('cleanup-old-events', {
        periodInMinutes: 1440, // Run daily (24 hours)
      });

      // Set up daily privacy summary alarm
      chrome.alarms.create('daily-privacy-summary', {
        periodInMinutes: 1440, // Run daily (24 hours)
        when: Date.now() + (24 * 60 * 60 * 1000) // Start tomorrow
      });
    });

    // Handle periodic cleanup of old events (30-day retention)
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'cleanup-old-events') {
        try {
          const removedCount = await StorageManager.cleanupOldEvents();
          if (removedCount > 0) {
            console.log(`[Phantom Trail] Cleaned up ${removedCount} events older than 30 days`);
          }
        } catch (error) {
          console.error('[Phantom Trail] Failed to cleanup old events:', error);
        }
      } else if (alarm.name === 'daily-privacy-summary') {
        try {
          // Generate daily privacy summary
          const events = await StorageManager.getRecentEvents(100);
          if (events.length > 0) {
            const score = calculatePrivacyScore(events);
            await NotificationManager.showDailySummary(score);
          }
        } catch (error) {
          console.error('[Phantom Trail] Failed to show daily summary:', error);
        }
      }
    });

    // Handle notification clicks
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      try {
        // Open extension popup when notification is clicked
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await chrome.action.openPopup();
        }
        
        // Clear the notification
        await chrome.notifications.clear(notificationId);
      } catch (error) {
        console.error('Failed to handle notification click:', error);
      }
    });

    // Handle notification button clicks
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      try {
        if (buttonIndex === 0) {
          // "View Details" button - open popup
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            await chrome.action.openPopup();
          }
        }
        
        // Clear the notification
        await chrome.notifications.clear(notificationId);
      } catch (error) {
        console.error('Failed to handle notification button click:', error);
      }
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener(
      (
        message: ContentMessage,
        _sender,
        sendResponse: (response: BackgroundResponse) => void
      ) => {
        if (message.type === 'ping') {
          sendResponse({ success: true });
          return false;
        }

        if (message.type === 'tracking-event' && message.payload) {
          (async () => {
            try {
              const event = message.payload;
              if (!event) {
                sendResponse({ success: false, error: 'Missing event payload' });
                return;
              }

              // Store the event
              await StorageManager.addEvent(event);

              // Show notification for high-risk events
              if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
                await NotificationManager.showPrivacyAlert(event);
              }

              // Trigger AI analysis for high-risk events
              if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
                await AIEngine.generateEventAnalysis(event);
              }

              console.log(
                'In-page tracking detected:',
                event.inPageTracking?.method || event.trackerType,
                'on',
                event.domain
              );

              sendResponse({ success: true });
            } catch (error) {
              console.error('Failed to handle tracking event:', error);
              sendResponse({ success: false, error: String(error) });
            }
          })();

          return true; // Keep channel open for async response
        }

        // Unknown message type
        sendResponse({ success: false, error: 'Invalid message type' });
        return false;
      }
    );
  },
});
