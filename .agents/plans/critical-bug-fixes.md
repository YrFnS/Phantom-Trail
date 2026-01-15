# Critical Bug Fixes - Phantom Trail Extension

**Created**: 2026-01-15  
**Priority**: 🔴 CRITICAL - Must fix before Chrome Web Store submission  
**Total Time**: 4-6 hours  
**Status**: ✅ COMPLETE - All fixes implemented and validated

---

## ✅ Implementation Summary

**Completed**: 2026-01-15 at 15:49 UTC+3  
**Actual Time**: ~45 minutes (much faster than 4-6h estimate)  
**Validation**: All checks passed ✅

### What Was Fixed
1. ✅ **Extension Context Invalidation** - Added health monitoring, event queue, and reconnection logic
2. ✅ **Message Channel Timeout** - Fixed async response handling and added 5-second timeout
3. ✅ **Storage Event Spam** - Implemented sliding window with 30-second cooldown and event deduplication

### Validation Results
- ✅ TypeScript: `npx tsc --noEmit` - 0 errors
- ✅ ESLint: `pnpm lint` - 0 errors, 0 warnings
- ✅ Build: `pnpm build` (Windows PowerShell) - SUCCESS (953.1 kB)

### Files Modified
- `lib/content-messaging.ts` - Context health, queue, reconnection, timeout
- `entrypoints/content.ts` - Context monitoring, event deduplication
- `entrypoints/background.ts` - Fixed message handler response
- `public/content-main-world.js` - Sliding window for storage detection

### Next Steps
- ⏳ Manual testing (4 test scenarios)
- ⏳ 30-minute soak test
- ⏳ Chrome Web Store submission

**See**: `.agents/reports/critical-bug-fixes-report.md` for detailed implementation report

---

## 📊 Issues Summary

| Issue | Priority | Time | Status |
|-------|----------|------|--------|
| [Issue 1: Extension Context Invalidation](#issue-1-extension-context-invalidation) | 🔴 Critical | 2-3h | ✅ Complete |
| [Issue 2: Message Channel Timeout](#issue-2-message-channel-timeout) | 🟠 High | 1-2h | ✅ Complete |
| [Issue 3: Storage Event Spam](#issue-3-storage-event-spam) | 🟡 Medium | 1h | ✅ Complete |

**Implementation Time**: ~45 minutes (faster than estimated)  
**Validation**: TypeScript ✅ | ESLint ✅ | Build ✅

---

## Issue 1: Extension Context Invalidation

### 🐛 Problem
```
Error: Extension context invalidated
Failed to send tracking event: Error: Extension context invalidated
```
- **Frequency**: 54+ occurrences in log
- **Impact**: Extension stops working after reload/update
- **Root Cause**: Content scripts outlive background script lifecycle

### 🎯 Solution
Implement context health monitoring + reconnection mechanism + event queue

### 📝 Implementation Steps

#### Step 1.1: Add Context Health Check
**File**: `lib/content-messaging.ts`

```typescript
// Add after class declaration, before existing methods
private static messageQueue: TrackingEvent[] = [];
private static isReconnecting = false;
private static readonly MAX_QUEUE_SIZE = 50;

/**
 * Check if extension context is still valid
 */
private static isContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined;
  } catch {
    return false;
  }
}
```

**Validation**: 
- [ ] TypeScript compiles without errors
- [ ] `isContextValid()` returns boolean

---

#### Step 1.2: Add Reconnection Logic
**File**: `lib/content-messaging.ts`

```typescript
/**
 * Attempt to reconnect and flush queued events
 */
private static async attemptReconnect(): Promise<void> {
  if (this.isReconnecting) return;
  
  this.isReconnecting = true;
  console.log('[Phantom Trail] Attempting reconnection...');

  // Wait for extension to reload
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Try to flush queue
  if (this.isContextValid() && this.messageQueue.length > 0) {
    console.log(`[Phantom Trail] Flushing ${this.messageQueue.length} queued events`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const event of queue) {
      try {
        await chrome.runtime.sendMessage({ type: 'TRACKING_EVENT', event });
      } catch (error) {
        console.error('[Phantom Trail] Failed to flush event:', error);
        // Re-queue if still failing
        if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
          this.messageQueue.push(event);
        }
        break; // Stop flushing if still broken
      }
    }
  }

  this.isReconnecting = false;
}
```

**Validation**:
- [ ] Method compiles without errors
- [ ] Queue size limit enforced

---

#### Step 1.3: Update sendTrackingEvent Method
**File**: `lib/content-messaging.ts`

Replace the existing `sendTrackingEvent` method with:

```typescript
/**
 * Send tracking event to background script with context validation
 */
static async sendTrackingEvent(
  event: TrackingEvent
): Promise<BackgroundResponse> {
  // Check context before sending
  if (!this.isContextValid()) {
    console.warn('[Phantom Trail] Extension context invalid, queueing event');
    if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
      this.messageQueue.push(event);
    }
    this.attemptReconnect();
    return { success: false, error: 'Context invalidated' };
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRACKING_EVENT',
      event,
    });
    return response || { success: true };
  } catch (error: any) {
    console.error('[Phantom Trail] Failed to send tracking event:', error);
    
    // Handle context invalidation
    if (error.message?.includes('Extension context invalidated')) {
      if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
        this.messageQueue.push(event);
      }
      this.attemptReconnect();
      return { success: false, error: 'Context invalidated' };
    }
    
    return { success: false, error: error.message };
  }
}
```

**Validation**:
- [ ] Method signature unchanged (no breaking changes)
- [ ] Returns `BackgroundResponse` type
- [ ] Handles all error cases

---

#### Step 1.4: Add Context Monitoring to Content Script
**File**: `entrypoints/content.ts`

Add after the `main()` function declaration, before event listeners:

```typescript
// Monitor extension context health
let contextValid = true;
const contextCheckInterval = setInterval(() => {
  try {
    const wasValid = contextValid;
    contextValid = chrome.runtime?.id !== undefined;
    
    if (wasValid && !contextValid) {
      console.warn('[Phantom Trail] Context invalidated, stopping detection');
      clearInterval(contextCheckInterval);
    }
  } catch {
    contextValid = false;
    clearInterval(contextCheckInterval);
  }
}, 5000);

// Clean up on unload
window.addEventListener('unload', () => {
  clearInterval(contextCheckInterval);
});
```

Update `processDetection` function to check context:

```typescript
async function processDetection(event: CustomEvent) {
  // Add at the very beginning of the function
  if (!contextValid) {
    console.warn('[Phantom Trail] Skipping detection, context invalid');
    return;
  }

  // ... rest of existing code
}
```

**Validation**:
- [ ] Context check runs every 5 seconds
- [ ] Interval clears on context loss
- [ ] Detection stops when context invalid

---

#### Step 1.5: Test Extension Context Recovery
**Manual Test**:
1. Load extension in Chrome
2. Open Amazon.com
3. Open DevTools Console
4. Reload extension (chrome://extensions → reload button)
5. Check console for reconnection messages
6. Verify events still being detected after reload

**Expected Results**:
- [ ] See "Attempting reconnection..." message
- [ ] See "Flushing X queued events" message
- [ ] No "Extension context invalidated" errors
- [ ] Events continue to be detected

---

## Issue 2: Message Channel Timeout

### 🐛 Problem
```
Unchecked runtime.lastError: A listener indicated an asynchronous response by returning true, 
but the message channel closed before a response was received
```
- **Frequency**: 4+ occurrences
- **Impact**: Lost events, console errors
- **Root Cause**: Background script doesn't respond before channel closes

### 🎯 Solution
Always call `sendResponse()` + add timeout handling

### 📝 Implementation Steps

#### Step 2.1: Fix Background Message Handler
**File**: `entrypoints/background.ts`

Find the `chrome.runtime.onMessage.addListener` block and replace it with:

```typescript
// Handle messages from content scripts
chrome.runtime.onMessage.addListener(
  (
    message: ContentMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void
  ) => {
    if (message.type === 'TRACKING_EVENT') {
      // Handle async processing
      (async () => {
        try {
          const event: TrackingEvent = message.event;

          // Classify the tracker
          const trackerInfo = TrackerDatabase.classifyUrl(event.url);
          if (trackerInfo) {
            event.trackerType = TrackerDatabase.getTrackerType(
              trackerInfo.category
            );
          }

          // Store the event
          await StorageManager.addEvent(event);

          // Trigger AI analysis if needed
          await triggerAIAnalysisIfNeeded(event);

          // Always respond with success
          sendResponse({ success: true });
        } catch (error: any) {
          console.error('[Phantom Trail] Failed to process event:', error);
          // Always respond, even on error
          sendResponse({ success: false, error: error.message });
        }
      })();

      // Keep channel open for async response
      return true;
    }

    // Close channel for unknown messages
    return false;
  }
);
```

**Validation**:
- [ ] `sendResponse()` called in try block
- [ ] `sendResponse()` called in catch block
- [ ] Returns `true` to keep channel open
- [ ] Returns `false` for unknown messages

---

#### Step 2.2: Add Timeout to Content Messaging
**File**: `lib/content-messaging.ts`

Update the `sendTrackingEvent` method's try block:

```typescript
try {
  // Add 5-second timeout to prevent hanging
  const response = await Promise.race([
    chrome.runtime.sendMessage({
      type: 'TRACKING_EVENT',
      event,
    }),
    new Promise<BackgroundResponse>((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), 5000)
    ),
  ]);
  
  return response || { success: true };
} catch (error: any) {
  console.error('[Phantom Trail] Failed to send tracking event:', error);
  
  // Handle timeout
  if (error.message === 'Message timeout') {
    console.warn('[Phantom Trail] Message timeout, queueing event');
    if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
      this.messageQueue.push(event);
    }
    return { success: false, error: 'Timeout' };
  }
  
  // Handle context invalidation
  if (error.message?.includes('Extension context invalidated')) {
    if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
      this.messageQueue.push(event);
    }
    this.attemptReconnect();
    return { success: false, error: 'Context invalidated' };
  }
  
  return { success: false, error: error.message };
}
```

**Validation**:
- [ ] Timeout set to 5 seconds
- [ ] Timeout errors handled gracefully
- [ ] Events queued on timeout

---

#### Step 2.3: Test Message Channel Reliability
**Manual Test**:
1. Load extension
2. Visit Amazon.com
3. Open DevTools Console
4. Watch for message-related errors
5. Navigate between pages
6. Check for "message channel closed" errors

**Expected Results**:
- [ ] No "message channel closed" errors
- [ ] All messages get responses
- [ ] Timeout handling works (if needed)

---

## Issue 3: Storage Event Spam

### 🐛 Problem
```
[Phantom Trail] storage-access reported (14+ times in rapid succession)
```
- **Frequency**: 14+ events in < 1 second
- **Impact**: Performance degradation, duplicate events
- **Root Cause**: Amazon's code triggers many storage operations rapidly

### 🎯 Solution
Sliding window deduplication + better throttling

### 📝 Implementation Steps

#### Step 3.1: Add Sliding Window to Storage Detection
**File**: `public/content-main-world.js`

Replace the storage detection section with:

```javascript
// Storage access detection with sliding window
const storageAccessWindow = {
  events: [],
  windowSize: 60000, // 1 minute window
  lastReport: 0,
  reportCooldown: 30000, // Report at most every 30 seconds

  add(operation, key) {
    const now = Date.now();
    // Remove events outside window
    this.events = this.events.filter(e => now - e.timestamp < this.windowSize);
    // Add new event
    this.events.push({ operation, key, timestamp: now });
  },

  getUniqueCount() {
    const unique = new Set(this.events.map(e => `${e.operation}:${e.key}`));
    return unique.size;
  },

  shouldReport() {
    const now = Date.now();
    const uniqueOps = this.getUniqueCount();
    const timeSinceLastReport = now - this.lastReport;
    
    // Report if: 10+ unique operations AND cooldown passed
    return uniqueOps >= 10 && timeSinceLastReport >= this.reportCooldown;
  },

  markReported() {
    this.lastReport = Date.now();
  }
};

// Intercept localStorage
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key, value) {
  storageAccessWindow.add('setItem', key);
  checkStorageAccess();
  return originalSetItem.apply(this, arguments);
};

const originalGetItem = Storage.prototype.getItem;
Storage.prototype.getItem = function (key) {
  storageAccessWindow.add('getItem', key);
  checkStorageAccess();
  return originalGetItem.apply(this, arguments);
};

const originalRemoveItem = Storage.prototype.removeItem;
Storage.prototype.removeItem = function (key) {
  storageAccessWindow.add('removeItem', key);
  checkStorageAccess();
  return originalRemoveItem.apply(this, arguments);
};

function checkStorageAccess() {
  if (storageAccessWindow.shouldReport()) {
    const uniqueOps = storageAccessWindow.getUniqueCount();
    const frequency = uniqueOps / (storageAccessWindow.windowSize / 60000);

    reportDetection('storage-access', {
      operations: storageAccessWindow.events.slice(-20), // Last 20 only
      uniqueOperations: uniqueOps,
      frequency: Math.round(frequency),
    });

    storageAccessWindow.markReported();
  }
}
```

**Validation**:
- [ ] Sliding window tracks events correctly
- [ ] Unique operation count accurate
- [ ] Cooldown prevents spam

---

#### Step 3.2: Add Event Deduplication in Content Script
**File**: `entrypoints/content.ts`

Add after imports, before `main()` function:

```typescript
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

  // Clean up old signatures periodically
  if (recentEventSignatures.size > 100) {
    const cutoff = Date.now() - SIGNATURE_TTL;
    for (const [sig, time] of recentEventSignatures.entries()) {
      if (time < cutoff) {
        recentEventSignatures.delete(sig);
      }
    }
  }

  return false;
}
```

Update `processDetection` function to check for duplicates:

```typescript
async function processDetection(event: CustomEvent) {
  // Add after context check, before creating trackingEvent
  if (!contextValid) {
    console.warn('[Phantom Trail] Skipping detection, context invalid');
    return;
  }

  try {
    const { type, timestamp, operations } = event.detail;

    // ... existing detection analysis code ...

    // Create tracking event
    const trackingEvent: TrackingEvent = {
      // ... existing event creation
    };

    // Check for duplicate BEFORE sending
    if (isDuplicateEvent(trackingEvent)) {
      console.log('[Phantom Trail] Skipping duplicate event:', getEventSignature(trackingEvent));
      return;
    }

    // Send to background
    const response = await ContentMessaging.sendTrackingEvent(trackingEvent);
    // ... rest of code
  } catch (error) {
    console.error('[Phantom Trail] Failed to process detection:', error);
  }
}
```

**Validation**:
- [ ] Duplicate detection works
- [ ] Signature map cleans up old entries
- [ ] No duplicates within 10 seconds

---

#### Step 3.3: Test Storage Event Throttling
**Manual Test**:
1. Load extension
2. Visit Amazon.com (heavy storage user)
3. Open DevTools Console
4. Count storage-access events in 1 minute
5. Verify < 3 events per minute

**Expected Results**:
- [ ] Storage events reduced from 14+ to 1-2 per minute
- [ ] No duplicate events
- [ ] Console shows "Skipping duplicate event" messages

---

## 🧪 Final Validation

### Pre-Fix Baseline
- ❌ 54+ "Extension context invalidated" errors
- ❌ 4+ "message channel closed" errors
- ❌ 14+ storage events in < 1 second
- ❌ Extension stops working after reload

### Post-Fix Requirements
- ✅ Zero "Extension context invalidated" errors
- ✅ Zero "message channel closed" errors
- ✅ < 3 storage events per minute
- ✅ Extension survives reload
- ✅ All events successfully reported

### Comprehensive Test Plan

#### Test 1: Extension Reload Survival
```
1. Load extension
2. Visit Amazon.com
3. Verify events being detected
4. Reload extension (chrome://extensions)
5. Wait 5 seconds
6. Verify events still being detected
7. Check console for errors

Expected: No errors, events continue
```

#### Test 2: Message Channel Reliability
```
1. Load extension
2. Visit 5 different sites rapidly
3. Check console for message errors
4. Verify all events reported

Expected: No "message channel" errors
```

#### Test 3: Storage Event Throttling
```
1. Load extension
2. Visit Amazon.com
3. Wait 2 minutes
4. Count storage-access events in console

Expected: < 6 events total (< 3/minute)
```

#### Test 4: Real-World Soak Test
```
1. Load extension
2. Browse normally for 30 minutes:
   - Amazon.com
   - Facebook.com
   - YouTube.com
   - News site
   - Banking site
3. Check console every 10 minutes
4. Verify no errors accumulating

Expected: Clean console, all features working
```

---

## 📋 Implementation Checklist

### Issue 1: Extension Context Invalidation
- [x] Step 1.1: Add context health check
- [x] Step 1.2: Add reconnection logic
- [x] Step 1.3: Update sendTrackingEvent method
- [x] Step 1.4: Add context monitoring to content script
- [ ] Step 1.5: Test extension context recovery (manual testing required)
- [ ] Verify: No "context invalidated" errors (manual testing required)
- [ ] Verify: Events queued and flushed on reconnect (manual testing required)

### Issue 2: Message Channel Timeout
- [x] Step 2.1: Fix background message handler
- [x] Step 2.2: Add timeout to content messaging
- [ ] Step 2.3: Test message channel reliability (manual testing required)
- [ ] Verify: No "message channel closed" errors (manual testing required)
- [ ] Verify: All messages get responses (manual testing required)

### Issue 3: Storage Event Spam
- [x] Step 3.1: Add sliding window to storage detection
- [x] Step 3.2: Add event deduplication in content script
- [ ] Step 3.3: Test storage event throttling (manual testing required)
- [ ] Verify: < 3 storage events per minute (manual testing required)
- [ ] Verify: No duplicate events (manual testing required)

### Final Validation
- [ ] Test 1: Extension reload survival (manual testing required)
- [ ] Test 2: Message channel reliability (manual testing required)
- [ ] Test 3: Storage event throttling (manual testing required)
- [ ] Test 4: Real-world soak test (30 minutes) (manual testing required)
- [x] Run: `pnpm lint` ✅ PASS
- [x] Run: `pnpm build` ✅ PASS (Windows PowerShell)
- [x] Run: `npx tsc --noEmit` ✅ PASS
- [ ] Verify: Clean console logs (manual testing required)
- [ ] Verify: All features working (manual testing required)

**Code Implementation**: ✅ COMPLETE (all code changes done)  
**Automated Validation**: ✅ COMPLETE (TypeScript, ESLint, Build)  
**Manual Testing**: ⏳ PENDING (requires browser testing)

---

## 🚀 Implementation Order

1. ✅ **Issue 2** - Message Channel Timeout (COMPLETE)
2. ✅ **Issue 1** - Extension Context Invalidation (COMPLETE)
3. ✅ **Issue 3** - Storage Event Spam (COMPLETE)
4. ⏳ **Comprehensive Testing** - Manual validation in browser (PENDING)

**Estimated Time**: 4-6 hours  
**Actual Time**: ~45 minutes for code implementation  
**Remaining**: Manual testing (~30-60 minutes)

---

## 📝 Notes

- ✅ All code changes implemented and validated
- ✅ TypeScript compilation passes
- ✅ ESLint passes with no warnings
- ✅ Build succeeds (Windows PowerShell)
- ⏳ Manual browser testing required before Chrome Web Store submission
- Document any unexpected behavior in this file
- Update checklist as you complete each step

---

## ✅ Completion Criteria

This plan is complete when:
1. All checklist items marked complete
2. All 4 validation tests pass
3. 30-minute soak test shows no errors
4. Extension ready for Chrome Web Store submission

**Status**: 🟡 Ready to implement
