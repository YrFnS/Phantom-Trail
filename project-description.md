**1. Project Name:** 
**"Phantom Trail"** 

**2. Project Description:**
**We are building Phantom Trail, an AI-native Chrome extension that makes invisible data collection visible in real-time.**

Every time you browse the web, dozens of companies are silently tracking your clicks, reading your behavior, and selling your data—but you never see it happening. Phantom Trail changes that.

**What it does:**

Phantom Trail continuously monitors your browsing activity and uses AI to analyze and explain data collection as it happens. Instead of showing you raw technical logs, it acts like a privacy guardian sitting beside you, narrating what's really going on behind the scenes.

When you visit a news article, Phantom Trail instantly detects that 23 trackers just activated—Google Analytics is logging your reading time, Facebook knows you're interested in politics, and a data broker you've never heard of just received your device fingerprint. The extension shows you this in plain English, in real-time.

**Key features:**

- **Live AI Narrative**: A conversational feed that explains what's happening as you browse: "Amazon just tracked your mouse movements on this product page" or "This site is sharing your email hash with 5 advertisers—this is unusual."

- **Proactive Risk Assessment**: The AI automatically scores each tracking event and alerts you to suspicious activity: "⚠️ High Risk: This banking site is leaking data to advertising networks."

- **Natural Language Interface**: Ask questions like "What did Google learn about me today?" or "Is this website trustworthy?" and get instant, contextual answers.

- **Pattern Detection**: The AI identifies cross-site tracking patterns and learns what's normal for your browsing vs. what's anomalous, even catching new tracking techniques not in any database.

- **Visual Network Map**: See exactly where your data flows—from the site you're on, through ad networks, to data brokers and foreign servers.

**Why it matters:**

Most privacy tools just block trackers or show technical logs. Phantom Trail uses AI to make the invisible ecosystem of surveillance actually understandable. It's not just about blocking—it's about awareness and informed consent.

**Technical approach:**

Built as a Chrome extension using `chrome.webRequest` API to intercept network traffic, content scripts to detect in-page tracking, and integrated with OpenRouter's AI API for real-time analysis and natural language explanations. The AI doesn't just classify trackers—it understands context, detects patterns, and communicates in plain English.

**The vision:**

In a world where your data is constantly being collected, Phantom Trail gives you eyes to see it happening and the intelligence to understand what it means. It's like having a privacy expert whispering in your ear as you browse.

**3. Target Users:**
- **Primary**: Privacy-conscious everyday internet users (18-45 years old) who want to understand what's happening behind the scenes when they browse
- **Secondary**: Tech-savvy users, security researchers, and developers who want deep insights into tracking mechanisms
- **Need**: Most people know they're being tracked but have no idea by whom, for what, or where their data goes. They want **awareness without overwhelm**—clear, actionable information, not technical jargon.

**4. Main Technology:**
**WXT Framework** (Next-gen browser extension framework)
- **Why WXT over Plasmo**: Based on 2026 research, WXT has established itself as the leading framework with active maintenance, while Plasmo "appears to be in maintenance mode with little to no maintainers or feature development"
- Built on **Vite** for lightning-fast HMR and modern dev experience
- Framework-agnostic with "Nuxt-like auto-imports"

---

## **Optional Details:**

**5. Architecture:**

**Frontend Stack:**
- **Framework**: WXT (Vite-based, Manifest V3)
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: 
  - Vis.js for network graphs (data flow visualization)
  - Chart.js for risk scores and metrics
- **State Management**: Zustand (lightweight, React-native)

**Backend/Core:**
- **Service Worker**: Vanilla TypeScript (background processing)
- **Chrome APIs**:
  - `chrome.webRequest` - Intercept network requests
  - `chrome.storage.local` - Persistent data storage
  - `chrome.tabs` - Tab management
  - `chrome.notifications` - Proactive alerts
  - `chrome.declarativeNetRequest` - Optional request blocking

**AI Integration:**
- **API Provider**: OpenRouter (unified AI access)
- **Primary Models**:
  - Claude Haiku via OpenRouter - Fast, cost-effective real-time analysis (~$0.25 per 1M input tokens)
  - GPT-4o-mini - Backup for pattern detection
- **Features**: 
  - Streaming responses via Server-Sent Events (SSE)
  - Real-time AI narration
  - Context-aware analysis
  - Natural language query interface

**Data Sources (Free):**
- EasyList/EasyPrivacy (tracker databases)
- Disconnect.me lists (tracker categorization)
- ipapi.co (IP geolocation - 1000/day free)

**Project Structure (WXT):**
```
phantom-trail/
├── wxt.config.ts              # WXT configuration
├── entrypoints/
│   ├── background.ts          # Service worker
│   ├── popup/
│   │   ├── App.tsx           # Main popup UI
│   │   └── main.tsx
│   ├── content.ts            # Content scripts
│   └── sidepanel/            # Optional side panel
├── components/
│   ├── LiveNarrative.tsx
│   ├── NetworkGraph.tsx
│   ├── ChatInterface.tsx
│   └── RiskDashboard.tsx
├── lib/
│   ├── ai-engine.ts          # OpenRouter integration
│   ├── tracker-db.json
│   └── storage-manager.ts
├── public/
│   └── icon/                 # Extension icons
└── package.json
```

**6. Special Requirements:**

**Performance:**
- Keep extension under 5MB total size
- Lazy-load AI analysis (only call API on user demand or significant events)
- Cache AI responses locally to avoid redundant API calls
- Throttle network monitoring to prevent performance impact

**Privacy & Security:**
- No remote code execution (Manifest V3 requirement)
- All data processing happens locally
- Optional: User brings their own OpenRouter API key
- Minimal permissions requested (only what's necessary)
