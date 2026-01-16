---
description: Analyze tracking patterns and provide privacy insights
---

# Tracking Analysis Prompt

Perform comprehensive analysis of tracking data to identify patterns, risks, and provide actionable privacy recommendations.

## Analysis Types

### 1. Tracker Pattern Analysis

**What to Analyze:**
- Frequency of tracker appearances
- Cross-site tracking patterns
- Tracker type distribution
- Risk level trends over time

**Questions to Answer:**
- Which trackers appear most frequently?
- Are there cross-site tracking patterns?
- What types of tracking are most common?
- How has tracking changed over time?

**Output Format:**
```markdown
# Tracker Pattern Analysis

## Top Trackers (Last 7 Days)
1. google-analytics.com - 145 occurrences (Low Risk)
2. doubleclick.net - 89 occurrences (High Risk)
3. facebook.com - 67 occurrences (High Risk)

## Cross-Site Tracking Detected
- doubleclick.net appears on 12 different domains
- facebook.com appears on 8 different domains
- Correlation: 85% of sites with doubleclick also have facebook

## Risk Distribution
- Low Risk: 45% (analytics, performance)
- Medium Risk: 25% (behavioral tracking)
- High Risk: 20% (cross-site tracking)
- Critical Risk: 10% (fingerprinting)

## Trend Analysis
- Tracking increased 15% this week
- Critical risk events up 25%
- New tracker detected: tiktok-pixel.com
```

### 2. Privacy Risk Assessment

**What to Analyze:**
- Current privacy score trends
- High-risk websites visited
- Critical tracking events
- Privacy score by website category

**Questions to Answer:**
- What's my overall privacy risk?
- Which websites are most risky?
- What critical events need attention?
- How does my privacy compare by category?

**Output Format:**
```markdown
# Privacy Risk Assessment

## Overall Risk: MEDIUM-HIGH

**Current Privacy Score:** 68/100 (D)
**7-Day Average:** 72/100 (C)
**Trend:** ⬇️ Declining

## High-Risk Websites
1. news-site.com - Score: 45/100 (F)
   - 15 high-risk trackers
   - Canvas fingerprinting detected
   - Recommendation: Use with ad blocker

2. shopping-site.com - Score: 52/100 (F)
   - 12 cross-site trackers
   - Mouse tracking detected
   - Recommendation: Clear cookies after use

## Critical Events (Last 24h)
- 3 canvas fingerprinting attempts
- 5 device fingerprinting attempts
- 2 form monitoring events on login pages

## Privacy by Category
- News Sites: 58/100 (F) - Heavy tracking
- Shopping: 65/100 (D) - Moderate tracking
- Social Media: 55/100 (F) - Extensive tracking
- Banking: 88/100 (B) - Minimal tracking (trusted)
```

### 3. Tracker Behavior Analysis

**What to Analyze:**
- What data each tracker collects
- Tracker company ownership
- Data sharing patterns
- Privacy policy compliance

**Questions to Answer:**
- What does this tracker collect?
- Who owns this tracking company?
- Where does my data go?
- Is this tracker compliant with privacy laws?

**Output Format:**
```markdown
# Tracker Behavior Analysis: doubleclick.net

## Tracker Profile
- **Owner:** Google LLC
- **Type:** Advertising Network
- **Risk Level:** High
- **Prevalence:** Found on 45% of websites visited

## Data Collection
- **Browsing History:** Yes (cross-site)
- **Device Info:** Yes (fingerprinting)
- **Location:** Yes (IP-based)
- **Interests:** Yes (behavioral profiling)

## Data Sharing
- Shared with: Google Ads, Google Analytics, 3rd-party advertisers
- Data retention: Up to 18 months
- Opt-out available: Yes (ads.google.com/preferences)

## Privacy Compliance
- GDPR: Compliant (with consent)
- CCPA: Compliant (with opt-out)
- Do Not Track: Not honored

## Recommendations
1. Use uBlock Origin to block
2. Opt out at ads.google.com/preferences
3. Clear cookies regularly
4. Consider Privacy Badger for intelligent blocking
```

### 4. Website Privacy Audit

**What to Analyze:**
- All trackers on a specific website
- Privacy score breakdown
- Comparison to similar sites
- Improvement recommendations

**Questions to Answer:**
- How private is this website?
- What trackers does it use?
- How does it compare to competitors?
- What can be improved?

**Output Format:**
```markdown
# Website Privacy Audit: example-news.com

## Privacy Score: 62/100 (D)

**Grade:** Below Average
**Category:** News & Media
**Comparison:** 15% worse than category average

## Trackers Detected (18 total)
### Critical Risk (2)
- canvas-fingerprint.js - Device fingerprinting
- hotjar.com - Session recording with keylogging

### High Risk (5)
- doubleclick.net - Cross-site advertising
- facebook.com - Social tracking
- twitter.com - Social tracking
- outbrain.com - Content recommendation tracking
- taboola.com - Content recommendation tracking

### Medium Risk (7)
- google-analytics.com - Behavioral analytics
- chartbeat.com - Real-time analytics
- quantcast.com - Audience measurement
- [4 more...]

### Low Risk (4)
- cloudflare.com - CDN/Performance
- newrelic.com - Performance monitoring
- [2 more...]

## Privacy Issues
1. **Excessive Tracking:** 18 trackers (industry avg: 12)
2. **Invasive Methods:** Canvas fingerprinting, session recording
3. **No Consent Banner:** Tracking starts before user consent
4. **Third-Party Overload:** 85% of trackers are third-party

## Comparison to Competitors
- competitor-news.com: 75/100 (C) - 12 trackers
- another-news.com: 82/100 (B) - 8 trackers
- example-news.com: 62/100 (D) - 18 trackers ⬅️ You are here

## Recommendations for Users
1. **Immediate:** Install uBlock Origin
2. **Important:** Clear cookies after each visit
3. **Consider:** Use RSS reader instead of visiting site
4. **Alternative:** Try competitor-news.com (better privacy)

## Recommendations for Website
1. Reduce tracker count to <10
2. Remove canvas fingerprinting
3. Implement consent banner
4. Switch to privacy-friendly analytics (e.g., Plausible)
```

### 5. Tracking Timeline Analysis

**What to Analyze:**
- Tracking events over time
- Peak tracking periods
- Correlation with browsing habits
- Anomaly detection

**Questions to Answer:**
- When am I tracked most?
- Are there unusual patterns?
- What triggers tracking spikes?
- How does tracking vary by time of day?

**Output Format:**
```markdown
# Tracking Timeline Analysis (Last 7 Days)

## Tracking Volume
- **Total Events:** 1,247
- **Daily Average:** 178 events
- **Peak Day:** Wednesday (245 events)
- **Lowest Day:** Sunday (98 events)

## Hourly Patterns
- **Peak Hours:** 2-4 PM (work hours)
- **Lowest Hours:** 2-6 AM (sleeping)
- **Pattern:** Tracking follows browsing activity

## Anomalies Detected
1. **Spike on Wednesday 2 PM**
   - 89 events in 1 hour (5x normal)
   - Cause: Visited 5 news sites in rapid succession
   - Risk: High cross-site tracking correlation

2. **Unusual Tracker: tiktok-pixel.com**
   - First seen: Thursday 3 PM
   - Frequency: 15 occurrences since
   - Risk: New tracking method, monitor closely

## Tracking by Activity
- **News Browsing:** 45% of tracking events
- **Shopping:** 30% of tracking events
- **Social Media:** 15% of tracking events
- **Other:** 10% of tracking events

## Recommendations
1. Concentrate news reading to reduce cross-site correlation
2. Use separate browser profile for shopping
3. Clear cookies after news browsing sessions
4. Monitor tiktok-pixel.com for privacy concerns
```

## Analysis Commands

### Quick Analysis
```
Analyze tracking patterns from the last 24 hours and identify top 5 trackers.
```

### Deep Dive
```
Perform comprehensive privacy risk assessment including:
- Overall privacy score trend
- High-risk websites
- Critical events
- Category-based analysis
- Actionable recommendations
```

### Specific Tracker
```
Analyze [tracker-name] behavior:
- What data it collects
- Who owns it
- Where data goes
- How to block it
```

### Website Audit
```
Audit [website-url] privacy:
- All trackers detected
- Privacy score breakdown
- Comparison to competitors
- User recommendations
```

### Timeline Analysis
```
Analyze tracking timeline for last [timeframe]:
- Volume trends
- Peak periods
- Anomalies
- Activity correlation
```

## Output Guidelines

**Always Include:**
1. **Summary:** High-level findings (2-3 sentences)
2. **Key Metrics:** Numbers and percentages
3. **Risk Assessment:** Clear risk levels
4. **Recommendations:** Actionable steps (3-5 items)
5. **Context:** Why this matters for privacy

**Use Clear Language:**
- Avoid technical jargon
- Explain acronyms (e.g., "GDPR (EU privacy law)")
- Use analogies for complex concepts
- Provide specific examples

**Prioritize Actionability:**
- Focus on what users can do
- Provide specific tools/settings
- Include links where helpful
- Rank recommendations by impact

## Integration with Extension

**Data Sources:**
- `chrome.storage.local` - Historical tracking events
- `lib/tracker-db.ts` - Tracker classification
- `lib/privacy-score.ts` - Privacy scoring algorithm
- `lib/ai-engine.ts` - AI-powered insights

**Analysis Triggers:**
- User requests analysis via chat
- Weekly automated summary
- Privacy score drops significantly
- New critical tracker detected

**Output Destinations:**
- Chat interface (conversational)
- Dashboard (visual metrics)
- Export reports (detailed analysis)
- Notifications (critical alerts)
