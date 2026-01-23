# 👻 Phantom Trail

**An AI-native Chrome extension that transforms invisible data collection into actionable privacy education.**

Every time you browse the web, dozens of companies silently track your clicks, read your behavior, and sell your data—but you never see it happening. Phantom Trail changes that by acting as your personal privacy coach, not only showing what's tracking you but guiding you through your privacy improvement journey with AI-powered insights and personalized recommendations.

## 🎯 Core Features

### 🤖 AI-Powered Privacy Education

- **Live AI Narrative**: Real-time explanations of tracking as it happens ("Amazon just tracked your mouse movements on this product page")
- **Smart Recommendations**: Actionable privacy advice based on detected trackers ("Install uBlock Origin for 95% tracker blocking")
- **Natural Language Chat**: Ask questions like "What did Google learn about me today?" or "Is this website trustworthy?"
- **Personalized Coaching**: AI-driven privacy journey tracking with goals, achievements, and progress monitoring

### 🛡️ Comprehensive Protection Analysis

- **Privacy Tool Detection**: Automatically detects installed privacy tools (uBlock Origin, Privacy Badger, etc.)
- **Effectiveness Analysis**: Shows how well your current setup protects you with percentage scores
- **Protection Gaps**: Identifies missed trackers and suggests improvements
- **Tool Recommendations**: One-click install buttons for missing privacy tools

### 📊 Advanced Privacy Intelligence

- **Risk Assessment**: AI scores each tracking event and alerts to suspicious activity
- **Pattern Detection**: Identifies cross-site tracking patterns and behavioral profiling attempts
- **Privacy Score**: Real-time privacy scoring with detailed breakdowns and improvement suggestions
- **Trend Analysis**: Track your privacy improvements over time with visual charts

### 🌐 Visual Data Flow Mapping

- **Network Graph**: See exactly where your data flows—from sites through ad networks to data brokers
- **Real-time Visualization**: Watch tracking happen live with animated network connections
- **Risk-based Coloring**: High-risk trackers highlighted in red, safe connections in green
- **Interactive Exploration**: Click nodes to see detailed tracker information

### 🎯 Privacy Journey Tracking

- **Personal Dashboard**: Track your privacy journey with score history and milestones
- **Smart Goals**: AI creates personalized privacy improvement goals based on your browsing patterns
- **Achievement System**: Unlock achievements as you improve your privacy setup
- **Weekly Reports**: Get AI-generated summaries of your privacy progress and recommendations

### 🔍 Advanced Tracking Detection

- **In-Page Tracking**: Detects canvas fingerprinting, mouse tracking, form monitoring, and device API access
- **Cross-Site Correlation**: Identifies when the same tracker follows you across multiple sites
- **Behavioral Analysis**: Recognizes tracking patterns specific to banking, social media, and shopping sites
- **Real-time Alerts**: Instant notifications for high-risk tracking events

### 🎛️ Advanced Privacy Management

- **Real-Time Notifications**: Proactive browser alerts for critical tracking events
- **Privacy Score Trends**: Historical visualization showing privacy improvements over time
- **Website Privacy Comparison**: Compare privacy levels across different sites and categories
- **Trusted Sites Management**: User-controlled whitelist for domains you trust
- **Enhanced AI Context**: Smarter AI analysis with improved contextual understanding
- **Keyboard Shortcuts**: Quick access to privacy functions (Ctrl+Shift+P, Ctrl+Shift+A, Ctrl+Shift+E)

### 🎨 User Experience & Interface

- **Dark/Light Theme Toggle**: Seamless theme switching with system preference detection
- **Export Scheduling**: Automated privacy data exports with customizable schedules
- **Privacy Score Badges**: Visual indicators showing site privacy levels in browser
- **Cross-Device Sync**: Synchronize privacy data and settings across devices
- **Privacy Impact Predictions**: AI-powered forecasting of privacy risks and improvements

### 🌐 Community & Sharing Features

- **Social Privacy Sharing**: Anonymous community insights and privacy comparisons
- **Performance Optimization**: Advanced caching and efficient resource management
- **Enhanced Error Recovery**: Robust error handling with automatic recovery mechanisms

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Chrome browser with Developer Mode enabled
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YrFnS/Phantom-Trail.git
   cd phantom-trail
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Add your OpenRouter API key (optional - extension works without AI features)
   ```

4. **Start development**

   ```bash
   pnpm dev
   ```

5. **Load extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `.output/chrome-mv3` folder

## 🏗️ Tech Stack

- **Framework**: WXT (Vite-based, Manifest V3)
- **UI**: React 19 + TypeScript + Tailwind CSS
- **State**: Zustand
- **Visualization**: Vis.js (network graphs), Chart.js (metrics), Cytoscape
- **AI**: OpenRouter API (Claude Haiku primary, GPT-4o-mini backup)
- **Data Sources**: EasyList/EasyPrivacy, Disconnect.me, ipapi.co
- **Advanced Features**: P2P networking, cross-device sync, performance monitoring, error recovery

## 📁 Project Structure

```
phantom-trail/
├── entrypoints/               # Extension entry points
│   ├── background/            # Service worker (network interception, AI coordination)
│   │   ├── index.ts           # Main background script
│   │   ├── network-monitor.ts # Network request monitoring
│   │   ├── message-handler.ts # Inter-script communication
│   │   └── alarm-manager.ts   # Scheduled tasks
│   ├── content/               # Content scripts (in-page tracking detection)
│   │   ├── index.ts           # Main content script
│   │   ├── dom-monitoring.ts  # DOM change detection
│   │   ├── event-detection.ts # User interaction tracking
│   │   └── messaging.ts       # Content-background communication
│   └── popup/                 # Main UI
├── components/                # React components (feature-based)
│   ├── LiveNarrative/         # Real-time tracking narrative
│   ├── NetworkGraph/          # Vis.js data flow visualization
│   ├── ChatInterface/         # Natural language Q&A
│   ├── RiskDashboard/         # Risk scores and metrics
│   ├── PrivacyActions/        # Actionable privacy recommendations
│   ├── PrivacyToolsStatus/    # Privacy tool effectiveness analysis
│   ├── PrivacyCoaching/       # AI-powered journey tracking
│   ├── Settings/              # Theme, notifications, sync, export settings
│   ├── TrustedSites/          # Trusted sites management
│   ├── CommunityInsights/     # P2P privacy sharing
│   └── PrivacyTrends/         # Historical privacy analysis
├── lib/                       # Core utilities and services
│   ├── ai-engine.ts           # OpenRouter integration
│   ├── tracker-db.ts          # Tracker classification logic
│   ├── privacy-coach.ts       # AI coaching and journey tracking
│   ├── privacy-recommendations.ts # Smart privacy actions
│   ├── privacy-tool-detector.ts   # Tool detection and analysis
│   ├── notification-manager.ts    # Real-time alerts
│   ├── sync-manager.ts        # Cross-device synchronization
│   ├── export-scheduler.ts    # Automated data exports
│   ├── theme-manager.ts       # Dark/light theme system
│   ├── keyboard-shortcuts.ts  # Hotkey management
│   ├── p2p-privacy-network.ts # Community features
│   ├── privacy-predictor.ts   # Impact predictions
│   ├── performance-monitor.ts # System optimization
│   ├── error-recovery.ts      # Resilience and fault tolerance
│   ├── circuit-breaker.ts     # API failure protection
│   ├── cache-optimizer.ts     # Performance caching
│   └── storage-manager.ts     # Chrome storage wrapper
└── assets/                    # Static assets
```

## 🛠️ Development

### Available Scripts

```bash
pnpm dev          # Start development server with HMR
pnpm build        # Build for production
pnpm build:firefox # Build for Firefox
pnpm zip          # Create distribution package
pnpm type-check   # Run TypeScript checks
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
pnpm fix-deps     # Fix dependency issues (Windows)
```

### Development Workflow

1. **Before making changes**: Ensure clean state

   ```bash
   pnpm lint && pnpm build && npx tsc --noEmit
   ```

2. **After adding dependencies**: Verify everything works

   ```bash
   # Windows PowerShell
   .\scripts\verify-deps.ps1

   # Or manually:
   pnpm install && pnpm lint && pnpm build && npx tsc --noEmit
   ```

3. **After using Kiro CLI**: Always verify
   ```bash
   pnpm install  # Refresh dependencies
   pnpm lint     # Check code quality
   pnpm build    # Verify build
   ```

### Code Standards

- TypeScript strict mode (zero `any` types)
- 500-line file limit (split into modules)
- Feature-based component structure
- Comprehensive error handling
- Chrome API isolation in `lib/` utilities

### AI Model Configuration

To add or change AI models, edit `lib/ai-models.ts`:

```typescript
export const AI_MODELS: AIModel[] = [
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude Haiku',
    provider: 'openrouter',
    category: 'fast',
    description: 'Fast and cost-effective',
  },
  // Add more models here
];
```

Models automatically appear in the extension's settings UI.

## 🎮 User Experience

### Live Privacy Coaching

```
🛡️ Privacy Protection: 85%
Blocked: 12    Missed: 3

💡 Recommendations:
🔥 Install uBlock Origin (easy) - Block advertising trackers automatically
⚡ Review Social Media Privacy Settings (medium) - Limit data sharing

🎯 Privacy Journey - Day 15
Current Score: 78    This Week: +12    Actions Taken: 5

Active Goals:
[████████░░] Enhance Privacy Settings (80% → Target: 85)
```

### Real-Time Narrative

```
Live Feed:
🚨 Facebook is tracking your clicks on this page
⚠️ Google Analytics recorded your page views
💡 Try Signal instead of Facebook for private messaging
```

## 🎯 Success Criteria

### Functional Requirements

- ✅ Detect trackers on 90%+ of top 100 websites
- ✅ AI narrative generates within 3 seconds
- ✅ Network graph renders 50+ nodes smoothly
- ✅ Chat responses return within 5 seconds
- ✅ Privacy recommendations appear instantly
- ✅ Tool detection works across major privacy extensions
- ✅ Journey tracking persists across browser sessions

### Performance Requirements

- ✅ CPU overhead <5% during browsing
- ✅ Memory usage <100MB
- ✅ Extension bundle <5MB
- ✅ No impact on page load times
- ✅ Real-time updates without lag

### User Experience

- ✅ Non-technical users understand narratives
- ✅ Works offline (basic features without AI)
- ✅ Setup complete in <2 minutes
- ✅ Graceful degradation when AI unavailable
- ✅ Actionable recommendations with clear steps
- ✅ Visual progress tracking motivates continued use

## 🌟 What Makes Phantom Trail Different

### Beyond Detection - Education & Action

Unlike traditional privacy tools that just block or detect, Phantom Trail:

- **Explains** what's happening in plain English
- **Recommends** specific actions you can take
- **Analyzes** your current protection effectiveness
- **Coaches** you through privacy improvement over time

### AI-Native Approach

- Personalized insights based on your browsing patterns
- Context-aware recommendations for different website types
- Natural language interface for asking privacy questions
- Continuous learning from your privacy journey

### Comprehensive Privacy Platform

- **Detection**: Real-time tracking identification
- **Education**: AI-powered explanations and insights
- **Action**: One-click privacy improvements
- **Progress**: Long-term journey tracking with goals

## 🔒 Privacy & Security

- **Local-first**: All data processing happens locally
- **Optional AI**: Extension works without API key
- **Minimal permissions**: Only necessary Chrome APIs
- **No remote code**: Manifest V3 compliant
- **User-controlled**: OpenRouter API key stored locally

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards in `.kiro/steering/coding-rules.md`
4. Commit changes (`git commit -m 'feat(component): add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WXT Framework](https://wxt.dev/) for modern extension development
- [OpenRouter](https://openrouter.ai/) for AI API access
- [EasyList](https://easylist.to/) for tracker databases
- Privacy community for inspiration and feedback

---

**Built with ❤️ for digital privacy awareness**
