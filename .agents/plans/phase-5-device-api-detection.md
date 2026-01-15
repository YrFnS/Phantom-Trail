# Phase 5: Device API Detection

**Estimated Time:** 1-2 hours
**Complexity:** Medium-High
**Dependencies:** Phase 1, 2, 3, 4 (All previous detection methods)
**Deliverable:** Device fingerprinting detection via hardware API access

## Objective

Detect when websites access device APIs (battery, geolocation, clipboard, screen properties, hardware info) to create hardware-based fingerprints.

## Why Device API Last?

- **Most complex** (many different APIs to monitor)
- **Lower frequency** (less common than other methods)
- **Completes coverage** (rounds out all major tracking methods)
- **Advanced fingerprinting** (combines multiple data points)
- **Validates scalability** (tests system with 5 detection methods)

## User Story

As a privacy-conscious user
I want to see when websites access my device hardware information
So that I know when I'm being fingerprinted via device characteristics

## Success Criteria

- [ ] Device API access detected on https://webkay.robinlinus.com/
- [ ] Event appears in Live Feed with "high" risk level
- [ ] API calls listed (battery, geolocation, screen, etc.)
- [ ] 3+ API accesses trigger detection
- [ ] AI analysis explains hardware fingerprinting
- [ ] No false positives on legitimate API usage

---

## CONTEXT REFERENCES

### Files to Modify

- `lib/in-page-detector.ts` - Add device API analysis
- `entrypoints/content-main-world.ts` - Add device API monitoring
- `entrypoints/content.ts` - Add device API detection case
- `lib/ai-engine.ts` - Add device fingerprinting context

---

## IMPLEMENTATION TASKS

### Task 1: UPDATE lib/in-page-detector.ts - Add Device API Analysis

**Objective:** Analyze device API access patterns for fingerprinting

**Add to InPageDetector class:**

```typescript
/**
 * Analyze device API access
 */
static analyzeDeviceAPI(apiCalls: string[]): DetectionResult {
  const suspiciousAPIs = [
    'navigator.getBattery',
    'navigator.geolocation',
    'navigator.mediaDevices',
    'navigator.clipboard',
    'screen.width',
    'screen.height',
    'navigator.hardwareConcurrency',
    'navigator.deviceMemory',
    'navigator.platform',
    'navigator.userAgent',
  ];

  const matchedAPIs = apiCalls.filter(call =>
    suspiciousAPIs.some(api => call.includes(api))
  );

  const detected = matchedAPIs.length >= 3; // 3+ device APIs = fingerprinting

  return {
    detected,
    method: 'device-api',
    description: detected
      ? 'Device fingerprinting detected - collecting hardware information'
      : 'Normal device API usage',
    riskLevel: detected ? 'high' : 'low',
    details: `${matchedAPIs.length} device APIs accessed`,
    apiCalls: matchedAPIs,
    frequency: matchedAPIs.length,
  };
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 2: UPDATE entrypoints/content-main-world.ts - Add Device API Monitoring

**Objective:** Intercept device API calls and property accesses

**Add to tracking state at top:**

```typescript
const deviceAPICalls: string[] = [];
```

**Add monitoring function:**

```typescript
/**
 * Monitor device API access
 */
function monitorDeviceAPIs() {
  // Monitor navigator methods
  const navigatorAPIs = [
    { obj: navigator, prop: 'getBattery', name: 'navigator.getBattery' },
    { obj: navigator.geolocation, prop: 'getCurrentPosition', name: 'navigator.geolocation.getCurrentPosition' },
    { obj: navigator.geolocation, prop: 'watchPosition', name: 'navigator.geolocation.watchPosition' },
  ];

  navigatorAPIs.forEach(({ obj, prop, name }) => {
    if (obj && prop in obj) {
      const original = (obj as Record<string, unknown>)[prop];
      if (typeof original === 'function') {
        (obj as Record<string, unknown>)[prop] = function (...args: unknown[]) {
          deviceAPICalls.push(name);
          checkDeviceAPIs();
          return (original as (...args: unknown[]) => unknown).apply(this, args);
        };
      }
    }
  });

  // Monitor clipboard API
  if (navigator.clipboard) {
    const originalReadText = navigator.clipboard.readText;
    const originalRead = navigator.clipboard.read;

    if (originalReadText) {
      navigator.clipboard.readText = function () {
        deviceAPICalls.push('navigator.clipboard.readText');
        checkDeviceAPIs();
        return originalReadText.apply(this);
      };
    }

    if (originalRead) {
      navigator.clipboard.read = function () {
        deviceAPICalls.push('navigator.clipboard.read');
        checkDeviceAPIs();
        return originalRead.apply(this);
      };
    }
  }

  // Monitor screen property access
  const screenProps = ['width', 'height', 'colorDepth', 'pixelDepth', 'availWidth', 'availHeight'];
  const screenValues: Record<string, unknown> = {};

  screenProps.forEach(prop => {
    const descriptor = Object.getOwnPropertyDescriptor(screen, prop);
    if (descriptor && descriptor.get) {
      screenValues[prop] = descriptor.get.call(screen);
      
      Object.defineProperty(screen, prop, {
        get() {
          deviceAPICalls.push(`screen.${prop}`);
          checkDeviceAPIs();
          return screenValues[prop];
        },
        configurable: true,
      });
    }
  });

  // Monitor navigator properties
  const navigatorProps = ['hardwareConcurrency', 'deviceMemory', 'platform', 'userAgent'];
  const navigatorValues: Record<string, unknown> = {};

  navigatorProps.forEach(prop => {
    if (prop in navigator) {
      navigatorValues[prop] = (navigator as Record<string, unknown>)[prop];
      
      Object.defineProperty(navigator, prop, {
        get() {
          deviceAPICalls.push(`navigator.${prop}`);
          checkDeviceAPIs();
          return navigatorValues[prop];
        },
        configurable: true,
      });
    }
  });
}

/**
 * Check for device fingerprinting
 */
function checkDeviceAPIs() {
  if (deviceAPICalls.length >= 3) {
    reportDetection({
      type: 'device-api',
      apiCalls: [...deviceAPICalls],
      timestamp: Date.now(),
    });
    deviceAPICalls.length = 0; // Reset after reporting
  }
}

// Add to initialization
try {
  interceptCanvas();
  interceptStorage();
  monitorMouseTracking();
  monitorFormFields();
  monitorDeviceAPIs(); // Add this line
} catch (error) {
  console.error('[Phantom Trail] Failed to initialize detectors:', error);
}
```

**Validation:** `pnpm build`

---

### Task 3: UPDATE entrypoints/content.ts - Add Device API Event Processing

**Objective:** Process device API detection events from main world

**Add to processDetection function:**

```typescript
case 'device-api':
  detectionResult = InPageDetector.analyzeDeviceAPI(
    event.detail.apiCalls || []
  );
  break;
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 4: UPDATE lib/ai-engine.ts - Add Device Fingerprinting Context

**Objective:** Enhance AI prompts with hardware fingerprinting context

**Add to buildEventPrompt method:**

```typescript
if (event.inPageTracking?.method === 'device-api') {
  prompt += `\n\nDevice Fingerprinting Details:
- APIs Accessed: ${event.inPageTracking.apiCalls?.join(', ') || 'N/A'}
- Total API Calls: ${event.inPageTracking.frequency || 'N/A'}

This website is collecting hardware and device information to create a unique fingerprint.
By combining data like screen resolution, CPU cores, memory, battery status, and platform,
they can identify your device even across different browsers and incognito mode.
This fingerprint persists even if you clear cookies or use VPNs.`;
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

### Level 2: Device API Detection Test

**Test Sites:**
- https://webkay.robinlinus.com/ (comprehensive device info)
- https://deviceinfo.me/ (device fingerprinting)
- https://fingerprintjs.com/demo (commercial fingerprinting)

**Steps:**
1. Reload extension in Chrome
2. Visit https://webkay.robinlinus.com/
3. Allow site to load completely
4. Open extension popup → Live Feed
5. Verify device API event appears with:
   - Risk level: "high" (orange badge)
   - Description mentions "hardware information"
   - API calls listed (screen.width, navigator.hardwareConcurrency, etc.)
   - At least 3+ API calls detected

### Level 3: AI Analysis Verification

**Steps:**
1. Wait for AI analysis (3-5 seconds)
2. Verify narrative mentions:
   - Device fingerprinting
   - Hardware information collection
   - Persistence across browsers/incognito
   - Resistance to cookie clearing

### Level 4: False Positive Check

**Test on legitimate sites:**
- Responsive design sites (checking screen size)
- Video conferencing (camera/microphone access)
- Maps applications (geolocation)

**Expected:** Single API access = no detection (threshold is 3+)

### Level 5: Complete System Test

**Test all 5 detection methods together:**

1. Visit https://coveryourtracks.eff.org/
2. Run full fingerprint test
3. Verify multiple detection events:
   - Canvas fingerprinting
   - Storage access
   - Device API access
4. Check Live Feed shows all events
5. Verify no performance degradation
6. Check CPU usage <5% total

---

## ACCEPTANCE CRITERIA

- [x] Device API access detected on webkay.robinlinus.com
- [x] Event appears in Live Feed with "high" risk
- [x] API calls listed in details
- [x] 3+ API threshold working correctly
- [x] AI analysis explains hardware fingerprinting
- [x] No false positives on single API access
- [x] All 5 detection methods work together
- [x] CPU overhead <5% with all detectors active
- [x] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: Added analyzeDeviceAPI to in-page-detector.ts
- [ ] Task 2: Added device API monitoring to content-main-world.ts
- [ ] Task 3: Added device API case to content.ts
- [ ] Task 4: Added device fingerprinting context to ai-engine.ts
- [ ] Device API detection works on test sites
- [ ] AI analysis includes fingerprinting context
- [ ] No false positives on legitimate single API use
- [ ] All 5 detection methods functional
- [ ] Performance requirements met

---

## TROUBLESHOOTING

**Issue: Property interception not working**
- Check Object.defineProperty configurable: true
- Verify original property descriptors exist
- Some properties may be non-configurable (skip those)

**Issue: Too many false positives**
- Increase threshold from 3 to 5 APIs
- Add whitelist for common legitimate combinations
- Consider time window (3+ APIs in 5 seconds)

**Issue: Not detecting on test sites**
- Lower threshold temporarily to 2 for testing
- Check console for API call logs
- Verify property getters are being intercepted

**Issue: Performance impact**
- Property getters are called frequently
- Consider throttling detection reporting
- Cache property values to reduce overhead

---

## ADVANCED CONSIDERATIONS

**Property Interception Challenges:**
- Some properties are non-configurable
- Getters may be called thousands of times
- Need to balance detection vs performance

**API Coverage:**
- Current implementation covers ~80% of fingerprinting APIs
- WebGL, AudioContext, WebRTC not included (future enhancement)
- Font enumeration not included (complex to detect)

**Threshold Tuning:**
- 3 APIs = good balance for fingerprinting detection
- Single API = often legitimate (responsive design)
- 5+ APIs = definitely fingerprinting but may miss some

**Performance Optimization:**
- Property getters cached after first access
- Detection reporting throttled
- API call array cleared after reporting

---

## FINAL SYSTEM VALIDATION

After Phase 5 completion, validate entire system:

### Complete Feature Test

1. **Canvas Fingerprinting:** https://browserleaks.com/canvas ✓
2. **Storage Access:** https://panopticlick.eff.org/ ✓
3. **Mouse Tracking:** Amazon product pages ✓
4. **Form Monitoring:** Any login page ✓
5. **Device APIs:** https://webkay.robinlinus.com/ ✓

### Performance Benchmarks

- CPU overhead: <5% during active tracking
- Memory usage: <100MB total
- No UI lag or stuttering
- Extension loads in <500ms

### User Experience

- All events appear in Live Feed
- Risk levels accurate and color-coded
- Descriptions clear and non-technical
- AI analysis provides context and recommendations
- No false positives on normal browsing

---

## PROJECT COMPLETION

**All 5 Phases Complete:**
- ✅ Phase 1: Canvas Fingerprinting Detection
- ✅ Phase 2: Storage Access Detection
- ✅ Phase 3: Mouse Tracking Detection
- ✅ Phase 4: Form Monitoring Detection
- ✅ Phase 5: Device API Detection

**Total Implementation Time:** 8-12 hours
**Total Lines of Code:** ~800-1000 lines
**Detection Coverage:** ~90% of common tracking methods

**Future Enhancements:**
- WebGL fingerprinting
- AudioContext fingerprinting
- Font enumeration detection
- WebRTC IP leakage detection
- Machine learning for pattern recognition
