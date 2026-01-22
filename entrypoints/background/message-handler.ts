import type { TrackingEvent } from '../../lib/types';

export class MessageHandler {
  static initialize(): void {
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    console.log('[Phantom Trail] Message handler initialized');
  }

  private static async handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (typeof message !== 'object' || message === null || !('type' in message)) {
        sendResponse({ error: 'Invalid message format' });
        return;
      }

      const msg = message as { type: string; [key: string]: unknown };

      switch (msg.type) {
        case 'TRACKING_DETECTED':
          await this.handleTrackingDetected(msg as { event?: TrackingEvent }, sendResponse);
          break;
        case 'GET_PRIVACY_SCORE':
          await this.handleGetPrivacyScore(msg as { domain?: string }, sendResponse);
          break;
        case 'QUICK_ANALYSIS_REQUEST':
          await this.handleQuickAnalysis(sender, sendResponse);
          break;
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Message Handler] Error:', error);
      sendResponse({ error: 'Message handling failed' });
    }
  }

  private static async handleTrackingDetected(
    message: { event?: TrackingEvent },
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (!message.event) {
        sendResponse({ error: 'Missing event data' });
        return;
      }
      const { EventsStorage } = await import('../../lib/storage/events-storage');
      await EventsStorage.addEvent(message.event);
      sendResponse({ success: true });
    } catch {
      sendResponse({ error: 'Failed to store tracking event' });
    }
  }

  private static async handleGetPrivacyScore(
    message: { domain?: string },
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (!message.domain) {
        sendResponse({ error: 'Missing domain' });
        return;
      }
      const { PrivacyScoreClass } = await import('../../lib/privacy-score');
      const score = await PrivacyScoreClass.calculateDomainScore();
      sendResponse({ success: true, score });
    } catch {
      sendResponse({ error: 'Failed to calculate privacy score' });
    }
  }

  private static async handleQuickAnalysis(
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (!sender.tab?.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      // Get current tab info
      const tab = await chrome.tabs.get(sender.tab.id);
      if (!tab.url) {
        sendResponse({ error: 'No tab URL' });
        return;
      }

      const domain = new URL(tab.url).hostname;
      
      // Get privacy score and event count
      const { PrivacyScoreClass } = await import('../../lib/privacy-score');
      const { EventsStorage } = await import('../../lib/storage/events-storage');
      
      const score = await PrivacyScoreClass.calculateDomainScore();
      const events = await EventsStorage.getTrackingEvents();
      const domainEvents = events.filter((e: { domain: string }) => e.domain === domain);

      const analysisData = {
        domain,
        score,
        eventCount: domainEvents.length
      };

      // Send analysis to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SHOW_QUICK_ANALYSIS',
        data: analysisData
      });

      sendResponse({ success: true });
    } catch {
      sendResponse({ error: 'Quick analysis failed' });
    }
  }
}
