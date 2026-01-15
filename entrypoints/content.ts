/* eslint-disable no-undef */
import { ContentMessaging } from '../lib/content-messaging';
import { InPageDetector } from '../lib/in-page-detector';
import type { TrackingEvent } from '../lib/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',

  async main(ctx) {
    console.log('[Phantom Trail] Content script loaded');

    const recentDetections = new Map<string, number>();
    const DETECTION_THROTTLE_MS = 3000;

    async function processDetection(event: CustomEvent) {
      try {
        const { type, timestamp, operations } = event.detail;

        // Throttle detections
        const lastSeen = recentDetections.get(type) || 0;
        if (timestamp - lastSeen < DETECTION_THROTTLE_MS) {
          return;
        }

        recentDetections.set(type, timestamp);

        let detectionResult;

        // Analyze canvas fingerprinting
        if (type === 'canvas-fingerprint') {
          detectionResult = InPageDetector.analyzeCanvasFingerprint(
            operations || []
          );
        } else if (type === 'storage-access') {
          detectionResult = InPageDetector.analyzeStorageAccess(
            operations || []
          );
        } else if (type === 'mouse-tracking') {
          detectionResult = InPageDetector.analyzeMouseTracking(
            event.detail.eventCount || 0,
            event.detail.duration || 1
          );
        } else if (type === 'form-monitoring') {
          detectionResult = InPageDetector.analyzeFormMonitoring(
            event.detail.fields || []
          );
        }

        if (!detectionResult || !detectionResult.detected) {
          return;
        }

        // Create tracking event
        const trackingEvent: TrackingEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          url: window.location.href,
          domain: window.location.hostname,
          trackerType: 'fingerprinting',
          riskLevel: detectionResult.riskLevel,
          description: detectionResult.description,
          inPageTracking: {
            method: detectionResult.method,
            details: detectionResult.details,
            apiCalls: detectionResult.apiCalls,
            frequency: detectionResult.frequency,
          },
        };

        // Send to background
        const response =
          await ContentMessaging.sendTrackingEvent(trackingEvent);

        if (response.success) {
          console.log(
            `[Phantom Trail] ${detectionResult.method} reported`
          );
        } else {
          console.error('[Phantom Trail] Failed to report:', response.error);
        }
      } catch (error) {
        console.error('[Phantom Trail] Failed to process detection:', error);
      }
    }

    try {
      // Inject main world script
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content-main-world.js');
      script.onload = () => {
        console.log('[Phantom Trail] Canvas detector injected');
        script.remove();
      };

      (document.head || document.documentElement).appendChild(script);

      // Listen for detection events from main world
      window.addEventListener('phantom-trail-detection', event => {
        processDetection(event as CustomEvent);
      });
    } catch (error) {
      console.error('[Phantom Trail] Failed to inject detector:', error);
    }

    ctx.onInvalidated(() => {
      console.log('[Phantom Trail] Content script invalidated');
      recentDetections.clear();
    });
  },
});
