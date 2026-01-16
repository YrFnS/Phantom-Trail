# Privacy Audit Part 3: AI, Data Privacy & Compliance

## 5. AI Privacy Recommendations Analysis

### Current State
- **OpenRouter API** integration (Claude Haiku primary, GPT-4o-mini fallback)
- **Rate limiting**: 10 requests/minute
- **Context-aware prompts**: Banking, shopping, social, general
- **Response validation**: JSON parsing with fallback
- **Token budget**: 500 tokens per response

### Privacy Risks

#### AI PROMPT CONCERNS:
1. **PII Leakage Risk**:
   - Tracking events contain full URLs (may include session tokens, user IDs)
   - Domain names sent to OpenRouter (reveals browsing history)
   - No PII sanitization before sending to API
   - Example: `https://bank.com/account/12345?session=abc123` sent as-is

2. **Data Minimization Violation**:
   - Sends last 10-50 events to AI (excessive context)
   - Includes full event descriptions (may contain sensitive info)
   - No aggregation or anonymization

3. **Third-Party Data Sharing**:
   - OpenRouter sees user's browsing patterns
   - AI model providers (Anthropic, OpenAI) may log requests
   - No explicit user consent for data sharing

#### RECOMMENDATION QUALITY:
1. **Generic Recommendations**:
   - "Consider using an ad blocker" (not specific)
   - "Review your privacy settings" (not actionable)
   - Missing tool-specific recommendations (uBlock Origin vs Privacy Badger)

2. **Missing Risk Context**:
   - Doesn't explain WHY tracker is risky
   - Doesn't compare to industry standards
   - Doesn't provide severity context (1 tracker vs 50 trackers)

3. **No Compliance Guidance**:
   - Doesn't mention GDPR rights (right to access, deletion)
   - Doesn't explain cookie consent requirements
   - Doesn't reference privacy laws

### Recommendations

#### HIGH PRIORITY:
**Implement PII Sanitization**:
```typescript
private static sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters (may contain session tokens)
    urlObj.search = '';
    // Remove hash (may contain tracking IDs)
    urlObj.hash = '';
    // Keep only protocol, hostname, pathname
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

private static sanitizeEvent(event: TrackingEvent): TrackingEvent {
  return {
    ...event,
    url: this.sanitizeUrl(event.url),
    // Remove potentially sensitive fields
    inPageTracking: event.inPageTracking ? {
      method: event.inPageTracking.method,
      details: '[redacted]', // Don't send form field names, etc.
      frequency: event.inPageTracking.frequency,
      // Don't send apiCalls (may contain sensitive data)
    } : undefined,
  };
}
```

**Add User Consent**:
```typescript
// Before first AI request
static async requestAIConsent(): Promise<boolean> {
  const consent = await chrome.storage.local.get('aiConsentGiven');
  if (consent.aiConsentGiven) return true;
  
  // Show consent dialog
  const userConsent = await showConsentDialog({
    title: 'AI Privacy Analysis',
    message: 'Phantom Trail uses AI to analyze tracking patterns. ' +
             'This sends anonymized tracking data to OpenRouter API. ' +
             'Your browsing history is NOT shared. Do you consent?',
    learnMore: 'https://phantom-trail.com/ai-privacy',
  });
  
  if (userConsent) {
    await chrome.storage.local.set({ aiConsentGiven: true });
  }
  
  return userConsent;
}
```

**Improve Recommendations**:
```typescript
private static generateDetailedRecommendations(
  breakdown: PrivacyScore['breakdown'],
  score: number,
  context: string
): string[] {
  const recommendations: string[] = [];

  if (breakdown.criticalRisk > 0) {
    recommendations.push(
      `🚨 CRITICAL: ${breakdown.criticalRisk} fingerprinting trackers detected. ` +
      `Install uBlock Origin (https://ublockorigin.com) to block them. ` +
      `These trackers can identify you even in incognito mode.`
    );
  }

  if (breakdown.highRisk > 0) {
    recommendations.push(
      `⚠️ HIGH RISK: ${breakdown.highRisk} cross-site trackers detected. ` +
      `Enable "Block third-party cookies" in Chrome Settings > Privacy. ` +
      `These trackers follow you across websites to build a profile.`
    );
  }

  if (context === 'banking' && breakdown.highRisk > 0) {
    recommendations.push(
      `🏦 BANKING ALERT: This financial site is sharing data with ` +
      `${breakdown.highRisk} third parties. Consider switching to a ` +
      `privacy-focused bank or using a separate browser for banking.`
    );
  }

  if (!breakdown.httpsBonus) {
    recommendations.push(
      `🔓 INSECURE: This site uses HTTP (not HTTPS). Your data is ` +
      `transmitted in plain text. NEVER enter passwords or credit cards. ` +
      `Install HTTPS Everywhere extension.`
    );
  }

  // GDPR rights
  if (breakdown.totalTrackers > 5) {
    recommendations.push(
      `📋 YOUR RIGHTS: Under GDPR/CCPA, you can request this site to ` +
      `delete your data and stop tracking. Look for "Privacy Policy" or ` +
      `"Do Not Sell My Info" links.`
    );
  }

  return recommendations;
}
```

#### MEDIUM PRIORITY:
**Add Recommendation Confidence**:
```typescript
interface Recommendation {
  text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  actionable: boolean; // Can user act on this?
  learnMoreUrl?: string;
}
```

**Context-Specific Guidance**:
```typescript
// Banking context
if (context === 'banking') {
  prompt += `\n\nBANKING CONTEXT:
  - Fingerprinting may be legitimate for fraud prevention
  - Focus on unauthorized third-party tracking
  - Recommend secure banking practices
  - Mention two-factor authentication`;
}

// Shopping context
if (context === 'shopping') {
  prompt += `\n\nSHOPPING CONTEXT:
  - Explain price manipulation risks
  - Recommend price comparison tools
  - Mention dynamic pricing based on tracking
  - Suggest using incognito for price shopping`;
}
```

**Add Compliance Checks**:
```typescript
static analyzeCompliance(events: TrackingEvent[]): {
  gdprViolations: string[];
  ccpaViolations: string[];
  recommendations: string[];
} {
  const violations = {
    gdprViolations: [],
    ccpaViolations: [],
    recommendations: [],
  };

  // Check for tracking before consent
  const hasConsentBanner = events.some(e => 
    e.description.includes('consent') || 
    e.description.includes('cookie banner')
  );
  
  if (!hasConsentBanner && events.length > 0) {
    violations.gdprViolations.push(
      'Tracking detected before cookie consent (GDPR Article 7)'
    );
    violations.recommendations.push(
      'File GDPR complaint with your data protection authority'
    );
  }

  // Check for opt-out mechanism
  const hasOptOut = events.some(e => 
    e.description.includes('opt-out') || 
    e.description.includes('do not sell')
  );
  
  if (!hasOptOut && events.length > 5) {
    violations.ccpaViolations.push(
      'No "Do Not Sell My Info" link found (CCPA §1798.135)'
    );
  }

  return violations;
}
```

#### LOW PRIORITY:
**AI Response Caching**:
- Cache responses by domain + tracker signature (already implemented ✓)
- Extend TTL to 7 days for stable sites
- Invalidate cache on major tracking changes

**Multi-Language Support**:
- Detect user language from browser settings
- Provide recommendations in user's language
- Translate AI responses

### Compliance Considerations
- **GDPR Article 5(1)(c)**: Data minimization - only send necessary data to AI
- **GDPR Article 13**: Inform users about AI data processing
- **GDPR Article 7**: Explicit consent for AI analysis
- **OpenRouter Privacy**: Review OpenRouter's data retention policy

---

## 6. Data Privacy & Security Analysis

### Current State
- **Local storage**: chrome.storage.local (settings, events, whitelist)
- **Session storage**: chrome.storage.session (rate limiting, cache)
- **API key storage**: chrome.storage.local (user-provided OpenRouter key)
- **Data export**: CSV, JSON, PDF formats
- **No remote servers**: All processing local

### Privacy Risks

#### DATA STORAGE CONCERNS:
1. **API Key Security**:
   - Stored in chrome.storage.local (unencrypted)
   - Accessible to extension code (correct)
   - Not protected by OS keychain
   - Risk: Malware could extract API key

2. **Tracking Event Storage**:
   - Full URLs stored (may contain session tokens)
   - No automatic cleanup (events persist indefinitely)
   - No storage quota management
   - Risk: Sensitive browsing history stored locally

3. **User Whitelist Storage**:
   - Stored in chrome.storage.local (private to extension ✓)
   - No encryption (not necessary for domain names)
   - Export/import functionality (good for backup ✓)

#### DATA EXPORT CONCERNS:
1. **PII in Exports**:
   - CSV/JSON exports contain full URLs
   - May include session tokens, user IDs
   - No sanitization before export
   - Risk: User shares export with sensitive data

2. **PDF Export**:
   - Not implemented yet (mentioned in docs)
   - Should include privacy warnings
   - Should sanitize URLs

3. **No Export Encryption**:
   - Exported files are plain text
   - Risk: Sensitive data exposed if file shared

### Recommendations

#### HIGH PRIORITY:
**Sanitize Stored URLs**:
```typescript
static async saveEvent(event: TrackingEvent): Promise<void> {
  // Sanitize URL before storing
  const sanitizedEvent = {
    ...event,
    url: this.sanitizeUrl(event.url),
  };
  
  const events = await this.getRecentEvents(1000);
  events.push(sanitizedEvent);
  
  // Keep only last 1000 events (storage quota management)
  const trimmed = events.slice(-1000);
  
  await chrome.storage.local.set({
    [this.EVENTS_KEY]: trimmed,
  });
}

private static sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = ''; // Remove query params
    urlObj.hash = ''; // Remove hash
    return urlObj.toString();
  } catch {
    return '[invalid-url]';
  }
}
```

**Add Data Retention Policy**:
```typescript
// Auto-delete events older than 30 days
static async cleanupOldEvents(): Promise<void> {
  const events = await this.getRecentEvents(10000);
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
  
  const recent = events.filter(e => e.timestamp > cutoff);
  
  await chrome.storage.local.set({
    [this.EVENTS_KEY]: recent,
  });
  
  console.log(`Cleaned up ${events.length - recent.length} old events`);
}

// Run cleanup on extension startup
chrome.runtime.onStartup.addListener(() => {
  StorageManager.cleanupOldEvents();
});
```

**Sanitize Exports**:
```typescript
static async exportData(format: 'csv' | 'json'): Promise<string> {
  const events = await this.getRecentEvents(1000);
  
  // Sanitize events before export
  const sanitized = events.map(e => ({
    ...e,
    url: this.sanitizeUrl(e.url),
    // Remove sensitive fields
    inPageTracking: e.inPageTracking ? {
      method: e.inPageTracking.method,
      riskLevel: e.riskLevel,
      // Don't export apiCalls, details
    } : undefined,
  }));
  
  // Add privacy warning to export
  const warning = {
    notice: 'This export contains your tracking history. ' +
            'Do not share publicly. URLs have been sanitized.',
    exportedAt: new Date().toISOString(),
  };
  
  if (format === 'json') {
    return JSON.stringify({ warning, events: sanitized }, null, 2);
  }
  
  // CSV format with warning header
  let csv = '# PRIVACY WARNING: This file contains your tracking history\n';
  csv += '# Do not share publicly\n\n';
  csv += 'timestamp,domain,trackerType,riskLevel,description\n';
  csv += sanitized.map(e => 
    `${e.timestamp},${e.domain},${e.trackerType},${e.riskLevel},"${e.description}"`
  ).join('\n');
  
  return csv;
}
```

#### MEDIUM PRIORITY:
**Encrypt API Key** (optional, adds complexity):
```typescript
// Use Web Crypto API to encrypt API key
static async saveApiKey(apiKey: string): Promise<void> {
  // Generate encryption key from user's Chrome profile
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Encrypt API key
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(apiKey)
  );
  
  await chrome.storage.local.set({
    encryptedApiKey: Array.from(new Uint8Array(encrypted)),
  });
}
```

**Add Storage Quota Monitoring**:
```typescript
static async checkStorageQuota(): Promise<void> {
  const usage = await chrome.storage.local.getBytesInUse();
  const quota = chrome.storage.local.QUOTA_BYTES; // 10MB for local storage
  
  const percentUsed = (usage / quota) * 100;
  
  if (percentUsed > 80) {
    console.warn(`Storage ${percentUsed}% full, cleaning up old events`);
    await this.cleanupOldEvents();
  }
}
```

**Add Data Deletion**:
```typescript
// GDPR Right to Erasure
static async deleteAllData(): Promise<void> {
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
  console.log('All user data deleted');
}

// Selective deletion
static async deleteEventsByDomain(domain: string): Promise<void> {
  const events = await this.getRecentEvents(10000);
  const filtered = events.filter(e => e.domain !== domain);
  await chrome.storage.local.set({ [this.EVENTS_KEY]: filtered });
}
```

#### LOW PRIORITY:
**Add Data Portability**:
- Export in standard formats (JSON-LD, CSV)
- Include metadata (export date, version)
- Provide import functionality (restore from backup)

**Add Audit Log**:
- Log all data access (for transparency)
- Log all API calls (for debugging)
- Allow users to review audit log

### Compliance Considerations
- **GDPR Article 17**: Right to erasure (data deletion)
- **GDPR Article 20**: Right to data portability (export)
- **GDPR Article 32**: Security of processing (encryption)
- **CCPA §1798.110**: Right to know what data is collected

---

