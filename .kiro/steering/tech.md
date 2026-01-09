# Technical Architecture

## Technology Stack
**Extension Framework**: WXT (Vite-based, Manifest V3)
**UI**: React 18 + TypeScript + Tailwind CSS
**State Management**: Zustand
**Visualization**: Vis.js (network graphs), Chart.js (metrics)
**AI Integration**: OpenRouter API (Claude Haiku primary, GPT-4o-mini backup)
**Data Sources**: EasyList/EasyPrivacy, Disconnect.me lists, ipapi.co

## Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  Popup UI (React)     │  Side Panel (React)             │
│  - Live Narrative     │  - Network Graph                │
│  - Chat Interface     │  - Risk Dashboard               │
├─────────────────────────────────────────────────────────┤
│              Service Worker (background.ts)              │
│  - chrome.webRequest interception                       │
│  - Tracker classification                               │
│  - AI engine coordination                               │
├─────────────────────────────────────────────────────────┤
│              Content Scripts (content.ts)                │
│  - In-page tracking detection                           │
│  - DOM monitoring                                       │
├─────────────────────────────────────────────────────────┤
│                    External APIs                         │
│  - OpenRouter (AI analysis)                             │
│  - ipapi.co (geolocation)                               │
└─────────────────────────────────────────────────────────┘
```

## Development Environment
- Node.js 18+
- pnpm (recommended) or npm
- WXT CLI for development and building
- Chrome browser with Developer Mode enabled

## Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- React functional components with hooks
- Descriptive naming: `trackingEvent`, `analyzeRequest`, `renderNarrative`
- JSDoc comments for public APIs

## Testing Strategy
- Unit tests for AI engine and tracker classification logic
- Integration tests for Chrome API interactions
- Manual testing across different websites
- Performance profiling to ensure <5% CPU overhead

## Deployment Process
- Build with `wxt build`
- Package as .zip for Chrome Web Store submission
- Version bumps in manifest.json and package.json
- Changelog updates for each release

## Performance Requirements
- Extension size under 5MB
- Lazy-load AI analysis (on-demand or significant events only)
- Cache AI responses locally to avoid redundant API calls
- Throttle network monitoring to prevent performance impact
- Target <5% CPU overhead during normal browsing

## AI Integration Details

**Provider**: OpenRouter API
- **Primary Model**: Claude Haiku (fast, cost-effective)
- **Fallback Model**: GPT-4o-mini (if primary unavailable)

**Rate Limiting**:
- Max 10 requests per minute per user
- Queue requests during high activity, batch if possible
- Debounce rapid page navigations (500ms delay)

**Token Budget**:
- System prompt: ~500 tokens (cached)
- Context per request: max 2000 tokens
- Response limit: 500 tokens
- Estimated cost: ~$0.001 per analysis

**Fallback Behavior**:
1. API timeout (>5s): Show cached analysis if available
2. API error: Display tracker data without AI narrative
3. Rate limited: Queue request, show "Analyzing..." state
4. No API key: Extension works with basic tracker detection only (no AI features)

**Caching Strategy**:
- Cache AI responses by domain + tracker signature
- TTL: 24 hours for general analysis
- Invalidate on significant tracker changes

## Security Considerations
- No remote code execution (Manifest V3 requirement)
- All data processing happens locally
- User-provided OpenRouter API key (never stored remotely)
- Minimal Chrome permissions requested
- No PII sent to external services without user consent
