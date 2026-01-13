# 👻 Phantom Trail

**An AI-native Chrome extension that makes invisible data collection visible in real-time.**

Every time you browse the web, dozens of companies silently track your clicks, read your behavior, and sell your data—but you never see it happening. Phantom Trail changes that by acting as a privacy guardian that narrates what's really going on behind the scenes, in plain English.

## 🎯 What It Does

- **Live AI Narrative**: Real-time explanations of tracking as it happens ("Amazon just tracked your mouse movements on this product page")
- **Proactive Risk Assessment**: AI scores each tracking event and alerts to suspicious activity ("⚠️ High Risk: This banking site is leaking data to advertising networks")
- **Natural Language Interface**: Ask questions like "What did Google learn about me today?" or "Is this website trustworthy?"
- **Pattern Detection**: Identifies cross-site tracking patterns and catches new tracking techniques
- **Visual Network Map**: See exactly where your data flows—from sites through ad networks to data brokers

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Chrome browser with Developer Mode enabled
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/phantom-trail.git
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
- **UI**: React 18 + TypeScript + Tailwind CSS
- **State**: Zustand
- **Visualization**: Vis.js (network graphs), Chart.js (metrics)
- **AI**: OpenRouter API (Claude Haiku primary, GPT-4o-mini backup)
- **Data Sources**: EasyList/EasyPrivacy, Disconnect.me, ipapi.co

## 📁 Project Structure

```
phantom-trail/
├── entrypoints/               # Extension entry points
│   ├── background.ts          # Service worker
│   ├── content.ts             # Content scripts
│   ├── popup/                 # Main UI
│   └── sidepanel/             # Optional side panel
├── components/                # React components (feature-based)
│   ├── LiveNarrative/
│   ├── NetworkGraph/
│   ├── ChatInterface/
│   └── RiskDashboard/
├── lib/                       # Core utilities
│   ├── ai-engine.ts           # OpenRouter integration
│   ├── tracker-db.ts          # Tracker classification
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
pnpm typecheck    # Run TypeScript checks
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
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

## 🎯 Success Criteria

### Functional Requirements

- ✅ Detect trackers on 90%+ of top 100 websites
- ✅ AI narrative generates within 3 seconds
- ✅ Network graph renders 50+ nodes smoothly
- ✅ Chat responses return within 5 seconds

### Performance Requirements

- ✅ CPU overhead <5% during browsing
- ✅ Memory usage <100MB
- ✅ Extension bundle <5MB
- ✅ No impact on page load times

### User Experience

- ✅ Non-technical users understand narratives
- ✅ Works offline (basic features without AI)
- ✅ Setup complete in <2 minutes
- ✅ Graceful degradation when AI unavailable

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
