import { EventsStorage } from '../../lib/storage/events-storage';
import { TrackerDatabase } from '../../lib/tracker-db';
import { resolveNetworkAttribution } from '../../lib/event-attribution.mts';
import { shouldStoreNetworkMatch } from '../../lib/network-match-policy.mts';
import type { TrackingEvent } from '../../lib/types';

interface AttributableRequestDetails
  extends chrome.webRequest.WebRequestBodyDetails {
  documentUrl?: string;
  initiator?: string;
}

export class NetworkMonitor {
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) return;

    chrome.webRequest.onBeforeRequest.addListener(
      details => {
        void this.processRequest(details as AttributableRequestDetails);
      },
      { urls: ['http://*/*', 'https://*/*'] }
    );

    this.isInitialized = true;
    console.log('[Phantom Trail] Network monitoring initialized');
  }

  private static async processRequest(
    details: AttributableRequestDetails
  ): Promise<void> {
    try {
      if (!details.url || details.tabId < 0) return;

      const match = TrackerDatabase.matchUrl(details.url);
      if (!match) return;

      const tabUrl = await this.getTabUrl(details);
      const context = resolveNetworkAttribution({
        requestUrl: details.url,
        requestType: details.type,
        requestMethod: details.method,
        initiator: details.initiator,
        documentUrl: details.documentUrl,
        tabUrl,
        tabId: details.tabId,
        frameId: details.frameId,
        parentFrameId: details.parentFrameId,
        requestId: details.requestId,
      });

      if (!shouldStoreNetworkMatch(context, match.confidence)) return;

      const resourceDomain = context.resourceDomain;
      if (!resourceDomain) return;

      const partyLabel =
        context.party === 'third-party' ? 'Third-party' : 'Unattributed';
      const now = Date.now();
      const event: TrackingEvent = {
        schemaVersion: 2,
        id: `${details.requestId}-${now}`,
        timestamp: now,
        url: context.resourceUrl || details.url,
        domain: resourceDomain,
        trackerType: TrackerDatabase.getTrackerType(match.tracker.category),
        riskLevel: match.tracker.riskLevel,
        description: `${partyLabel} ${details.type} resource ${resourceDomain} matched the ${match.matchType} rule “${match.rule}” with ${match.confidence} detector confidence; this evidence does not establish tracking intent, collection, retention, sharing, or sale`,
        context,
        detector: {
          id: match.detectorId,
          matchType: match.matchType,
          confidence: match.confidence,
          rule: match.rule,
          evidence: match.evidence,
        },
        occurrences: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      };

      const stored = await EventsStorage.addEvent(event);
      if (!stored) return;

      console.log('[Network Monitor] Attributed detector rule match:', {
        pageDomain: context.pageDomain || 'unknown',
        resourceDomain,
        party: context.party,
        partyBasis: context.partyBasis,
        attributionBasis: context.attributionBasis,
        detector: match.detectorId,
        confidence: match.confidence,
      });

      chrome.tabs
        .sendMessage(details.tabId, {
          type: 'TRACKER_DETECTED',
          event,
        })
        .catch(() => {
          // The page may not have a content script or may still be loading.
        });
    } catch (error) {
      console.error('[Network Monitor] Request handling failed:', error);
    }
  }

  private static async getTabUrl(
    details: AttributableRequestDetails
  ): Promise<string | undefined> {
    if (
      details.type === 'main_frame' ||
      details.documentUrl ||
      (details.initiator && details.initiator !== 'null')
    ) {
      return undefined;
    }

    try {
      return (await chrome.tabs.get(details.tabId)).url;
    } catch {
      return undefined;
    }
  }
}
