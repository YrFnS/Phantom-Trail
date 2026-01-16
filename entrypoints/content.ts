/* eslint-disable no-undef */
import { ContentMessaging } from '../lib/content-messaging';
import { InPageDetector } from '../lib/in-page-detector';
import { isSiteTrusted } from '../lib/trusted-sites';
import { SecurityContextDetector } from '../lib/context-detector';
import type { TrackingEvent } from '../lib/types';

// Event deduplication
const recentEventSignatures = new Map<string, number>();
const SIGNATURE_TTL = 10000; // 10 seconds

function getEventSignature(event: TrackingEvent): string {
  return `${event.domain}-${event.trackerType}-${event.riskLevel}`;
}

function isDuplicateEvent(event: TrackingEvent): boolean {
  const signature = getEventSignature(event);
  const lastSeen = recentEventSignatures.get(signature);

  if (lastSeen && Date.now() - lastSeen < SIGNATURE_TTL) {
    return true;
  }

  recentEventSignatures.set(signature, Date.now());
  return false;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',

  async main(ctx) {
    console.log('[Phantom Trail] Content script loaded');

    const recentDetections = new Map<string, number>();
    // Throttle detections to 3 seconds to balance between:
    // - Reducing duplicate events (performance)
    // - Capturing legitimate repeated tracking (accuracy)
    const DETECTION_THROTTLE_MS = 3000;

    // Clean up expired signatures every 30 seconds
    const signatureCleanupInterval = setInterval(() => {
      const cutoff = Date.now() - SIGNATURE_TTL;
      for (const [sig, time] of recentEventSignatures.entries()) {
        if (time < cutoff) {
          recentEventSignatures.delete(sig);
        }
      }
    }, 30000);

    // Enhanced context monitoring with recovery
    let contextValid = true;
    let recoveryAttempts = 0;
    let isRecovering = false;
    const MAX_RECOVERY_ATTEMPTS = 3;
    
    const contextCheckInterval = setInterval(() => {
      try {
        const wasValid = contextValid;
        contextValid = chrome.runtime?.id !== undefined;

        if (wasValid && !contextValid && !isRecovering) {
          console.warn('[Phantom Trail] Context invalidated, attempting recovery');
          
          // Attempt recovery with exponential backoff
          const attemptRecovery = (attempt: number) => {
            if (attempt > MAX_RECOVERY_ATTEMPTS) {
              console.error('[Phantom Trail] Max recovery attempts reached, stopping');
              clearInterval(contextCheckInterval);
              isRecovering = false;
              return;
            }

            isRecovering = true;
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            setTimeout(() => {
              try {
                if (chrome.runtime?.id !== undefined) {
                  contextValid = true;
                  recoveryAttempts = 0;
                  isRecovering = false;
                  console.log(`[Phantom Trail] Context recovered after ${attempt + 1} attempts`);
                } else {
                  isRecovering = false;
                  attemptRecovery(attempt + 1);
                }
              } catch {
                isRecovering = false;
                attemptRecovery(attempt + 1);
              }
            }, delay);
          };

          attemptRecovery(recoveryAttempts);
          recoveryAttempts++;
        }
      } catch {
        contextValid = false;
        if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
          clearInterval(contextCheckInterval);
        }
      }
    }, 2000);

    // Clean up on unload
    window.addEventListener('unload', () => {
      clearInterval(contextCheckInterval);
      clearInterval(signatureCleanupInterval);
    });

    async function processDetection(event: CustomEvent) {
      // Check context validity
      if (!contextValid) {
        console.warn('[Phantom Trail] Skipping detection, context invalid');
        return;
      }

      try {
        const { type, timestamp, operations } = event.detail;

        // Throttle detections
        const lastSeen = recentDetections.get(type) || 0;
        if (timestamp - lastSeen < DETECTION_THROTTLE_MS) {
          return;
        }

        recentDetections.set(type, timestamp);

        let detectionResult;

        // Analyze detection types
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
        } else if (type === 'device-api') {
          detectionResult = InPageDetector.analyzeDeviceAPI(
            event.detail.apiCalls || []
          );
        } else if (type === 'webrtc-leak') {
          detectionResult = InPageDetector.analyzeWebRTC();
        } else if (type === 'font-fingerprint') {
          detectionResult = InPageDetector.analyzeFontFingerprint(
            event.detail.fonts || [],
            event.detail.count || 0
          );
        } else if (type === 'audio-fingerprint') {
          detectionResult = InPageDetector.analyzeAudioFingerprint(
            event.detail.operations || []
          );
        } else if (type === 'webgl-fingerprint') {
          detectionResult = InPageDetector.analyzeWebGLFingerprint(
            event.detail.parameters || []
          );
        } else if (type === 'battery-api') {
          detectionResult = InPageDetector.analyzeBatteryAPI();
        } else if (type === 'sensor-api') {
          detectionResult = InPageDetector.analyzeSensorAPI(
            event.detail.sensor || 'unknown'
          );
        }

        if (!detectionResult || !detectionResult.detected) {
          return;
        }

        // Detect security context
        const currentDomain = window.location.hostname;
        const context = SecurityContextDetector.detectContext(
          window.location.href,
          { 
            hasPasswordField: document.querySelector('input[type="password"]') !== null 
          }
        );

        // Check if this is a trusted site (hybrid check: default + user + context)
        const trustCheck = await isSiteTrusted(
          currentDomain,
          detectionResult.method,
          context
        );

        // Skip reporting if trusted
        if (trustCheck.trusted) {
          console.log(
            `[Phantom Trail] Skipping ${detectionResult.method} on trusted site: ${currentDomain}`,
            `Source: ${trustCheck.source}, Reason: ${trustCheck.reason}`
          );
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

        // Check for duplicate BEFORE sending
        if (isDuplicateEvent(trackingEvent)) {
          console.log(
            '[Phantom Trail] Skipping duplicate event:',
            getEventSignature(trackingEvent)
          );
          return;
        }

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
