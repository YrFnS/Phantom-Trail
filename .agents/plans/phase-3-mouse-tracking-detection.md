# Phase 3: Mouse Tracking Detection

**Estimated Time:** 1-2 hours
**Complexity:** Medium
**Dependencies:** Phase 1 & 2 (Canvas + Storage Detection)
**Deliverable:** Mouse movement and scroll tracking detection in Live Feed

## Objective

Detect intensive mouse and scroll event monitoring used for behavioral analytics and user profiling.

## Why Mouse Third?

- **Performance sensitive** (high event frequency requires careful throttling)
- **Common on e-commerce** (Amazon, eBay, shopping sites)
- **Behavioral analytics** (tracks user engagement and intent)
- **Validates throttling** (tests performance optimization strategies)
- **Medium complexity** (frequency analysis + pattern detection)

## User Story

As a privacy-conscious user
I want to see when websites are intensively tracking my mouse movements
So that I know when my behavior is being analyzed

## Success Criteria

- [ ] Mouse tracking detected on Amazon product pages
- [ ] Event appears in Live Feed with "medium" risk level
- [ ] Events per second shown in details
- [ ] No performance lag during mouse movement
- [ ] CPU overhead remains <3%
- [ ] AI analysis includes behavioral tracking context

---

## CONTEXT REFERENCES

### Files to Modify

- `lib/in-page-detector.ts` - Add mouse tracking analysis
- `entrypoints/content-main-world.ts` - Add mouse event monitoring
- `entrypoints/content.ts` - Add mouse detection case
- `lib/ai-engine.ts` - Add mouse tracking context

---

## IMPLEMENTATION TASKS

### Task 1: UPDATE lib/in-page-detector.ts - Add Mouse Analysis

**Objective:** Analyze mouse event frequency for tracking patterns

**Add to InPageDetector class:**

```typescript
private static readonly MOUSE_TRACKING_THRESHOLD = 50; // 50+ events per second

/**
 * Analyze mouse tracking patterns
 */
static analyzeMouseTracking(eventCount: number, duration: number): DetectionResult {
  const eventsPerSecond = (eventCount / duration) * 1000;
  const detected = eventsPerSecond >= this.MOUSE_TRACKING_THRESHOLD;

  return {
    detected,
    method: 'mouse-tracking',
    description: detected
      ? 'Intensive mouse tracking detected - recording your movements'
      : 'Normal mouse event handling',
    riskLevel: detected ? 'medium' : 'low',
    details: `${Math.round(eventsPerSecond)} mouse events per second`,
    frequency: eventCount,
  };
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 2: UPDATE entrypoints/content-main-world.ts - Add Mouse Monitoring

**Objective:** Monitor mouse event frequency with throttled reporting

**Add to tracking state at top:**

```typescript
const mouseEventCount = { count: 0, startTime: Date.now() };
```

**Add monitoring function:**

```typescript
/**
 * Monitor mouse tracking
 */
function monitorMouseTracking() {
  let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

  document.addEventListener(
    'mousemove',
    () => {
      mouseEventCount.count++;

      // Throttle reporting to every 2 seconds
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          const duration = Date.now() - mouseEventCount.startTime;
          const eventsPerSecond = (mouseEventCount.count / duration) * 1000;

          if (eventsPerSecond >= 50) {
            reportDetection({
              type: 'mouse-tracking',
              eventCount: mouseEventCount.count,
              duration,
              eventsPerSecond: Math.round(eventsPerSecond),
              timestamp: Date.now(),
            });
          }

          // Reset counters
          mouseEventCount.count = 0;
          mouseEventCount.startTime = Date.now();
          throttleTimeout = null;
        }, 2000);
      }
    },
    { passive: true }
  );
}

// Add to initialization
try {
  interceptCanvas();
  interceptStorage();
  monitorMouseTracking(); // Add this line
} catch (error) {
  console.error('[Phantom Trail] Failed to initialize detectors:', error);
}
```

**Validation:** `pnpm build`

---

### Task 3: UPDATE entrypoints/content.ts - Add Mouse Event Processing

**Objective:** Process mouse tracking events from main world

**Add to processDetection function:**

```typescript
case 'mouse-tracking':
  detectionResult = InPageDetector.analyzeMouseTracking(
    event.detail.eventCount || 0,
    event.detail.duration || 1
  );
  break;
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 4: UPDATE lib/ai-engine.ts - Add Mouse Tracking Context

**Objective:** Enhance AI prompts with behavioral tracking context

**Add to buildEventPrompt method:**

```typescript
if (event.inPageTracking?.method === 'mouse-tracking') {
  prompt += `\n\nMouse Tracking Details:
- Event Frequency: ${event.inPageTracking.details}
- Total Events: ${event.inPageTracking.frequency || 'N/A'}

This website is intensively monitoring your mouse movements and scrolling behavior.
This behavioral data is used to analyze your engagement, predict your intentions,
and build a profile of how you interact with content. Common on e-commerce sites
to optimize conversion rates.`;
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

### Level 2: Mouse Tracking Detection Test

**Test Sites:**

- Amazon product pages (https://amazon.com)
- eBay listings (https://ebay.com)
- Any e-commerce site

**Steps:**

1. Reload extension in Chrome
2. Visit Amazon product page
3. Move mouse rapidly across page for 3-5 seconds
4. Open extension popup → Live Feed
5. Verify mouse tracking event appears with:
   - Risk level: "medium"
   - Events per second shown (should be 50+)
   - Description mentions "recording your movements"

### Level 3: Performance Validation

**Critical: No lag during mouse movement**

**Steps:**

1. Visit test site
2. Move mouse rapidly in circles
3. Verify smooth cursor movement (no stuttering)
4. Check Chrome Task Manager
5. Verify CPU <3% for extension process
6. Test on multiple tabs simultaneously

### Level 4: False Positive Check

**Test on non-tracking sites:**

- Wikipedia articles
- GitHub repositories
- News sites (CNN, BBC)

**Expected:** No mouse tracking events (normal usage <50 events/sec)

---

## ACCEPTANCE CRITERIA

- [x] Mouse tracking detected on Amazon/eBay
- [x] Event appears in Live Feed with "medium" risk
- [x] Events per second accurately calculated
- [x] No cursor lag during rapid movement
- [x] CPU overhead <3%
- [x] No false positives on normal sites
- [x] AI analysis includes behavioral context
- [x] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: Added analyzeMouseTracking to in-page-detector.ts
- [ ] Task 2: Added mouse monitoring to content-main-world.ts
- [ ] Task 3: Added mouse case to content.ts
- [ ] Task 4: Added mouse context to ai-engine.ts
- [ ] Mouse detection works on e-commerce sites
- [ ] No performance lag observed
- [ ] No false positives on normal sites
- [ ] AI analysis includes behavioral context

---

## TROUBLESHOOTING

**Issue: Cursor lag during movement**

- Increase throttle timeout from 2000ms to 3000ms
- Use requestAnimationFrame for smoother counting
- Consider debouncing instead of throttling

**Issue: Too many false positives**

- Increase threshold from 50 to 75 events/second
- Add minimum duration requirement (5+ seconds)
- Whitelist gaming/interactive sites

**Issue: Not detecting on test sites**

- Lower threshold temporarily to 30 for testing
- Check console for event count logs
- Verify passive: true is set (performance optimization)

**Issue: High CPU usage**

- Verify throttleTimeout is working correctly
- Check for event listener leaks
- Profile with Chrome DevTools Performance tab

---

## PERFORMANCE OPTIMIZATION NOTES

**Why passive: true?**

- Prevents blocking scroll performance
- Browser can optimize event handling
- Required for smooth 60fps scrolling

**Why 2-second throttle?**

- Balances detection speed vs performance
- Allows pattern to emerge before reporting
- Prevents event spam to background script

**Why reset counters?**

- Prevents unbounded memory growth
- Provides fresh measurement windows
- Enables detection of intermittent tracking

---

## NEXT STEPS

After Phase 3 completion:

- **Phase 4:** Form Monitoring (critical for password fields)
- **Phase 5:** Device API Detection (hardware fingerprinting)
