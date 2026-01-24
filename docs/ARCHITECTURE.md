# Architecture Documentation

**Last Updated**: January 24, 2026  
**Status**: Post-Refactoring (Phase 3 Complete)

---

## Overview

Phantom Trail is a privacy-focused Chrome extension built with modern web technologies. The architecture follows strict separation of concerns, single responsibility principles, and Chrome API isolation patterns.

## Technology Stack

- **Framework**: WXT (Vite-based, Manifest V3)
- **UI**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Zustand + Custom Hooks
- **Visualization**: Vis.js (network graphs), Chart.js (metrics)
- **AI Integration**: OpenRouter API (Claude Haiku primary, GPT-4o-mini backup)

## Directory Structure

```
phantom-trail/
├── entrypoints/              # Chrome extension entry points
│   ├── background/           # Service worker
│   │   ├── index.ts         # Main background script
│   │   ├── message-handler.ts
│   │   ├── network-monitor.ts
│   │   └── alarm-manager.ts
│   ├── content/             # Content scripts
│   │   ├── index.ts
│   │   ├── dom-monitoring.ts
│   │   ├── event-detection.ts
│   │   └── messaging.ts
│   └── popup/               # Extension popup
│       ├── App.tsx
│       ├── main.tsx
│       └── index.html
│
├── components/              # React UI components (feature-based)
│   ├── LiveNarrative/       # Real-time tracking narrative
│   ├── NetworkGraph/        # Data flow visualization
│   ├── ChatInterface/       # AI-powered Q&A
│   ├── RiskDashboard/       # Risk scores and metrics
│   ├── Settings/            # Settings management
│   ├── TrustedSites/        # Trusted sites management
│   └── ui/                  # Reusable UI components
│
├── lib/                     # Core business logic
│   ├── analyzers/           # Specialized analysis modules
│   │   ├── pattern-analyzer.ts
│   │   ├── risk-analyzer.ts
│   │   ├── tracker-analyzer.ts
│   │   ├── website-analyzer.ts
│   │   ├── timeline-analyzer.ts
│   │   └── index.ts
│   ├── comparisons/         # Privacy comparison services
│   │   ├── category-comparison.ts
│   │   ├── user-comparison.ts
│   │   ├── site-comparison.ts
│   │   └── index.ts
│   ├── storage/             # Chrome storage wrappers
│   │   ├── base-storage.ts
│   │   ├── events-storage.ts
│   │   ├── settings-storage.ts
│   │   ├── reports-storage.ts
│   │   ├── sync-storage.ts
│   │   ├── p2p-storage.ts
│   │   ├── performance-storage.ts
│   │   └── index.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useAppState.ts
│   │   ├── useAppData.ts
│   │   ├── useSettings.ts
│   │   ├── useStorage.ts
│   │   └── index.ts
│   ├── ai/                  # AI integration
│   │   ├── client.ts
│   │   ├── cache.ts
│   │   ├── rate-limiter.ts
│   │   └── sanitizer.ts
│   ├── trackers/            # Tracker databases
│   │   ├── advertising.ts
│   │   ├── analytics.ts
│   │   ├── fingerprinting.ts
│   │   └── index.ts
│   └── ...                  # Other utilities
│
└── docs/                    # Documentation
    ├── ARCHITECTURE.md      # This file
    ├── API_KEY_SETUP.md
    ├── USER_GUIDE.md
    └── ...
```

## Architecture Principles

### 1. Separation of Concerns

**Entry Points** (`entrypoints/`)
- Chrome extension-specific code only
- No business logic
- Delegates to `lib/` modules

**Components** (`components/`)
- React UI components
- Presentation logic only
- Uses custom hooks for state/data

**Business Logic** (`lib/`)
- Core functionality
- Framework-agnostic
- Testable in isolation

### 2. Chrome API Isolation

All Chrome API calls are wrapped in `lib/` utilities:

```typescript
// ❌ BAD: Direct Chrome API in component
const tabs = await chrome.tabs.query({ active: true });

// ✅ GOOD: Use wrapper
import { getCurrentTab } from '../../lib/chrome-tabs';
const tab = await getCurrentTab();
```

**Benefits:**
- Testability (can mock wrappers)
- Consistency across codebase
- Easier to migrate if Chrome APIs change

### 3. Single Responsibility Principle

Each module has ONE clear purpose:

**Analyzers** (`lib/analyzers/`)
- `PatternAnalyzer`: Tracking pattern analysis
- `RiskAnalyzer`: Privacy risk assessment
- `TrackerAnalyzer`: Individual tracker behavior
- `WebsiteAnalyzer`: Website privacy audits
- `TimelineAnalyzer`: Temporal tracking patterns

**Comparison Services** (`lib/comparisons/`)
- `CategoryComparisonService`: Category-based comparisons
- `UserComparisonService`: User browsing pattern comparisons
- `SiteComparisonService`: Similar site comparisons

**Storage Wrappers** (`lib/storage/`)
- Each wrapper handles ONE storage concern
- Extends `BaseStorage` for consistency
- Type-safe interfaces

### 4. Custom Hooks Pattern

Extract complex state logic into reusable hooks:

```typescript
// useAppData.ts - Data fetching
export function useAppData() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentSiteScore, setCurrentSiteScore] = useState<PrivacyScore | null>(null);
  // ... data fetching logic
  return { events, currentSiteScore, overallScore, currentDomain };
}

// Component usage
function App() {
  const { events, currentSiteScore, overallScore, currentDomain } = useAppData();
  // ... render logic
}
```

**Benefits:**
- Reusable across components
- Easier to test
- Cleaner component code

## Data Flow

### 1. Tracking Detection Flow

```
Website Activity
    ↓
Content Script (detects in-page tracking)
    ↓
Background Script (intercepts network requests)
    ↓
Tracker Classification (lib/tracker-db.ts)
    ↓
Storage (lib/storage/events-storage.ts)
    ↓
UI Components (via hooks)
```

### 2. AI Analysis Flow

```
User Query
    ↓
ChatInterface Component
    ↓
AIAnalysisPrompts (query parsing)
    ↓
Specialized Analyzer (pattern/risk/tracker/website/timeline)
    ↓
TrackingAnalysis (data aggregation)
    ↓
AI Engine (OpenRouter API)
    ↓
Formatted Response
    ↓
UI Display
```

### 3. Settings Management Flow

```
User Input
    ↓
Settings Component
    ↓
useSettings Hook
    ↓
SettingsStorage Wrapper
    ↓
chrome.storage.local
    ↓
Background Script (listens for changes)
    ↓
Apply Settings
```

## Key Design Patterns

### 1. Storage Wrapper Pattern

```typescript
// Base class with common functionality
export class BaseStorage {
  protected static async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }
}

// Specialized storage classes
export class EventsStorage extends BaseStorage {
  private static readonly KEY = 'phantom_trail_events';
  
  static async getRecentEvents(limit: number): Promise<TrackingEvent[]> {
    const events = await this.get<TrackingEvent[]>(this.KEY);
    return events?.slice(-limit) || [];
  }
}
```

### 2. Analyzer Pattern

```typescript
// Each analyzer follows the same interface
export class PatternAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzePatterns(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    // Format pattern-specific data
  }
}
```

### 3. Barrel Export Pattern

Every folder with multiple exports has an `index.ts`:

```typescript
// lib/analyzers/index.ts
export { PatternAnalyzer } from './pattern-analyzer';
export { RiskAnalyzer } from './risk-analyzer';
export { TrackerAnalyzer } from './tracker-analyzer';
export { WebsiteAnalyzer } from './website-analyzer';
export { TimelineAnalyzer } from './timeline-analyzer';
```

**Benefits:**
- Clean imports: `import { PatternAnalyzer } from './analyzers'`
- Easy to refactor internal structure
- Clear public API

## Performance Considerations

### 1. Lazy Loading

Heavy components are lazy-loaded to reduce initial bundle size:

```typescript
const NetworkGraph = lazy(() =>
  import('../../components/NetworkGraph').then(m => ({
    default: m.NetworkGraph,
  }))
);
```

### 2. Data Refresh Strategy

- Events: Refresh every 5 seconds
- Privacy scores: Calculated on-demand
- AI responses: Cached for 24 hours

### 3. Bundle Size

- Target: <1.5 MB total
- Current: ~1.31 MB ✅
- Monitored on every build

## Security Measures

### 1. API Key Management

- User-provided keys only
- Stored in `chrome.storage.local`
- Never logged or transmitted (except to OpenRouter)
- Masked in debug logs

### 2. Input Validation

All user inputs are validated before processing:

```typescript
const trimmedKey = apiKey.trim();
if (trimmedKey && trimmedKey.length < 10) {
  throw new Error('Invalid API key format');
}
```

### 3. Content Security Policy

- No `eval()` or remote code execution
- Manifest V3 compliance
- Minimal permissions requested

## Testing Strategy

### 1. Type Safety

- TypeScript strict mode enabled
- Zero `any` types allowed
- All public APIs have proper interfaces

### 2. Build Verification

Every commit must pass:
```bash
npx tsc --noEmit  # Type check
pnpm lint         # Code quality
pnpm build        # Build verification
```

### 3. Manual Testing

- Load extension in Chrome
- Test all 6 main views
- Verify settings save/load
- Test AI chat functionality

## Refactoring History

### Phase 1: Quick Wins (January 24, 2026)
- Fixed `any` type usage in performance-monitor.ts
- Removed empty DebugPanel folder

### Phase 2: Chrome API Isolation (January 24, 2026)
- Created P2PStorage and PerformanceStorage wrappers
- Refactored 7 component files to use storage wrappers
- Isolated all Chrome API calls in `lib/` utilities

### Phase 3: Single Responsibility (January 24, 2026)
- Split `ai-analysis-prompts.ts` (466 → 283 lines)
- Split `privacy-comparison.ts` (531 → 144 lines)
- Extracted `useAppData` hook from App.tsx (426 → 370 lines)
- Extracted `useSettings` hook from Settings.tsx (409 → 334 lines)

**Results:**
- Architecture Score: 75% → 98%
- SRP Score: 96% → 100%
- 0 files over 500 lines
- 0 god objects
- All Chrome APIs isolated

## Future Considerations

### Scalability

- Current architecture supports up to 10,000 events
- Storage wrappers can be extended for IndexedDB if needed
- Analyzer pattern allows easy addition of new analysis types

### Maintainability

- Clear module boundaries
- Consistent patterns throughout
- Well-documented public APIs
- Easy to onboard new developers

### Extensibility

- New analyzers: Add to `lib/analyzers/`
- New storage types: Extend `BaseStorage`
- New UI components: Follow feature-based structure
- New hooks: Add to `lib/hooks/`

---

**For more information:**
- [User Guide](./USER_GUIDE.md)
- [API Key Setup](./API_KEY_SETUP.md)
- [Troubleshooting](./EXTENSION_TROUBLESHOOTING.md)
