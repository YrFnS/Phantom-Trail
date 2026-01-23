# Phantom Trail User Guide

**Version 1.0** | Last Updated: January 16, 2026

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Interface](#understanding-the-interface)
3. [Features Guide](#features-guide)
4. [Privacy Settings](#privacy-settings)
5. [Interpreting Results](#interpreting-results)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Getting Started

### Installation

1. **Download the Extension**
   - Visit Chrome Web Store (link coming soon)
   - Click "Add to Chrome"
   - Confirm installation

2. **Initial Setup** (Optional)
   - Click the Phantom Trail icon in your browser toolbar
   - Go to Settings (gear icon)
   - Add your OpenRouter API key for AI features (optional - extension works without it)

3. **Start Browsing**
   - The extension automatically monitors tracking in the background
   - Click the icon to see what's being tracked

### First-Time Users

**What You'll See:**

- A live feed of tracking events as they happen
- Privacy scores for the current website
- A network graph showing data flows

**No Setup Required:**

- Basic tracker detection works immediately
- AI features require an API key (free tier available at openrouter.ai)

---

## Understanding the Interface

### Main Tabs

#### 1. Live Feed

**What it shows:** Real-time list of tracking events as they happen

**How to read it:**

- **Green badges** = Low risk (analytics, performance monitoring)
- **Yellow badges** = Medium risk (behavioral tracking)
- **Orange badges** = High risk (cross-site tracking)
- **Red badges** = Critical risk (fingerprinting, keylogging)

**Example:**

```
🔴 CRITICAL: Canvas Fingerprinting
doubleclick.net is creating a unique browser fingerprint
Detected: 2 minutes ago
```

#### 2. Network Graph

**What it shows:** Visual map of where your data flows

**How to read it:**

- **Circles (nodes)** = Websites and trackers
- **Lines (edges)** = Data connections
- **Colors** = Risk levels (same as Live Feed)
- **Click a node** = Highlight its connections

**Example:**
Your visit to `news.com` → sends data to → `google-analytics.com`, `facebook.com`, `doubleclick.net`

#### 3. Dashboard

**What it shows:** Privacy metrics and trends

**Key Metrics:**

- **Overall Risk Score** (0-100, higher = riskier)
- **Risk Distribution** (pie chart of risk levels)
- **Risk Trend** (line chart over last 12 hours)
- **Top Trackers** (most frequent trackers)

**Privacy Score Grades:**

- **A (90-100)**: Excellent privacy
- **B (80-89)**: Good privacy
- **C (70-79)**: Fair privacy
- **D (60-69)**: Poor privacy
- **F (0-59)**: Very poor privacy

#### 4. Chat

**What it shows:** AI-powered Q&A about your privacy

**Example Questions:**

- "What did Google learn about me today?"
- "Is this website trustworthy?"
- "Why is my privacy score low?"
- "What trackers are most dangerous?"

---

## Features Guide

### Privacy Scores

**Two Scores Displayed:**

1. **Current Site Score**
   - Privacy score for the website you're currently on
   - Updates in real-time as you browse
   - Shows domain name and event count

2. **Recent Activity Score**
   - Overall privacy score across all recent browsing
   - Based on last 100 tracking events
   - Shows total events tracked

**What Affects Your Score:**

- ✅ **HTTPS** = +5 points
- ❌ **Critical Risk Trackers** = -25 points each
- ❌ **High Risk Trackers** = -15 points each
- ❌ **Medium Risk Trackers** = -8 points each
- ❌ **Low Risk Trackers** = -3 points each
- ❌ **Excessive Tracking** (10+ trackers) = -10 points

### Export Your Data

**Why Export:**

- Keep records of tracking activity
- Share with privacy advocates
- Analyze patterns over time

**How to Export:**

1. Click "Export" button in top-right
2. Choose format:
   - **CSV** = Spreadsheet-friendly
   - **JSON** = Developer-friendly
   - **PDF** = Human-readable report
3. File downloads automatically

**What's Included:**

- All tracking events with timestamps
- Tracker names and types
- Risk levels and URLs
- Privacy score breakdown

### Trusted Sites

**What Are Trusted Sites:**
Sites where tracking is expected and legitimate (e.g., your bank using fingerprinting for security)

**Three Types:**

1. **Default Trusted Sites** (built-in)
   - Major banks, payment processors
   - Government websites
   - Healthcare portals

2. **Your Trusted Sites** (you add)
   - Personal banking sites
   - Work applications
   - Trusted services

3. **Auto-Detected** (smart detection)
   - Login pages
   - Banking sites
   - Payment checkouts

**How to Add Trusted Sites:**

1. Go to Settings → Trusted Sites tab
2. Click "Add Trusted Site"
3. Enter domain (e.g., `mybank.com`)
4. Optionally specify allowed tracking methods
5. Choose if temporary (session-only)

**Managing Trusted Sites:**

- **View List**: See all trusted sites
- **Remove**: Click X next to any site
- **Export/Import**: Backup or share your list

---

## Privacy Settings

### General Settings

**API Key Configuration:**

- Required for AI features (narrative, chat, recommendations)
- Get free key at openrouter.ai
- Stored locally (never sent to our servers)

**AI Model Selection:**

- **Claude Haiku** (default) = Fast, cost-effective
- **GPT-4o-mini** = Alternative option
- **Nemotron** = Free tier option

### Trusted Sites Settings

**Current Page Context:**
Shows why a site might be auto-trusted:

- **Security Context**: Login page, banking, payment
- **Confidence Level**: Low, Medium, High
- **Detection Reason**: URL patterns, password fields, keywords

**Whitelist Management:**

- Add/remove trusted sites
- Export whitelist (JSON backup)
- Import whitelist (restore from backup)

---

## Interpreting Results

### Understanding Risk Levels

#### 🟢 Low Risk

**What it means:** Normal website functionality
**Examples:**

- Google Analytics (page views)
- Performance monitoring
- Error tracking

**Should you worry?** No - this is standard website operation

#### 🟡 Medium Risk

**What it means:** Behavioral tracking
**Examples:**

- Mouse movement tracking
- Scroll depth monitoring
- Session recording

**Should you worry?** Depends on the website - expected on e-commerce, concerning on news sites

#### 🟠 High Risk

**What it means:** Cross-site tracking
**Examples:**

- Facebook Pixel
- Google DoubleClick
- Third-party cookies

**Should you worry?** Yes - your data is being shared across websites

#### 🔴 Critical Risk

**What it means:** Invasive tracking
**Examples:**

- Canvas fingerprinting
- Device fingerprinting
- Keylogging on forms

**Should you worry?** Yes - take action (see recommendations)

### AI Recommendations

**When You See Recommendations:**

- Privacy score drops below 70
- Critical risk trackers detected
- Unusual tracking patterns

**Common Recommendations:**

1. **Install Privacy Tools**
   - uBlock Origin (ad/tracker blocker)
   - Privacy Badger (intelligent blocking)
   - HTTPS Everywhere (secure connections)

2. **Browser Settings**
   - Enable "Do Not Track"
   - Block third-party cookies
   - Use private browsing mode

3. **Website Actions**
   - Clear cookies for this site
   - Avoid entering sensitive data
   - Consider alternative websites

---

## Troubleshooting

### Extension Not Working

**Symptoms:** No tracking events appear

**Solutions:**

1. Refresh the page you're monitoring
2. Check if extension is enabled (chrome://extensions)
3. Ensure you're on a real website (not chrome:// pages)
4. Try a different website (e.g., cnn.com)

### AI Features Not Working

**Symptoms:** No AI narrative or chat responses

**Solutions:**

1. Check if API key is configured (Settings → General)
2. Verify API key is valid (test at openrouter.ai)
3. Check internet connection
4. Try different AI model (Settings → General)

### High CPU Usage

**Symptoms:** Browser feels slow

**Solutions:**

1. Extension should use <5% CPU normally
2. Close unused tabs
3. Disable extension temporarily
4. Report issue if persistent

### Privacy Score Seems Wrong

**Symptoms:** Score doesn't match expectations

**Solutions:**

1. Check both scores (Current Site vs Recent Activity)
2. Current Site score is domain-specific
3. Recent Activity score includes all recent browsing
4. Export data to see detailed breakdown

---

## FAQ

### General Questions

**Q: Does Phantom Trail block trackers?**
A: No, we only detect and explain tracking. Use uBlock Origin or Privacy Badger for blocking.

**Q: Is my data sent to your servers?**
A: No, all processing happens locally. Only AI features use external API (OpenRouter) with your key.

**Q: Do I need an API key?**
A: No, basic tracker detection works without it. AI features (narrative, chat) require a key.

**Q: How much does the API key cost?**
A: OpenRouter has free tier. Estimated cost: $0.001-0.02 per day depending on usage.

**Q: Can I use this on mobile?**
A: Not yet - Chrome extensions are desktop-only. Mobile version planned.

### Privacy Questions

**Q: What data does Phantom Trail collect?**
A: None. All data stays on your device. We don't have servers to collect data.

**Q: Is my browsing history tracked?**
A: No, we only analyze tracking events, not your browsing history.

**Q: Can websites detect Phantom Trail?**
A: Technically yes (like any extension), but we don't interfere with website functionality.

**Q: Should I trust the AI recommendations?**
A: Yes, but verify. AI provides general privacy advice, not legal counsel.

### Technical Questions

**Q: Why does the extension need these permissions?**

- `webRequest`: Monitor network requests for tracker detection
- `storage`: Save settings and tracking history locally
- `activeTab`: Analyze current page for in-page tracking

**Q: What's the difference between network and in-page tracking?**

- **Network tracking**: Requests to third-party domains (e.g., google-analytics.com)
- **In-page tracking**: JavaScript on the page (e.g., canvas fingerprinting)

**Q: How accurate is tracker detection?**
A: 90%+ on top websites. We use EasyList, Disconnect.me, and pattern matching.

**Q: Can I contribute to the tracker database?**
A: Yes! Project is open source. Submit issues or PRs on GitHub.

---

## Getting Help

### Support Channels

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check README.md and technical docs
- **Community**: Join discussions on GitHub

### Reporting Issues

**Include:**

1. Chrome version
2. Extension version
3. Steps to reproduce
4. Screenshots (if applicable)
5. Console errors (F12 → Console)

### Feature Requests

**We'd love to hear:**

- What features would help you?
- What's confusing or unclear?
- What trackers are we missing?

---

## Privacy Tips

### Best Practices

1. **Check Privacy Scores Regularly**
   - Monitor trends over time
   - Investigate sudden drops

2. **Review Top Trackers**
   - Identify persistent trackers
   - Consider blocking repeat offenders

3. **Use Trusted Sites Wisely**
   - Only trust sites you actually trust
   - Review list periodically

4. **Export Data Monthly**
   - Keep records of tracking activity
   - Analyze patterns over time

5. **Combine with Other Tools**
   - Use uBlock Origin for blocking
   - Use Privacy Badger for intelligent blocking
   - Use HTTPS Everywhere for security

### When to Take Action

**Immediate Action Required:**

- 🔴 Critical risk on banking/financial sites
- 🔴 Keylogging detected on login forms
- 🔴 Device fingerprinting on sensitive sites

**Consider Action:**

- 🟠 High risk on news/content sites
- 🟠 Cross-site tracking across multiple sites
- 🟡 Excessive behavioral tracking

**Monitor:**

- 🟢 Low risk tracking
- 🟢 Expected analytics on trusted sites

---

**Need More Help?** Check our [GitHub repository](https://github.com/YrFnS/Phantom-Trail) or open an issue.

**Stay Private!** 👻
