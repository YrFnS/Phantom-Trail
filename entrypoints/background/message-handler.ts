import type { TrackingEvent } from '../../lib/types';
import {
  eventMatchesPageDomain,
  getDomainFromUrl,
  normalizeTrackingEvent,
} from '../../lib/event-attribution.mts';

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

      const event = this.enrichSenderAttribution(message.event, sender);
      const { EventsStorage } =
        await import('../../lib/storage/events-storage');
      const appended = await EventsStorage.addEvent(event);

      if (appended) {
        const operations: Promise<unknown>[] = [];
        if (sender.tab?.id !== undefined) {
          operations.push(this.updateBadgeForTab(sender.tab.id));
        }
        operations.push(
          import('../../lib/notification-manager').then(
            ({ NotificationManager }) =>
              NotificationManager.showEvidenceAlert(event)
          )
        );
        await Promise.allSettled(operations);
      }

      sendResponse({ success: true, appended });
    } catch (error) {
      console.error('[Message Handler] Failed to store detector signal:', error);
      sendResponse({ error: 'Failed to store detector signal' });
    }
  }

  private static enrichSenderAttribution(
    event: TrackingEvent,
    sender: chrome.runtime.MessageSender
  ): TrackingEvent {
    const normalized = normalizeTrackingEvent(event);
    const pageUrl = sender.tab?.url || normalized.context?.pageUrl || '';
    const pageDomain = getDomainFromUrl(pageUrl);

    if (!normalized.context) return normalized;

    return {
      ...normalized,
      context: {
        ...normalized.context,
        pageUrl: normalized.context.pageUrl || pageUrl,
        pageDomain: normalized.context.pageDomain || pageDomain,
        tabId: sender.tab?.id ?? normalized.context.tabId,
        frameId: sender.frameId ?? normalized.context.frameId,
        attributionBasis:
          normalized.context.attributionBasis === 'legacy' && pageDomain
            ? 'content-script'
            : normalized.context.attributionBasis,
        attributionConfidence:
          normalized.context.attributionBasis === 'legacy' && pageDomain
            ? 'high'
            : normalized.context.attributionConfidence,
      },
    };
  }

  private static async updateBadgeForTab(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      const pageDomain = getDomainFromUrl(tab.url);
      if (!tab.url || !pageDomain) return;

      const { EventsStorage } =
        await import('../../lib/storage/events-storage');
      const events = await EventsStorage.getRecentEvents(1000);
      const pageEvents = events.filter(candidate =>
        eventMatchesPageDomain(candidate, pageDomain)
      );

      const { calculatePrivacyScore } = await import('../../lib/privacy-score');
      const score = calculatePrivacyScore(pageEvents, true, {
        scope: 'page',
        pageDomain,
      });

      const { BadgeManager } = await import('../../lib/badge-manager');
      await BadgeManager.updateBadge(tabId, score);
    } catch (error) {
      console.error(
        '[Message Handler] Failed to update experimental badge:',
        error
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
      if (sender.tab?.id === undefined) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      const tab = await chrome.tabs.get(sender.tab.id);
      const domain = getDomainFromUrl(tab.url);
      if (!tab.url || !domain) {
        sendResponse({ error: 'No attributable HTTP(S) page' });
        return;
      }

      const { PrivacyScoreClass } = await import('../../lib/privacy-score');
      const { EventsStorage } =
        await import('../../lib/storage/events-storage');
      const score = await PrivacyScoreClass.calculateDomainScore(domain);
      const events = await EventsStorage.getTrackingEvents();
      const pageEvents = events.filter(event =>
        eventMatchesPageDomain(event, domain)
      );

      sendResponse({
        success: true,
        data: {
          domain,
          score,
          eventCount: pageEvents.length,
          occurrenceCount: pageEvents.reduce(
            (total, event) => total + Math.max(1, event.occurrences || 1),
            0
          ),
          disclaimer:
            'Experimental local evidence summary; not a website audit.',
        },
      });
    } catch (error) {
      console.error('[Message Handler] Quick evidence summary failed:', error);
      sendResponse({ error: 'Quick evidence summary failed' });
    }
  }
}
