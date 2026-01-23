# Privacy Audit Part 2: Trusted Sites & Detection

## 3. Trusted Sites System Analysis

### Current State

- **11 default trusted sites** (hardcoded)
- **3-layer system**: Default → User → Context detection
- **Context detection**: Login, banking, payment, password fields
- **Confidence levels**: Low, medium, high (only high trusted)

### Privacy Risks

#### DEFAULT WHITELIST CONCERNS:

1. **Too Permissive**:
   - `facebook.com` NOT in trusted list (correct)
   - `accounts.google.com` trusted for fingerprinting (reasonable for auth)
   - `github.com` trusted for canvas fingerprinting (reasonable for security)

2. **Missing Legitimate Sites**:
   - Healthcare portals (HIPAA-compliant sites)
   - Government sites (.gov domains)
   - Educational institutions (.edu domains)
   - Tax preparation sites (TurboTax, H&R Block)

3. **Overly Broad Permissions**:
   - `paypal.com` allows mouse-tracking (fraud prevention, but invasive)
   - `chase.com` allows all fingerprinting methods (too broad)

#### CONTEXT DETECTION RISKS:

1. **False Positives**:
   - `/login` in URL doesn't guarantee legitimate auth (phishing sites)
   - Banking keywords can be spoofed
   - Password fields on malicious sites would be trusted

2. **Confidence Scoring Too Simple**:
   - Only checks URL patterns and DOM elements
   - Doesn't verify domain reputation
   - No certificate validation

3. **High Confidence Threshold**:
   - Requires 4+ indicators for high confidence
   - Legitimate sites might score medium and be blocked

### Recommendations

#### HIGH PRIORITY:

**Add Domain Reputation Check**:

```typescript
// Before trusting context, verify domain
static async isReputableDomain(domain: string): Promise<boolean> {
  // Check against known phishing lists
  // Verify SSL certificate
  // Check domain age (new domains = suspicious)
  return true; // Placeholder
}
```

**Expand Default Whitelist**:

```typescript
// Healthcare
{ domain: 'mychart.com', reason: 'security', ... }
{ domain: 'epic.com', reason: 'security', ... }

// Government
{ domain: '*.gov', reason: 'security', ... } // All .gov domains

// Education
{ domain: '*.edu', reason: 'security', ... } // All .edu domains

// Tax/Financial
{ domain: 'turbotax.intuit.com', reason: 'fraud-prevention', ... }
{ domain: 'hrblock.com', reason: 'fraud-prevention', ... }
```

**Restrict Allowed Methods**:

```typescript
// Be more specific about what's allowed
{
  domain: 'chase.com',
  reason: 'fraud-prevention',
  allowedMethods: ['device-api', 'canvas-fingerprint'], // Remove mouse-tracking
  description: 'Banking security measures'
}
```

#### MEDIUM PRIORITY:

**Improve Confidence Scoring**:

```typescript
// Add more indicators
- SSL certificate validation (+2 confidence)
- Domain age > 1 year (+1 confidence)
- Not in phishing database (+2 confidence)
- HTTPS only (+1 confidence)
```

**Add Temporary Trust**:

```typescript
// Allow users to trust site for current session only
{
  domain: 'example.com',
  temporary: true,
  expiresAt: Date.now() + 3600000, // 1 hour
}
```

**User Notification**:

- Notify users when site is auto-trusted by context
- Allow users to override context detection
- Show trust reason in popup

#### LOW PRIORITY:

**Whitelist Sync**:

- Sync user whitelist across devices (chrome.storage.sync)
- Export/import whitelist (already implemented ✓)
- Share whitelist with community (privacy-preserving)

### Compliance Considerations

- **GDPR Recital 47**: Legitimate interest for security fingerprinting
- **User Control**: Users must be able to override trust decisions
- **Transparency**: Show why site is trusted (already implemented ✓)

---

## 4. In-Page Tracking Detection Analysis

### Current State

- **5 detection methods**: Canvas, storage, mouse, forms, device APIs
- **Thresholds**: 3+ canvas ops, 10+ storage ops/min, 50+ mouse events/sec
- **Risk levels**: Low, medium, high, critical
- **Deduplication**: 10-second signature TTL

### Privacy Risks

#### DETECTION GAPS:

1. **Missing Tracking Methods**:
   - **WebRTC leaks** (IP address exposure) - CRITICAL
   - **Font fingerprinting** (installed fonts) - HIGH
   - **Audio fingerprinting** (AudioContext API) - HIGH
   - **WebGL fingerprinting** (GPU info) - HIGH
   - **Battery API** (battery status) - MEDIUM
   - **Clipboard access** (copy/paste monitoring) - HIGH
   - **Notification API** (permission fingerprinting) - LOW
   - **Sensor APIs** (accelerometer, gyroscope) - MEDIUM

2. **Threshold Issues**:
   - **Canvas: 3+ operations** - Too low? Legitimate canvas use might trigger
   - **Storage: 10+ ops/min** - Too high? Aggressive tracking might stay under
   - **Mouse: 50+ events/sec** - Reasonable for heatmaps
   - **Forms: Any monitoring** - Correct, but should distinguish password vs text

3. **False Positives**:
   - Canvas used for legitimate graphics (charts, games)
   - Storage used for app state (SPAs, PWAs)
   - Mouse tracking for UX improvements (scroll depth)

#### DETECTION ACCURACY:

1. **Canvas Fingerprinting**:
   - Current: Detects `getContext`, `toDataURL`, `getImageData`
   - Missing: `measureText` + `fillText` combo (common fingerprinting)
   - Missing: Hidden canvas elements (off-screen rendering)

2. **Storage Access**:
   - Current: Counts operations per minute
   - Missing: Detects supercookies (evercookie patterns)
   - Missing: IndexedDB fingerprinting

3. **Form Monitoring**:
   - Current: Detects any form field monitoring
   - Good: Flags password fields as CRITICAL ✓
   - Missing: Keystroke timing analysis (advanced keylogging)

### Recommendations

#### HIGH PRIORITY:

**Add Missing Detection Methods**:

```typescript
// WebRTC leak detection
static analyzeWebRTC(rtcCalls: string[]): DetectionResult {
  const detected = rtcCalls.some(call =>
    call.includes('RTCPeerConnection') ||
    call.includes('createDataChannel')
  );
  return {
    detected,
    method: 'webrtc-leak',
    description: 'WebRTC detected - may expose real IP address',
    riskLevel: 'critical',
    details: 'WebRTC can bypass VPN and reveal your real IP',
  };
}

// Font fingerprinting
static analyzeFontFingerprint(fonts: string[]): DetectionResult {
  const detected = fonts.length > 20; // Checking 20+ fonts = fingerprinting
  return {
    detected,
    method: 'font-fingerprint',
    description: 'Font fingerprinting detected',
    riskLevel: 'high',
    details: `${fonts.length} fonts checked`,
  };
}

// Audio fingerprinting
static analyzeAudioFingerprint(audioCalls: string[]): DetectionResult {
  const suspiciousPatterns = [
    'createOscillator',
    'createDynamicsCompressor',
    'getFloatFrequencyData'
  ];
  const detected = suspiciousPatterns.every(p =>
    audioCalls.some(call => call.includes(p))
  );
  return {
    detected,
    method: 'audio-fingerprint',
    description: 'Audio fingerprinting detected',
    riskLevel: 'high',
    details: 'Using AudioContext to generate unique audio signature',
  };
}
```

**Refine Thresholds**:

```typescript
// Canvas: Add pattern detection
private static readonly CANVAS_FINGERPRINT_PATTERNS = [
  ['fillText', 'measureText', 'toDataURL'], // Text rendering fingerprint
  ['getImageData', 'toDataURL'], // Pixel data fingerprint
  ['arc', 'fill', 'toDataURL'], // Shape rendering fingerprint
];

// Storage: Detect supercookies
private static readonly SUPERCOOKIE_PATTERNS = [
  'evercookie',
  'localStorage + sessionStorage + cookie', // Multiple storage types
  'IndexedDB + localStorage', // Persistent storage combo
];
```

**Improve Canvas Detection**:

```typescript
static analyzeCanvasFingerprint(operations: string[]): DetectionResult {
  // Check for hidden canvas (off-screen rendering)
  const hasHiddenCanvas = operations.some(op =>
    op.includes('width:0') || op.includes('height:0')
  );

  // Check for fingerprinting patterns
  const matchedPatterns = this.CANVAS_FINGERPRINT_PATTERNS.filter(pattern =>
    pattern.every(op => operations.some(o => o.includes(op)))
  );

  const detected = matchedPatterns.length > 0 ||
    (hasHiddenCanvas && operations.length >= 2);

  return {
    detected,
    method: 'canvas-fingerprint',
    description: detected
      ? `Canvas fingerprinting detected (${matchedPatterns.length} patterns)`
      : 'Normal canvas usage',
    riskLevel: detected ? 'critical' : 'low',
    details: hasHiddenCanvas
      ? 'Hidden canvas detected - likely fingerprinting'
      : `${operations.length} canvas operations`,
  };
}
```

#### MEDIUM PRIORITY:

**Add Confidence Scores**:

```typescript
interface DetectionResult {
  detected: boolean;
  confidence: number; // 0-1 (0.8+ = high confidence)
  method: InPageTrackingMethod;
  // ... rest
}
```

**Reduce False Positives**:

- Whitelist legitimate canvas libraries (Chart.js, D3.js)
- Detect SPA frameworks (React, Vue) for storage exceptions
- Allow user feedback ("This is a false positive")

**Add Detection Context**:

```typescript
// Detect if tracking is for legitimate purposes
static getTrackingContext(method: string, domain: string): string {
  if (method === 'mouse-tracking' && domain.includes('hotjar')) {
    return 'UX analytics (session recording)';
  }
  if (method === 'canvas-fingerprint' && domain.includes('bank')) {
    return 'Fraud prevention (security)';
  }
  return 'Unknown purpose';
}
```

#### LOW PRIORITY:

**Machine Learning Detection**:

- Train model on known fingerprinting patterns
- Detect novel tracking techniques
- Reduce false positives with behavioral analysis

### Compliance Considerations

- **GDPR Article 5**: Detection must be accurate (false positives = misleading users)
- **Transparency**: Users should understand why something is flagged
- **Right to Object**: Users should be able to whitelist false positives

---
