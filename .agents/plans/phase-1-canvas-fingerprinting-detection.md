# Phase 1: Canvas Fingerprinting Detection

**Estimated Time:** 2-3 hours
**Complexity:** Low-Medium
**Dependencies:** None
**Deliverable:** Working canvas fingerprinting detection visible in Live Feed

## Objective

Implement foundational content script infrastructure and canvas fingerprinting detection as the first in-page tracking capability. This phase establishes the architecture for all future detection methods.

## Why Canvas First?

- **Most common fingerprinting method** (~30% of all fingerprinting)
- **Clear detection signals** (getContext + toDataURL/getImageData pattern)
- **Well-documented** (extensive research available)
- **Low false positive rate** (legitimate canvas usage is different pattern)
- **Validates architecture** (proves content script → background → UI pipeline works)

## User Story

As a privacy-conscious user
I want to see when websites are using canvas fingerprinting
So that I know when my browser is being uniquely identified

## Success Criteria

- [ ] Canvas fingerprinting detected on https://browserleaks.com/canvas
- [ ] Event appears in Live Feed with "high" risk level
- [ ] Description explains "generating unique browser signature"
- [ ] AI analysis includes canvas fingerprinting context
- [ ] No console errors during detection
- [ ] CPU overhead <2% during canvas operations

---

## CONTEXT REFERENCES

### Files to Read Before Implementation

- `entrypoints/background.ts` (lines 1-170) - Event processing pattern
- `lib/types.ts` (lines 1-50) - TrackingEvent interface
- `lib/storage-manager.ts` (lines 1-100) - Storage patterns
- `wxt.config.ts` (lines 1-40) - Manifest configuration

### New Files to Create

- `lib/types.ts` - Extend with in-page tracking types
- `lib/content-messaging.ts` - Message passing utilities
- `lib/in-page-detector.ts` - Canvas detection logic only
- `entrypoints/content-main-world.ts` - Canvas API interception
- `entrypoints/content.ts` - Content script coordinator

### Documentation to Review

- [WXT Content Scripts](https://wxt.dev/guide/essentials/content-scripts.html)
- [WXT Inject Script](https://wxt.dev/api/reference/wxt/utils/inject-script/)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

## IMPLEMENTATION TASKS

### Task 1: UPDATE lib/types.ts - Add In-Page Tracking Types

**Objective:** Extend type system to support in-page tracking metadata

```typescript
// Add after existing TrackingEvent interface
export interface TrackingEvent {
  // ... existing fields
  inPageTracking?: {
    method: InPageTrackingMethod;
    details: string;
    apiCalls?: string[];
    frequency?: number;
  };
}

// Add new type
export type InPageTrackingMethod =
  | 'canvas-fingerprint'
  | 'storage-access'
  | 'mouse-tracking'
  | 'form-monitoring'
  | 'device-api'
  | 'clipboard-access';
```

**Validation:** `npx tsc --noEmit`

---

### Task 2: CREATE lib/content-messaging.ts - Message Passing Infrastructure

**Objective:** Type-safe communication between content and background scripts

```typescript
import type { TrackingEvent } from './types';

export interface ContentMessage {
  type: 'tracking-event' | 'ping';
  payload?: TrackingEvent;
  timestamp: number;
}

export interface BackgroundResponse {
  success: boolean;
  error?: string;
}

export class ContentMessaging {
  static async sendTrackingEvent(
    event: TrackingEvent
  ): Promise<BackgroundResponse> {
    try {
      const message: ContentMessage = {
        type: 'tracking-event',
        payload: event,
        timestamp: Date.now(),
      };

      const response = await chrome.runtime.sendMessage(message);
      return response as BackgroundResponse;
    } catch (error) {
      console.error('Failed to send tracking event:', error);
      return { success: false, error: String(error) };
    }
  }

  static async ping(): Promise<boolean> {
    try {
      const message: ContentMessage = {
        type: 'ping',
        timestamp: Date.now(),
      };

      const response = await chrome.runtime.sendMessage(message);
      return response?.success === true;
    } catch (error) {
      return false;
    }
  }
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 3: CREATE lib/in-page-detector.ts - Canvas Detection Logic

**Objective:** Analyze canvas operations for fingerprinting patterns

```typescript
import type { InPageTrackingMethod, RiskLevel } from './types';

export interface DetectionResult {
  detected: boolean;
  method: InPageTrackingMethod;
  description: string;
  riskLevel: RiskLevel;
  details: string;
  apiCalls?: string[];
  frequency?: number;
}

export class InPageDetector {
  private static readonly CANVAS_FINGERPRINT_THRESHOLD = 3;

  /**
   * Analyze canvas operations for fingerprinting patterns
   */
  static analyzeCanvasFingerprint(operations: string[]): DetectionResult {
    const suspiciousPatterns = [
      'getContext',
      'toDataURL',
      'getImageData',
      'fillText',
      'measureText',
    ];

    const matchedOperations = operations.filter(op =>
      suspiciousPatterns.some(pattern => op.includes(pattern))
    );

    const detected = matchedOperations.length >= this.CANVAS_FINGERPRINT_THRESHOLD;

    return {
      detected,
      method: 'canvas-fingerprint',
      description: detected
        ? 'Canvas fingerprinting detected - generating unique browser signature'
        : 'Normal canvas usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${matchedOperations.length} suspicious canvas operations detected`,
      apiCalls: matchedOperations,
      frequency: matchedOperations.length,
    };
  }
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 4: CREATE entrypoints/content-main-world.ts - Canvas API Interception

**Objective:** Inject into page's main world to intercept canvas API calls

```typescript
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';

export default defineUnlistedScript(() => {
  console.log('[Phantom Trail] Canvas detector loaded');

  const scriptElement = document.currentScript as HTMLScriptElement;
  const canvasOperations: string[] = [];

  function reportDetection(data: unknown) {
    scriptElement?.dispatchEvent(
      new CustomEvent('phantom-trail-detection', {
        detail: data,
      })
    );
  }

  function interceptCanvas() {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function (...args) {
      canvasOperations.push(`getContext(${args[0]})`);

      const context = originalGetContext.apply(this, args);

      if (context && args[0] === '2d') {
        const ctx = context as CanvasRenderingContext2D;

        // Intercept toDataURL
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (...dataArgs) {
          canvasOperations.push('toDataURL');
          checkCanvasFingerprinting();
          return originalToDataURL.apply(this, dataArgs);
        };

        // Intercept getImageData
        const originalGetImageData = ctx.getImageData;
        ctx.getImageData = function (...imageArgs) {
          canvasOperations.push('getImageData');
          checkCanvasFingerprinting();
          return originalGetImageData.apply(this, imageArgs);
        };

        // Intercept fillText (common in fingerprinting)
        const originalFillText = ctx.fillText;
        ctx.fillText = function (...textArgs) {
          canvasOperations.push('fillText');
          return originalFillText.apply(this, textArgs);
        };

        // Intercept measureText
        const originalMeasureText = ctx.measureText;
        ctx.measureText = function (...measureArgs) {
          canvasOperations.push('measureText');
          return originalMeasureText.apply(this, measureArgs);
        };
      }

      return context;
    };
  }

  function checkCanvasFingerprinting() {
    if (canvasOperations.length >= 3) {
      reportDetection({
        type: 'canvas-fingerprint',
        operations: [...canvasOperations],
        timestamp: Date.now(),
      });
      canvasOperations.length = 0; // Reset after reporting
    }
  }

  try {
    interceptCanvas();
  } catch (error) {
    console.error('[Phantom Trail] Failed to initialize canvas detector:', error);
  }
});
```

**Validation:** `pnpm build` (check for compilation errors)

---

### Task 5: CREATE entrypoints/content.ts - Content Script Coordinator

**Objective:** Isolated world script that coordinates detection and messaging

```typescript
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectScript } from 'wxt/utils/inject-script';
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

        // Analyze canvas fingerprinting
        if (type === 'canvas-fingerprint') {
          const detectionResult = InPageDetector.analyzeCanvasFingerprint(
            operations || []
          );

          if (!detectionResult.detected) {
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
          const response = await ContentMessaging.sendTrackingEvent(trackingEvent);

          if (response.success) {
            console.log('[Phantom Trail] Canvas fingerprinting reported');
          } else {
            console.error('[Phantom Trail] Failed to report:', response.error);
          }
        }
      } catch (error) {
        console.error('[Phantom Trail] Failed to process detection:', error);
      }
    }

    try {
      const { script } = await injectScript('/content-main-world.js', {
        keepInDom: true,
      });

      ctx.addEventListener(script, 'phantom-trail-detection', (event) => {
        processDetection(event as CustomEvent);
      });

      console.log('[Phantom Trail] Canvas detector injected');
    } catch (error) {
      console.error('[Phantom Trail] Failed to inject detector:', error);
    }

    ctx.onInvalidated(() => {
      console.log('[Phantom Trail] Content script invalidated');
      recentDetections.clear();
    });
  },
});
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 6: UPDATE wxt.config.ts - Add Web Accessible Resources

**Objective:** Allow main world script to be injected

```typescript
// Add to manifest object
manifest: {
  // ... existing fields
  web_accessible_resources: [
    {
      resources: ['content-main-world.js'],
      matches: ['<all_urls>'],
    },
  ],
},
```

**Validation:** `pnpm build` then check `.output/chrome-mv3/manifest.json`

---

### Task 7: UPDATE entrypoints/background.ts - Add Message Listener

**Objective:** Receive and process canvas fingerprinting events from content script

**Add after existing chrome.webRequest listener:**

```typescript
import type { ContentMessage, BackgroundResponse } from '../lib/content-messaging';

// Add message listener
chrome.runtime.onMessage.addListener(
  (
    message: ContentMessage,
    sender,
    sendResponse: (response: BackgroundResponse) => void
  ) => {
    (async () => {
      try {
        if (message.type === 'ping') {
          sendResponse({ success: true });
          return;
        }

        if (message.type === 'tracking-event' && message.payload) {
          const event = message.payload;

          // Store the event
          await StorageManager.addEvent(event);

          // Trigger AI analysis for high-risk canvas fingerprinting
          if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
            const context = ContextDetector.detectContext(event);
            await AIEngine.generateEventAnalysis(event, context);
          }

          console.log(
            'Canvas fingerprinting detected:',
            event.inPageTracking?.method,
            'on',
            event.domain
          );

          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Invalid message type' });
        }
      } catch (error) {
        console.error('Failed to handle content script message:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();

    return true; // Keep channel open for async response
  }
);
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 8: UPDATE lib/ai-engine.ts - Add Canvas Context to AI Prompts

**Objective:** Enhance AI narratives with canvas fingerprinting context

**In buildEventPrompt method, add after existing event description:**

```typescript
if (event.inPageTracking?.method === 'canvas-fingerprint') {
  prompt += `\n\nCanvas Fingerprinting Details:
- Method: Canvas API manipulation
- Operations: ${event.inPageTracking.apiCalls?.join(', ') || 'N/A'}
- Frequency: ${event.inPageTracking.frequency || 'N/A'} operations

This website is using canvas rendering to generate a unique fingerprint of your browser. 
This happens silently without network requests, making it invisible to traditional ad blockers.
The fingerprint can track you across websites even in incognito mode.`;
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

## VALIDATION COMMANDS

### Level 1: Build & Syntax

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

### Level 2: Extension Loading

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `.output/chrome-mv3`
5. Verify no errors in extension card

### Level 3: Canvas Fingerprinting Detection Test

**Test Site:** https://browserleaks.com/canvas

**Steps:**
1. Load extension in Chrome
2. Visit https://browserleaks.com/canvas
3. Open extension popup
4. Click "Live Feed" tab
5. Verify event appears with:
   - Title: "Canvas Fingerprinting" or similar
   - Risk level: "high" (red/orange badge)
   - Description mentions "unique browser signature"
   - Details show API calls (getContext, toDataURL, etc.)

**Expected Console Logs:**
```
[Phantom Trail] Canvas detector loaded
[Phantom Trail] Content script loaded
[Phantom Trail] Canvas detector injected
[Phantom Trail] Canvas fingerprinting reported
Canvas fingerprinting detected: canvas-fingerprint on browserleaks.com
```

### Level 4: AI Analysis Verification

**Steps:**
1. Wait 3-5 seconds after detection
2. Check Live Feed for AI narrative
3. Verify narrative mentions:
   - Canvas fingerprinting
   - Browser identification
   - Tracking across websites
4. Check recommendations include privacy tools

### Level 5: Performance Check

**Steps:**
1. Open Chrome Task Manager (Shift+Esc)
2. Find "Extension: Phantom Trail"
3. Monitor CPU usage while browsing
4. Verify CPU <2% during canvas operations
5. Verify memory <50MB

---

## ACCEPTANCE CRITERIA

- [x] Canvas fingerprinting detected on browserleaks.com
- [x] Event stored in chrome.storage.local
- [x] Event appears in Live Feed UI
- [x] Risk level is "high"
- [x] Description explains fingerprinting clearly
- [x] API calls listed in details
- [x] AI analysis includes canvas context
- [x] No console errors during detection
- [x] CPU overhead <2%
- [x] Memory usage <50MB
- [x] All TypeScript compilation passes
- [x] All ESLint checks pass
- [x] Production build succeeds

---

## COMPLETION CHECKLIST

- [ ] Task 1: Extended types.ts with InPageTrackingMethod
- [ ] Task 2: Created content-messaging.ts
- [ ] Task 3: Created in-page-detector.ts with canvas analysis
- [ ] Task 4: Created content-main-world.ts with canvas interception
- [ ] Task 5: Created content.ts with message handling
- [ ] Task 6: Updated wxt.config.ts with web_accessible_resources
- [ ] Task 7: Updated background.ts with message listener
- [ ] Task 8: Updated ai-engine.ts with canvas context
- [ ] All validation commands pass
- [ ] Canvas detection works on browserleaks.com
- [ ] AI analysis includes canvas context
- [ ] Performance requirements met

---

## TROUBLESHOOTING

**Issue: "Failed to inject detector" error**
- Check web_accessible_resources in manifest.json
- Verify content-main-world.js exists in build output
- Check CSP restrictions on test site

**Issue: No detection events appearing**
- Check browser console for "[Phantom Trail]" logs
- Verify canvas operations threshold (need 3+ operations)
- Check throttling (wait 3 seconds between detections)

**Issue: High CPU usage**
- Verify throttling is working (3-second delay)
- Check for infinite loops in interception code
- Profile with Chrome DevTools Performance tab

**Issue: AI analysis not appearing**
- Verify API key is set in settings
- Check background script console for AI errors
- Verify event.riskLevel is "high" or "critical"

---

## NEXT STEPS

After Phase 1 completion:
- **Phase 2:** Storage Access Detection (localStorage/cookies)
- **Phase 3:** Mouse Tracking Detection
- **Phase 4:** Form Monitoring
- **Phase 5:** Device API Detection

Each phase builds on this foundation, adding new detection methods to `in-page-detector.ts` and `content-main-world.ts`.
