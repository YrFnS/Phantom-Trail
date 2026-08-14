import type { TrackingEvent } from '../../lib/types';
import {
  createContentAttribution,
  parseHttpUrl,
} from '../../lib/event-attribution.mts';
import { isDuplicateEvent } from './event-detection';

const recentDetections = new Map<string, number>();
const DETECTION_THROTTLE_MS = 3000;

function isContextValid(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.id !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * Observe attributed third-party DOM resources from the isolated extension
 * world. No page-world detector payload is trusted or persisted.
 */
export function setupDOMMonitoring(): void {
  if (!isContextValid()) {
    console.log(
      '[Phantom Trail] Skipping DOM signal setup, extension context invalid'
    );
    return;
  }

  const observer = new window.MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== window.Node.ELEMENT_NODE) return;

        const element = node as HTMLElement;
        if (element.tagName === 'SCRIPT' || element.tagName === 'IFRAME') {
          void checkForPossibleSignal(element);
        }
      });
    });
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

async function checkForPossibleSignal(element: HTMLElement): Promise<void> {
  try {
    if (!isContextValid()) return;

    const source = element.getAttribute('src') || '';
    const absoluteSource = parseHttpUrl(
      source ? new URL(source, window.location.href).href : undefined
    );
    if (!absoluteSource) return;

    const context = createContentAttribution({
      source: 'dom-resource',
      pageUrl: window.location.href,
      resourceUrl: absoluteSource.href,
    });

    // A broad URL-token rule is retained only for attributed third-party
    // resources. First-party assets with "analytics" in their path are ignored.
    if (context.party !== 'third-party') return;

    const detectionKey = `${element.tagName}:${absoluteSource.href}`;
    const lastDetection = recentDetections.get(detectionKey);
    if (lastDetection && Date.now() - lastDetection < DETECTION_THROTTLE_MS) {
      return;
    }

    if (!absoluteSource.href.toLowerCase().includes('analytics')) return;

    const now = Date.now();
    const event: TrackingEvent = {
      schemaVersion: 2,
      id: `dom-${now}`,
      timestamp: now,
      url: absoluteSource.href,
      domain: absoluteSource.hostname.toLowerCase(),
      trackerType: 'analytics',
      riskLevel: 'low',
      description:
        'A third-party script or iframe URL contained the token “analytics”; this low-confidence token rule can produce false positives',
      context,
      detector: {
        id: 'dom-resource-analytics-token',
        matchType: 'dom-url-token',
        confidence: 'low',
        rule: 'analytics-token',
        evidence: [
          `Element type: ${element.tagName.toLowerCase()}`,
          `Resource URL: ${absoluteSource.href}`,
        ],
      },
      occurrences: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    };

    if (!isDuplicateEvent(event)) {
      await sendTrackingEvent(event);
      recentDetections.set(detectionKey, now);
    }
  } catch (error) {
    console.warn('[Phantom Trail] DOM signal check failed:', error);
  }
}

async function sendTrackingEvent(event: TrackingEvent): Promise<void> {
  try {
    if (!isContextValid()) return;

    await Promise.race([
      chrome.runtime.sendMessage({
        type: 'TRACKING_DETECTED',
        event,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message timeout')), 3000)
      ),
    ]);
  } catch (error) {
    const message = String(error);
    if (
      message.includes('Extension context invalidated') ||
      message.includes('Could not establish connection') ||
      message.includes('Message timeout')
    ) {
      console.log(
        '[Phantom Trail] Detector signal was not sent because the extension context or message channel was unavailable'
      );
      return;
    }

    console.warn('[Phantom Trail] Failed to send detector signal:', error);
  }
}
