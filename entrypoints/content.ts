/* eslint-disable no-undef */
import { ContentMessaging } from '../lib/content-messaging';
import { InPageDetector } from '../lib/in-page-detector';
import { isSiteTrusted } from '../lib/trusted-sites';
import { SecurityContextDetector } from '../lib/context-detector';
import { KeyboardShortcuts, IN_PAGE_SHORTCUTS } from '../lib/keyboard-shortcuts';
import { PrivacyPredictor, type PrivacyPrediction, type PageContext } from '../lib/privacy-predictor';
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

    // Privacy prediction state
    let currentTooltip: HTMLElement | null = null;
    let hoverTimeout: number | null = null;
    const HOVER_DELAY = 500; // 500ms delay before showing prediction

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

      // Handle keyboard shortcuts
      document.addEventListener('keydown', (event) => {
        // Build shortcut string
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push(event.ctrlKey ? 'Ctrl' : 'Cmd');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        parts.push(event.key);
        
        const shortcut = parts.join('+');
        
        if (IN_PAGE_SHORTCUTS[shortcut]) {
          event.preventDefault();
          handleInPageShortcut(IN_PAGE_SHORTCUTS[shortcut]);
        }
      });

      // Handle messages from background script
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'TOGGLE_POPUP') {
          KeyboardShortcuts.showShortcutFeedback('Toggle Popup');
          sendResponse({ success: true });
        } else if (message.type === 'SHOW_QUICK_ANALYSIS') {
          showQuickAnalysis(message.data);
          sendResponse({ success: true });
        } else if (message.type === 'phantom_trail_discovery') {
          // Handle P2P peer discovery
          if (message.extensionId === chrome.runtime.id) {
            // Another Phantom Trail user found - respond with our peer ID
            const peerId = `peer_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
            chrome.runtime.sendMessage({
              type: 'phantom_trail_peer_found',
              peerId: peerId,
              extensionId: chrome.runtime.id
            }).catch(() => {
              // Ignore errors if background script is not ready
            });
            sendResponse({ type: 'peer_response', peerId });
          }
        }
      });

      // Initialize link hover predictions
      initializeLinkPredictions();
    } catch (error) {
      console.error('[Phantom Trail] Failed to inject detector:', error);
    }

    // Handle in-page shortcuts
    function handleInPageShortcut(action: string): void {
      switch (action) {
        case 'toggle-tracking-overlay':
          KeyboardShortcuts.showShortcutFeedback('Toggle Tracking Overlay');
          // Future: Show tracking overlay
          break;
        case 'show-site-analysis': {
          KeyboardShortcuts.showShortcutFeedback('Site Analysis');
          // Trigger quick analysis via background
          chrome.runtime.sendMessage({ type: 'QUICK_ANALYSIS_REQUEST' });
          break;
        }
        case 'toggle-blocking-mode':
          KeyboardShortcuts.showShortcutFeedback('Toggle Blocking Mode');
          // Future: Toggle blocking
          break;
        case 'close-overlays': {
          KeyboardShortcuts.showShortcutFeedback('Close Overlays');
          // Close any open overlays
          const overlays = document.querySelectorAll('.phantom-trail-overlay, .phantom-trail-shortcut-feedback');
          overlays.forEach(overlay => overlay.remove());
          break;
        }
      }
    }

    // Show quick analysis results
    function showQuickAnalysis(data: { domain: string; score: { score: number; grade: string; color: string }; eventCount: number }): void {
      const overlay = document.createElement('div');
      overlay.className = 'phantom-trail-overlay';
      overlay.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 10001;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 400px;
          width: 90%;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #1f2937; font-size: 18px;">🛡️ Privacy Analysis</h3>
            <button onclick="this.closest('.phantom-trail-overlay').remove()" style="
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #6b7280;
            ">×</button>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #374151;">Domain:</strong> ${data.domain}
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #374151;">Privacy Score:</strong> 
            <span style="color: ${data.score.color === 'green' ? '#10b981' : data.score.color === 'yellow' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
              ${data.score.score}/100 (${data.score.grade})
            </span>
          </div>
          <div style="margin-bottom: 16px;">
            <strong style="color: #374151;">Trackers:</strong> ${data.eventCount}
          </div>
          <div style="font-size: 12px; color: #6b7280; text-align: center;">
            Press Escape to close
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Auto-close after 5 seconds
      setTimeout(() => overlay.remove(), 5000);
    }

    // Initialize link hover predictions
    function initializeLinkPredictions(): void {
      // Add event listeners for link hover
      document.addEventListener('mouseover', handleLinkHover);
      document.addEventListener('mouseout', handleLinkMouseOut);
      document.addEventListener('click', handleLinkClick);
    }

    async function handleLinkHover(event: MouseEvent): Promise<void> {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link || !link.href) return;

      // Skip internal links and non-HTTP links
      if (link.href.startsWith('#') || 
          link.href.startsWith('mailto:') || 
          link.href.startsWith('tel:') ||
          !link.href.startsWith('http')) {
        return;
      }

      // Skip if same domain
      try {
        const linkUrl = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        if (linkUrl.hostname === currentUrl.hostname) return;
      } catch {
        return;
      }

      // Clear any existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      // Set timeout to show prediction after delay
      hoverTimeout = window.setTimeout(async () => {
        try {
          await showLinkPrediction(link, event);
        } catch (error) {
          console.error('[Phantom Trail] Failed to show link prediction:', error);
        }
      }, HOVER_DELAY);
    }

    function handleLinkMouseOut(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]');
      
      if (!link) return;

      // Clear hover timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }

      // Hide tooltip after a short delay
      setTimeout(() => {
        if (currentTooltip && !isMouseOverTooltip()) {
          hideTooltip();
        }
      }, 100);
    }

    function handleLinkClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link || !link.href) return;

      // Hide tooltip immediately on click
      hideTooltip();

      // Log prediction accuracy for learning
      if (link.href.startsWith('http')) {
        logPredictionClick(link.href);
      }
    }

    async function showLinkPrediction(link: HTMLAnchorElement, event: MouseEvent): Promise<void> {
      try {
        // Create page context
        const context: PageContext = {
          referrer: window.location.href,
          currentDomain: window.location.hostname,
          linkText: link.textContent?.trim() || '',
          linkPosition: getLinkPosition(link),
          isExternal: true
        };

        // Get prediction
        const analysis = await PrivacyPredictor.analyzeLink(link.href, context);
        
        // Create and show tooltip
        const tooltip = createPredictionTooltip(analysis.prediction);
        showTooltip(tooltip, event);

        // Add visual indicator to link
        addLinkIndicator(link, analysis.prediction);

      } catch (error) {
        console.error('[Phantom Trail] Failed to analyze link:', error);
      }
    }

    function createPredictionTooltip(prediction: PrivacyPrediction): HTMLElement {
      const tooltip = document.createElement('div');
      tooltip.className = 'phantom-trail-prediction-tooltip';
      
      const getScoreColor = (score: number): string => {
        if (score >= 80) return '#10b981'; // green
        if (score >= 60) return '#f59e0b'; // yellow
        return '#ef4444'; // red
      };

      const getScoreIcon = (score: number): string => {
        if (score >= 80) return '🟢';
        if (score >= 60) return '🟡';
        return '🔴';
      };

      tooltip.innerHTML = `
        <div style="
          position: fixed;
          z-index: 10000;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          max-width: 300px;
          pointer-events: auto;
        ">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="margin-right: 6px;">${getScoreIcon(prediction.predictedScore)}</span>
            <span style="font-weight: 600; color: ${getScoreColor(prediction.predictedScore)};">
              ${prediction.predictedGrade} (${prediction.predictedScore})
            </span>
            <span style="margin-left: 8px; font-size: 12px; color: #6b7280;">
              ${Math.round(prediction.confidence * 100)}% confident
            </span>
          </div>
          
          ${prediction.expectedTrackers.length > 0 ? `
            <div style="margin-bottom: 8px;">
              <div style="font-size: 12px; color: #374151; margin-bottom: 4px;">
                Expected trackers: ${prediction.expectedTrackers.length}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${prediction.expectedTrackers.slice(0, 3).map(tracker => `
                  <span style="
                    background: #f3f4f6;
                    color: #374151;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                  ">${tracker.type}</span>
                `).join('')}
                ${prediction.expectedTrackers.length > 3 ? `
                  <span style="
                    background: #f3f4f6;
                    color: #374151;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                  ">+${prediction.expectedTrackers.length - 3}</span>
                ` : ''}
              </div>
            </div>
          ` : ''}
          
          ${prediction.recommendations.length > 0 ? `
            <div style="font-size: 12px; color: #3b82f6;">
              💡 ${prediction.recommendations[0]}
            </div>
          ` : ''}
        </div>
      `;

      return tooltip;
    }

    function showTooltip(tooltip: HTMLElement, event: MouseEvent): void {
      // Hide existing tooltip
      hideTooltip();

      // Position tooltip
      const x = Math.min(event.clientX + 10, window.innerWidth - 320);
      const y = Math.max(event.clientY - 10, 10);
      
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;

      document.body.appendChild(tooltip);
      currentTooltip = tooltip;

      // Add mouse events to tooltip
      tooltip.addEventListener('mouseenter', () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
      });

      tooltip.addEventListener('mouseleave', () => {
        setTimeout(() => hideTooltip(), 100);
      });
    }

    function hideTooltip(): void {
      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }
    }

    function isMouseOverTooltip(): boolean {
      if (!currentTooltip) return false;
      // For now, just return false since we don't have mouse event context
      return false;
    }

    function addLinkIndicator(link: HTMLAnchorElement, prediction: PrivacyPrediction): void {
      // Remove existing indicator
      const existing = link.querySelector('.phantom-trail-link-indicator');
      if (existing) existing.remove();

      // Create indicator
      const indicator = document.createElement('span');
      indicator.className = 'phantom-trail-link-indicator';
      
      const getIndicatorColor = (score: number): string => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
      };

      indicator.innerHTML = `
        <span style="
          display: inline-block;
          width: 8px;
          height: 8px;
          background: ${getIndicatorColor(prediction.predictedScore)};
          border-radius: 50%;
          margin-left: 4px;
          vertical-align: middle;
        " title="Privacy prediction: ${prediction.predictedGrade} (${prediction.predictedScore})"></span>
      `;

      link.appendChild(indicator);
    }

    function getLinkPosition(link: HTMLAnchorElement): 'header' | 'content' | 'footer' | 'sidebar' {
      const rect = link.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Simple heuristic based on position
      if (rect.top < windowHeight * 0.2) return 'header';
      if (rect.top > windowHeight * 0.8) return 'footer';
      if (rect.left < window.innerWidth * 0.2 || rect.right > window.innerWidth * 0.8) return 'sidebar';
      return 'content';
    }

    async function logPredictionClick(url: string): Promise<void> {
      try {
        // This would log the click for prediction accuracy tracking
        console.log('[Phantom Trail] Link clicked:', url);
        // Future: Send to background for accuracy tracking
      } catch (error) {
        console.error('[Phantom Trail] Failed to log prediction click:', error);
      }
    }

    ctx.onInvalidated(() => {
      console.log('[Phantom Trail] Content script invalidated');
      recentDetections.clear();
    });
  },
});
