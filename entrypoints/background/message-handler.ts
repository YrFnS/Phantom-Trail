import type { TrackingEvent } from '../../lib/types';

export class MessageHandler {
  static initialize(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      void this.handleMessage(message, sender, sendResponse);
      return true;
    });
    console.log('[Phantom Trail] Message handler initialized');
  }

  private static async handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        typeof (message as { type?: unknown }).type !== 'string'
      ) {
        sendResponse({ error: 'Invalid message format' });
        return;
      }

      const parsedMessage = message as {
        type: string;
        [key: string]: unknown;
      };

      switch (parsedMessage.type) {
        case 'TRACKING_DETECTED':
          await this.handleTrackingDetected(
            parsedMessage as { event?: TrackingEvent },
            sender,
            sendResponse
          );
          return;
        case 'GET_PRIVACY_SCORE':
          await this.handleGetPrivacyScore(
            parsedMessage as { domain?: string },
            sendResponse
          );
          return;
        case 'QUICK_ANALYSIS_REQUEST':
          await this.handleQuickAnalysis(sender, sendResponse);
          return;
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
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      if (!message.event) {
        sendResponse({ error: 'Missing event data' });
        return;
      }

      const { EventsStorage } =
        await import('../../lib/storage/events-storage');
      await EventsStorage.addEvent(message.event);

      if (sender.tab?.id !== undefined) {
        await this.updateBadgeForTab(sender.tab.id, message.event);
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error('[Message Handler] Failed to store detector signal:', error);
      sendResponse({ error: 'Failed to store detector signal' });
    }
  }

  private static async updateBadgeForTab(
    tabId: number,
    event: TrackingEvent
  ): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) return;

      const pageDomain = new URL(tab.url).hostname;
      const { EventsStorage } =
        await import('../../lib/storage/events-storage');
      const events = await EventsStorage.getRecentEvents(1000);
      const domainEvents = events.filter(candidate =>
        this.matchesPageDomain(candidate, pageDomain)
      );

      const { calculatePrivacyScore } = await import('../../lib/privacy-score');
      const score = calculatePrivacyScore(
        domainEvents,
        tab.url.startsWith('https://')
      );

      const { BadgeManager } = await import('../../lib/badge-manager');
      await BadgeManager.updateBadge(tabId, score);
    } catch (error) {
      console.error(
        '[Message Handler] Failed to update experimental badge:',
        error,
        event.id
      );
    }
  }

  private static async handleGetPrivacyScore(
    message: { domain?: string },
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    try {
      const domain = message.domain?.trim();
      if (!domain) {
        sendResponse({ error: 'Missing domain' });
        return;
      }

      const { PrivacyScoreClass } = await import('../../lib/privacy-score');
      const score = await PrivacyScoreClass.calculateDomainScore(domain);
      sendResponse({ success: true, score });
    } catch (error) {
      console.error('[Message Handler] Domain heuristic failed:', error);
      sendResponse({ error: 'Failed to calculate domain heuristic' });
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

      const tab = await chrome.tabs.get(sender.tab.id);
      if (!tab.url) {
        sendResponse({ error: 'No tab URL' });
        return;
      }

      const domain = new URL(tab.url).hostname;
      const { PrivacyScoreClass } = await import('../../lib/privacy-score');
      const { EventsStorage } =
        await import('../../lib/storage/events-storage');

      const score = await PrivacyScoreClass.calculateDomainScore(domain);
      const events = await EventsStorage.getTrackingEvents();
      const domainEvents = events.filter(event =>
        this.matchesPageDomain(event, domain)
      );

      const analysisData = {
        domain,
        score,
        eventCount: domainEvents.length,
        disclaimer:
          'Experimental local heuristic based on recorded detector signals; not a website audit.',
      };

      await chrome.tabs
        .sendMessage(sender.tab.id, {
          type: 'SHOW_QUICK_ANALYSIS',
          data: analysisData,
        })
        .catch(() => {
          // The page may not have a content script ready; the response remains useful.
        });

      sendResponse({ success: true, data: analysisData });
    } catch (error) {
      console.error('[Message Handler] Quick heuristic failed:', error);
      sendResponse({ error: 'Quick heuristic failed' });
    }
  }

  private static matchesPageDomain(
    event: TrackingEvent,
    pageDomain: string
  ): boolean {
    try {
      return new URL(event.url).hostname === pageDomain;
    } catch {
      return event.domain === pageDomain;
    }
  }
}
