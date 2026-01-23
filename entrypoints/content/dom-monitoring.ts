import type {
  TrackingEvent,
  TrackerType,
  InPageTrackingMethod,
} from '../../lib/types';
import { isDuplicateEvent } from './event-detection';

const recentDetections = new Map<string, number>();
const DETECTION_THROTTLE_MS = 3000;

/**
 * Check if extension context is still valid
 */
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

export function setupDOMMonitoring(): void {
  // Skip setup if context is invalid
  if (!isContextValid()) {
    console.log(
      '[Phantom Trail] Skipping DOM monitoring setup, context invalid'
    );
    return;
  }

  // Monitor DOM mutations for tracking scripts
  const observer = new window.MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === window.Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.tagName === 'SCRIPT' || element.tagName === 'IFRAME') {
            checkForTracking(element);
          }
        }
      });
    });
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });

  // Monitor form interactions
  document.addEventListener('input', handleFormInput, true);
  document.addEventListener('submit', handleFormSubmit, true);

  // Listen for main world detection events
  window.addEventListener('phantom-trail-detection', handleMainWorldDetection);
}

async function checkForTracking(element: HTMLElement): Promise<void> {
  try {
    // Skip if context is invalid
    if (!isContextValid()) {
      console.log('[Phantom Trail] Skipping detection, context invalid');
      return;
    }

    const currentDomain = window.location.hostname;

    if (currentDomain.includes('trusted')) {
      return;
    }

    const detectionKey = `${element.tagName}-${Date.now()}`;
    const lastDetection = recentDetections.get(detectionKey);

    if (lastDetection && Date.now() - lastDetection < DETECTION_THROTTLE_MS) {
      return;
    }

    // Simplified tracking detection
    const hasTracking =
      element.getAttribute('src')?.includes('analytics') || false;

    if (hasTracking) {
      const event: TrackingEvent = {
        id: `dom-${Date.now()}`,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        trackerType: 'analytics',
        riskLevel: 'medium',
        description: 'DOM tracking detected',
      };

      await sendTrackingEvent(event);
    }

    recentDetections.set(detectionKey, Date.now());
  } catch (error) {
    console.warn('[Phantom Trail] DOM monitoring error:', error);
  }
}

/**
 * Handle detection events from main world script
 */
function handleMainWorldDetection(event: Event): void {
  try {
    // Skip if context is invalid
    if (!isContextValid()) {
      console.log('[Phantom Trail] Skipping detection, context invalid');
      return;
    }

    const customEvent = event as CustomEvent;
    const data = customEvent.detail;

    if (!data || !data.type) {
      return;
    }

    const trackingEvent: TrackingEvent = {
      id: `${data.type}-${Date.now()}`,
      timestamp: data.timestamp || Date.now(),
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
          (
            data as {
              count?: number;
              operations?: unknown[];
              eventCount?: number;
            }
          ).count ||
          (
            data as {
              count?: number;
              operations?: unknown[];
              eventCount?: number;
            }
          ).operations?.length ||
          (
            data as {
              count?: number;
              operations?: unknown[];
              eventCount?: number;
            }
          ).eventCount ||
          1,
      },
    };

    if (!isDuplicateEvent(trackingEvent)) {
      sendTrackingEvent(trackingEvent).catch(error => {
        console.warn(
          '[Phantom Trail] Failed to send main world detection:',
          error
        );
      });
    }
  } catch (error) {
    console.warn('[Phantom Trail] Main world detection error:', error);
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
  return typeMap[type] || 'analytics';
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
    'canvas-fingerprint': `Canvas fingerprinting detected (${(data as { operations?: unknown[] })?.operations?.length || 0} operations)`,
    'storage-access': `Storage access tracking (${(data as { uniqueOperations?: number })?.uniqueOperations || 0} unique operations)`,
    'mouse-tracking': `Mouse movement tracking (${(data as { eventCount?: number })?.eventCount || 0} events)`,
    'form-monitoring': `Form field monitoring (${(data as { fields?: unknown[] })?.fields?.length || 0} fields)`,
    'device-api': `Device fingerprinting (${(data as { apiCalls?: unknown[] })?.apiCalls?.length || 0} API calls)`,
    'webrtc-leak': 'WebRTC connection detected - potential IP leak',
    'font-fingerprint': `Font fingerprinting (${(data as { count?: number })?.count || 0} fonts tested)`,
    'audio-fingerprint': `Audio fingerprinting (${(data as { operations?: unknown[] })?.operations?.length || 0} operations)`,
    'webgl-fingerprint': `WebGL fingerprinting (${(data as { parameters?: unknown[] })?.parameters?.length || 0} parameters)`,
    'battery-api': 'Battery API accessed for fingerprinting',
    'sensor-api': `Sensor API accessed (${(data as { sensor?: string })?.sensor || 'unknown'})`,
  };
  return descriptions[type] || `${type} tracking detected`;
}

function handleFormInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.type === 'password' || target.type === 'email') {
    detectSensitiveDataTracking(target).catch(error => {
      console.warn('[Phantom Trail] Sensitive data tracking failed:', error);
    });
  }
}

function handleFormSubmit(): void {
  detectFormTracking().catch(error => {
    console.warn('[Phantom Trail] Form tracking failed:', error);
  });
}

async function detectSensitiveDataTracking(
  input: HTMLInputElement
): Promise<void> {
  const isSensitive = input.type === 'password' || input.type === 'email';

  if (isSensitive) {
    const event: TrackingEvent = {
      id: `sensitive-${Date.now()}`,
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname,
      trackerType: 'analytics',
      riskLevel: 'high',
      description: `Sensitive ${input.type} field monitoring detected`,
    };

    if (!isDuplicateEvent(event)) {
      await sendTrackingEvent(event);
    }
  }
}

async function detectFormTracking(): Promise<void> {
  const event: TrackingEvent = {
    id: `form-${Date.now()}`,
    timestamp: Date.now(),
    url: window.location.href,
    domain: window.location.hostname,
    trackerType: 'analytics',
    riskLevel: 'medium',
    description: 'Form submission tracking detected',
  };

  if (!isDuplicateEvent(event)) {
    await sendTrackingEvent(event);
  }
}

async function sendTrackingEvent(event: TrackingEvent): Promise<void> {
  try {
    // Check context before sending
    if (!isContextValid()) {
      console.log('[Phantom Trail] Skipping event send, context invalid');
      return;
    }

    // Send to background script with timeout
    const message = {
      type: 'TRACKING_DETECTED',
      event,
    };

    // Use a promise race to implement timeout
    await Promise.race([
      chrome.runtime.sendMessage(message),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message timeout')), 3000)
      ),
    ]);
  } catch (error) {
    // Don't log context invalidation errors as warnings - they're expected
    const errorMessage = String(error);
    if (
      errorMessage.includes('Extension context invalidated') ||
      errorMessage.includes('Could not establish connection') ||
      errorMessage.includes('Message timeout')
    ) {
      console.log(
        '[Phantom Trail] Context lost, event will be retried by messaging system'
      );
    } else {
      console.warn('[Phantom Trail] Failed to send tracking event:', error);
    }
  }
}
