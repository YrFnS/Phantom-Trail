# Phase 2: Storage Access Detection

**Estimated Time:** 1-2 hours
**Complexity:** Low
**Dependencies:** Phase 1 (Canvas Fingerprinting Detection)
**Deliverable:** localStorage/sessionStorage/cookie tracking detection in Live Feed

## Objective

Extend the content script infrastructure to detect excessive storage access patterns used for cross-site tracking and user profiling.

## Why Storage Second?

- **Builds on Phase 1 infrastructure** (same message passing, same detection flow)
- **Common tracking method** (~25% of tracking uses storage)
- **Clear detection pattern** (frequency-based analysis)
- **Low performance impact** (storage operations are infrequent)
- **Validates extensibility** (proves architecture scales to multiple detection methods)

## User Story

As a privacy-conscious user
I want to see when websites are excessively accessing my browser storage
So that I know when I'm being tracked across sessions

## Success Criteria

- [ ] Storage tracking detected on https://panopticlick.eff.org/
- [ ] Event appears in Live Feed with "medium" risk level
- [ ] Description shows number of storage operations
- [ ] Unique keys accessed are listed
- [ ] AI analysis includes storage tracking context
- [ ] No performance impact on normal storage usage

---

## CONTEXT REFERENCES

### Files to Read Before Implementation

- `lib/in-page-detector.ts` - Add storage analysis method
- `entrypoints/content-main-world.ts` - Add storage interception
- `entrypoints/content.ts` - Add storage event processing

### Files to Modify

- `lib/in-page-detector.ts` - Add analyzeStorageAccess method
- `entrypoints/content-main-world.ts` - Add storage API interception
- `entrypoints/content.ts` - Add storage detection case
- `lib/ai-engine.ts` - Add storage context to prompts

---

## IMPLEMENTATION TASKS

### Task 1: UPDATE lib/in-page-detector.ts - Add Storage Analysis

**Objective:** Analyze storage access patterns for tracking behavior

**Add to InPageDetector class:**

```typescript
private static readonly STORAGE_ACCESS_THRESHOLD = 10; // 10+ operations per minute

/**
 * Analyze storage access patterns
 */
static analyzeStorageAccess(
  operations: Array<{ type: string; key: string; timestamp: number }>
): DetectionResult {
  const recentOps = operations.filter(
    op => Date.now() - op.timestamp < 60000 // Last minute
  );

  const detected = recentOps.length >= this.STORAGE_ACCESS_THRESHOLD;
  const uniqueKeys = new Set(recentOps.map(op => op.key)).size;

  return {
    detected,
    method: 'storage-access',
    description: detected
      ? `Excessive storage access detected - ${uniqueKeys} unique keys accessed`
      : 'Normal storage usage',
    riskLevel: detected ? 'medium' : 'low',
    details: `${recentOps.length} storage operations in last minute`,
    apiCalls: recentOps.map(op => `${op.type}(${op.key})`),
    frequency: recentOps.length,
  };
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 2: UPDATE entrypoints/content-main-world.ts - Add Storage Interception

**Objective:** Intercept localStorage and sessionStorage API calls

**Add to main world script (after canvas interception):**

```typescript
// Add to tracking state at top
const storageOperations: Array<{
  type: string;
  key: string;
  timestamp: number;
}> = [];

/**
 * Intercept localStorage/sessionStorage
 */
function interceptStorage() {
  ['localStorage', 'sessionStorage'].forEach(storageType => {
    const storage = window[storageType as 'localStorage' | 'sessionStorage'];
    const originalSetItem = storage.setItem;
    const originalGetItem = storage.getItem;
    const originalRemoveItem = storage.removeItem;

    storage.setItem = function (key: string, value: string) {
      storageOperations.push({
        type: `${storageType}.setItem`,
        key,
        timestamp: Date.now(),
      });
      checkStorageAccess();
      return originalSetItem.call(this, key, value);
    };

    storage.getItem = function (key: string) {
      storageOperations.push({
        type: `${storageType}.getItem`,
        key,
        timestamp: Date.now(),
      });
      checkStorageAccess();
      return originalGetItem.call(this, key);
    };

    storage.removeItem = function (key: string) {
      storageOperations.push({
        type: `${storageType}.removeItem`,
        key,
        timestamp: Date.now(),
      });
      checkStorageAccess();
      return originalRemoveItem.call(this, key);
    };
  });
}

/**
 * Check for excessive storage access
 */
function checkStorageAccess() {
  const recentOps = storageOperations.filter(
    op => Date.now() - op.timestamp < 60000
  );

  if (recentOps.length >= 10) {
    reportDetection({
      type: 'storage-access',
      operations: recentOps,
      timestamp: Date.now(),
    });
  }
}

// Add to initialization at bottom
try {
  interceptCanvas();
  interceptStorage(); // Add this line
} catch (error) {
  console.error('[Phantom Trail] Failed to initialize detectors:', error);
}
```

**Validation:** `pnpm build`

---

### Task 3: UPDATE entrypoints/content.ts - Add Storage Event Processing

**Objective:** Process storage detection events from main world

**Add to processDetection function (after canvas case):**

```typescript
// Add to switch statement
case 'storage-access':
  detectionResult = InPageDetector.analyzeStorageAccess(
    event.detail.operations || []
  );
  break;
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 4: UPDATE lib/ai-engine.ts - Add Storage Context

**Objective:** Enhance AI prompts with storage tracking context

**Add to buildEventPrompt method (after canvas context):**

```typescript
if (event.inPageTracking?.method === 'storage-access') {
  prompt += `\n\nStorage Access Tracking Details:
- Operations: ${event.inPageTracking.frequency || 'N/A'} in last minute
- API Calls: ${event.inPageTracking.apiCalls?.slice(0, 5).join(', ') || 'N/A'}

This website is excessively accessing browser storage (localStorage/sessionStorage).
This can be used to track you across sessions and build a profile of your behavior.
The data persists even after closing the browser.`;
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

### Level 2: Storage Detection Test

**Test Site:** https://panopticlick.eff.org/

**Steps:**

1. Reload extension in Chrome
2. Visit https://panopticlick.eff.org/
3. Click "Test Me" button
4. Open extension popup → Live Feed
5. Verify storage access event appears with:
   - Risk level: "medium" (yellow/orange)
   - Description mentions storage operations count
   - Details show unique keys accessed
   - API calls listed (localStorage.setItem, etc.)

**Alternative Test Site:** https://amiunique.org/

### Level 3: AI Analysis Verification

**Steps:**

1. Wait 3-5 seconds after detection
2. Check for AI narrative in Live Feed
3. Verify narrative mentions:
   - Storage access tracking
   - Cross-session tracking
   - Data persistence

### Level 4: Performance Check

**Steps:**

1. Visit normal websites (news, blogs)
2. Verify no false positives on legitimate storage use
3. Check CPU usage remains <2%
4. Verify no lag during page interactions

---

## ACCEPTANCE CRITERIA

- [x] Storage tracking detected on panopticlick.eff.org
- [x] Event stored and appears in Live Feed
- [x] Risk level is "medium"
- [x] Storage operations count shown
- [x] Unique keys listed in details
- [x] AI analysis includes storage context
- [x] No false positives on normal sites
- [x] No performance degradation
- [x] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: Added analyzeStorageAccess to in-page-detector.ts
- [ ] Task 2: Added storage interception to content-main-world.ts
- [ ] Task 3: Added storage case to content.ts
- [ ] Task 4: Added storage context to ai-engine.ts
- [ ] Storage detection works on test sites
- [ ] AI analysis includes storage context
- [ ] No false positives observed
- [ ] Performance requirements met

---

## TROUBLESHOOTING

**Issue: Too many false positives**

- Increase STORAGE_ACCESS_THRESHOLD from 10 to 15
- Add whitelist for common legitimate keys (\_ga, \_gid, etc.)

**Issue: Not detecting on test sites**

- Lower threshold temporarily to 5 for testing
- Check console for storage operation logs
- Verify checkStorageAccess is being called

**Issue: Performance impact**

- Verify throttling is working (60-second window)
- Check storageOperations array isn't growing unbounded
- Add cleanup for old operations

---

## NEXT STEPS

After Phase 2 completion:

- **Phase 3:** Mouse Tracking Detection
- **Phase 4:** Form Monitoring
- **Phase 5:** Device API Detection
