import type {
  TrackingEvent,
  TrackerType,
  InPageTrackingMethod,
} from '../../lib/types';
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
 * Observe DOM/API activity that can match prototype signal rules.
 * A matched rule is not proof that a page or third party collected data.
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

  // These handlers record that Phantom Trail observed the user's interaction.
  // They do not establish that the page itself monitored or transmitted it.
  document.addEventListener('input', handleFormInput, true);
  document.addEventListener('submit', handleFormSubmit, true);

  window.addEventListener('phantom-trail-detection', handleMainWorldDetection);
}

async function checkForPossibleSignal(element: HTMLElement): Promise<void> {
  try {
    if (!isContextValid()) return;

    const source = element.getAttribute('src') || '';
    const detectionKey = `${element.tagName}:${source}`;
    const lastDetection = recentDetections.get(detectionKey);

    if (lastDetection && Date.now() - lastDetection < DETECTION_THROTTLE_MS) {
      return;
    }

    if (source.toLowerCase().includes('analytics')) {
      const event: TrackingEvent = {
        id: `dom-${Date.now()}`,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        trackerType: 'analytics',
        riskLevel: 'medium',
        description:
          'A script or iframe URL contained the token “analytics”; this broad URL rule can produce false positives',
      };

      await sendTrackingEvent(event);
      recentDetections.set(detectionKey, Date.now());
    }
  } catch (error) {
    console.warn('[Phantom Trail] DOM signal check failed:', error);
  }
}

function handleMainWorldDetection(event: Event): void {
  try {
    if (!isContextValid()) return;

    const customEvent = event as CustomEvent;
    const data = customEvent.detail;
    if (!data || typeof data.type !== 'string') return;

    const trackingEvent: TrackingEvent = {
      id: `${data.type}-${Date.now()}`,
      timestamp:
        typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      url: window.location.href,
      domain: window.location.hostname,
      trackerType: mapDetectionType(data.type),
      riskLevel: getRiskLevel(data.type),
      description: getDescription(data.type, data),
      inPageTracking: {
        method: data.type as InPageTrackingMethod,
        details: JSON.stringify(data),
        apiCalls:
          (data as { operations?: string[]; apiCalls?: string[] }).operations ||
          (data as { operations?: string[]; apiCalls?: string[] }).apiCalls,
        frequency:
          (data as { count?: number }).count ||
          (data as { operations?: unknown[] }).operations?.length ||
          (data as { eventCount?: number }).eventCount ||
          1,
      },
    };

    if (!isDuplicateEvent(trackingEvent)) {
      void sendTrackingEvent(trackingEvent);
    }
  } catch (error) {
    console.warn('[Phantom Trail] Main-world signal handling failed:', error);
  }
}

function mapDetectionType(type: string): TrackerType {
  const typeMap: Record<string, TrackerType> = {
    'canvas-fingerprint': 'fingerprinting',
    'storage-access': 'analytics',
    'mouse-tracking': 'analytics',
    'form-monitoring': 'analytics',
    'device-api': 'fingerprinting',
    'webrtc-leak': 'fingerprinting',
    'font-fingerprint': 'fingerprinting',
    'audio-fingerprint': 'fingerprinting',
    'webgl-fingerprint': 'fingerprinting',
    'battery-api': 'fingerprinting',
    'sensor-api': 'fingerprinting',
  };
  return typeMap[type] || 'unknown';
}

function getRiskLevel(type: string): 'low' | 'medium' | 'high' | 'critical' {
  const riskMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'canvas-fingerprint': 'high',
    'storage-access': 'medium',
    'mouse-tracking': 'medium',
    'form-monitoring': 'high',
    'device-api': 'high',
    'webrtc-leak': 'critical',
    'font-fingerprint': 'high',
    'audio-fingerprint': 'high',
    'webgl-fingerprint': 'high',
    'battery-api': 'medium',
    'sensor-api': 'medium',
  };
  return riskMap[type] || 'medium';
}

function getDescription(type: string, data: unknown): string {
  const descriptions: Record<string, string> = {
    'canvas-fingerprint': `Canvas operations matched the prototype fingerprinting rule (${(data as { operations?: unknown[] })?.operations?.length || 0} operations); normal rendering can trigger this signal`,
    'storage-access': `Storage API activity crossed the prototype threshold (${(data as { uniqueOperations?: number })?.uniqueOperations || 0} unique operations); this does not establish tracking intent`,
    'mouse-tracking': `High-frequency mouse events were observed by Phantom Trail (${(data as { eventCount?: number })?.eventCount || 0} events); this does not show who used the events`,
    'form-monitoring': `Form-field input activity was observed by Phantom Trail (${(data as { fields?: unknown[] })?.fields?.length || 0} fields); this does not prove page or third-party monitoring`,
    'device-api': `Device-related API access matched a prototype rule (${(data as { apiCalls?: unknown[] })?.apiCalls?.length || 0} calls); purpose and recipient are unknown`,
    'webrtc-leak':
      'An RTCPeerConnection was created; WebRTC can expose connection metadata in some contexts, but creation alone does not prove an IP leak',
    'font-fingerprint': `Font-related measurements crossed the prototype threshold (${(data as { count?: number })?.count || 0} checks); normal layout work can trigger this signal`,
    'audio-fingerprint': `AudioContext operations matched the prototype fingerprinting rule (${(data as { operations?: unknown[] })?.operations?.length || 0} operations); normal audio use can trigger it`,
    'webgl-fingerprint': `WebGL parameter reads crossed the prototype threshold (${(data as { parameters?: unknown[] })?.parameters?.length || 0} reads); normal rendering can trigger this signal`,
    'battery-api':
      'The Battery API was called; the call alone does not establish fingerprinting or data transmission',
    'sensor-api': `A sensor event listener was registered (${(data as { sensor?: string })?.sensor || 'unknown'}); intent and data use are unknown`,
  };

  return (
    descriptions[type] ||
    `${type} instrumentation signal recorded; attribution and purpose are unverified`
  );
}

function handleFormInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.type === 'password' || target.type === 'email') {
    void recordSensitiveFieldInteraction(target.type);
  }
}

function handleFormSubmit(): void {
  void recordFormSubmitInteraction();
}

async function recordSensitiveFieldInteraction(
  inputType: string
): Promise<void> {
  const event: TrackingEvent = {
    id: `sensitive-${Date.now()}`,
    timestamp: Date.now(),
    url: window.location.href,
    domain: window.location.hostname,
    trackerType: 'analytics',
    riskLevel: 'high',
    description: `Phantom Trail observed user input in a ${inputType} field; this does not prove that the page or a third party monitored or transmitted the value`,
  };

  if (!isDuplicateEvent(event)) await sendTrackingEvent(event);
}

async function recordFormSubmitInteraction(): Promise<void> {
  const event: TrackingEvent = {
    id: `form-${Date.now()}`,
    timestamp: Date.now(),
    url: window.location.href,
    domain: window.location.hostname,
    trackerType: 'analytics',
    riskLevel: 'medium',
    description:
      'Phantom Trail observed a form submission event; this does not prove that submission data was retained, shared, or used for tracking',
  };

  if (!isDuplicateEvent(event)) await sendTrackingEvent(event);
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
