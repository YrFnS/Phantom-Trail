# Comprehensive Refactoring Plan

**Date**: January 24, 2026  
**Purpose**: Address all coding rule violations and architectural concerns  
**Estimated Total Time**: 8-12 hours  
**Priority**: Optional but recommended for long-term maintainability

---

## 📋 Executive Summary

### Issues Found
- **Critical**: 0
- **High Priority**: 1 (God object anti-pattern)
- **Medium Priority**: 6 (Chrome API isolation, SRP violations)
- **Low Priority**: 2 (Empty folder, `any` type)

### Compliance Scores
- **Overall Coding Rules**: 94% ✅
- **Single Responsibility**: 96% ✅
- **Architecture**: 75% ⚠️

### Impact
- **Current**: Extension works perfectly, no functional issues
- **Future**: Refactoring improves maintainability, testability, and code quality

---

## 🎯 Phase 1: Quick Wins (1-2 hours) ✅ COMPLETE

### Step 1.1: Fix `any` Type Usage ✅ COMPLETE
**Priority**: LOW  
**Effort**: 15 minutes (Actual: 3 minutes)  
**File**: `lib/performance/performance-monitor.ts`  
**Completed**: January 24, 2026  
**Commit**: `403123d - fix(performance): replace any types with proper interfaces`

**Current Code** (Line 133):
```typescript
let memoryInfo: any = {};
const perf = window.performance as any;
```

**Problem**: Violates "No `any` Types" rule

**Solution**:
```typescript
// Add interface for browser memory API
interface PerformanceMemory {
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// Update code
let memoryInfo: PerformanceMemory = {};
if (typeof window !== 'undefined' && 'performance' in window) {
  const perf = window.performance as PerformanceWithMemory;
  memoryInfo = perf.memory || {};
}
```

**Steps**:
1. Open `lib/performance/performance-monitor.ts`
2. Add interfaces at top of file (after imports)
3. Replace `any` types with proper interfaces
4. Run `npx tsc --noEmit` to verify
5. Run `pnpm lint` to verify
6. Commit: `fix(performance): replace any types with proper interfaces`

**Verification**:
```bash
npx tsc --noEmit  # Should pass
pnpm lint         # Should pass
pnpm build        # Should succeed
```

---

### Step 1.2: Remove Empty DebugPanel Folder ✅ COMPLETE
**Priority**: LOW  
**Effort**: 2 minutes (Actual: 2 minutes)  
**Location**: `components/DebugPanel/`  
**Completed**: January 24, 2026  
**Commit**: `1f026fc - chore: remove empty DebugPanel folder`

**Problem**: Empty folder without `index.ts`, violates barrel export rule

**Solution**: Delete the empty folder

**Steps**:
1. Verify folder is empty: `ls components/DebugPanel`
2. Delete folder: `Remove-Item -Recurse components/DebugPanel`
3. Commit: `chore: remove empty DebugPanel folder`

**Verification**:
```bash
pnpm build  # Should succeed
```

---

## 🏗️ Phase 2: Chrome API Isolation (2-3 hours)

### Step 2.1: Refactor Settings.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 30 minutes  
**File**: `components/Settings/Settings.tsx`

**Problem**: Direct `chrome.storage.local` usage in component

**Current Code** (Lines 106-112):
```typescript
const directCheck = await chrome.storage.local.get('phantom_trail_settings');
```

**Solution**: Use existing `SettingsStorage` wrapper consistently

**Steps**:
1. Open `components/Settings/Settings.tsx`
2. Remove direct `chrome.storage.local.get()` call (lines 106-112)
3. Use `SettingsStorage.getSettings()` instead (already imported)
4. Update verification logic to use wrapper
5. Test settings save/load functionality
6. Run verification commands
7. Commit: `refactor(settings): use SettingsStorage wrapper for Chrome API`

**After Code**:
```typescript
// Remove direct chrome.storage access
// Already using SettingsStorage.getSettings() and saveSettings()
// Just remove the directCheck verification code
```

**Verification**:
```bash
npx tsc --noEmit
pnpm lint
pnpm build
# Manual: Test settings save/load in extension
```

---

### Step 2.2: Refactor P2PSettings.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 20 minutes  
**File**: `components/Settings/P2PSettings.tsx`

**Problem**: Direct `chrome.storage.local` usage

**Current Code** (Lines 26, 44):
```typescript
const result = await chrome.storage.local.get(['p2pSettings']);
await chrome.storage.local.set({ p2pSettings: newSettings });
```

**Solution**: Create P2P settings storage wrapper

**Steps**:
1. Create `lib/storage/p2p-storage.ts`:

```typescript
import { BaseStorage } from './base-storage';
import type { P2PSettings } from '../types';

export class P2PStorage extends BaseStorage {
  private static readonly KEY = 'p2pSettings';

  static async getSettings(): Promise<P2PSettings> {
    const result = await chrome.storage.local.get([this.KEY]);
    return result[this.KEY] || {
      joinPrivacyNetwork: false,
      shareAnonymousData: false,
      participateInInsights: false,
    };
  }

  static async saveSettings(settings: P2PSettings): Promise<void> {
    await chrome.storage.local.set({ [this.KEY]: settings });
  }
}
```

2. Update `components/Settings/P2PSettings.tsx`:
   - Import `P2PStorage`
   - Replace `chrome.storage.local.get()` with `P2PStorage.getSettings()`
   - Replace `chrome.storage.local.set()` with `P2PStorage.saveSettings()`

3. Run verification commands
4. Commit: `refactor(p2p): create P2PStorage wrapper for Chrome API isolation`

**Verification**:
```bash
npx tsc --noEmit
pnpm lint
pnpm build
# Manual: Test P2P settings in extension
```

---

### Step 2.3: Refactor BadgeSettings.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 15 minutes  
**File**: `components/Settings/BadgeSettings.tsx`

**Problem**: Direct `chrome.tabs.query` usage

**Current Code** (Line 39):
```typescript
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
```

**Solution**: Use existing `lib/chrome-tabs.ts` wrapper

**Steps**:
1. Check if `lib/chrome-tabs.ts` exists and has `getCurrentTab()` method
2. If not, add method to `lib/chrome-tabs.ts`:

```typescript
export async function getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}
```

3. Update `components/Settings/BadgeSettings.tsx`:
   - Import `getCurrentTab` from `../../lib/chrome-tabs`
   - Replace `chrome.tabs.query()` with `getCurrentTab()`

4. Run verification commands
5. Commit: `refactor(badge): use chrome-tabs wrapper for API isolation`

**Verification**:
```bash
npx tsc --noEmit
pnpm lint
pnpm build
# Manual: Test badge settings in extension
```

---

### Step 2.4: Refactor PrivacyToolsStatus.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 10 minutes  
**File**: `components/PrivacyToolsStatus/PrivacyToolsStatus.tsx`

**Problem**: Direct `chrome.tabs.create` usage

**Current Code** (Line 140):
```typescript
chrome.tabs.create({ url: tool.installUrl })
```

**Solution**: Use existing `lib/chrome-tabs.ts` wrapper

**Steps**:
1. Check if `lib/chrome-tabs.ts` has `openUrl()` method
2. If not, add to `lib/chrome-tabs.ts`:
```typescript
export async function openUrl(url: string): Promise<chrome.tabs.Tab> {
  return await chrome.tabs.create({ url });
}
```

3. Update `components/PrivacyToolsStatus/PrivacyToolsStatus.tsx`:
   - Import `openUrl` from `../../lib/chrome-tabs`
   - Replace `chrome.tabs.create()` with `openUrl()`

4. Run verification commands
5. Commit: `refactor(privacy-tools): use chrome-tabs wrapper`

---

### Step 2.5: Refactor PrivacyActions.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 10 minutes  
**File**: `components/PrivacyActions/PrivacyActions.tsx`

**Problem**: Direct `chrome.tabs.create` usage (2 locations)

**Current Code** (Lines 71, 233):
```typescript
chrome.tabs.create({ url });
```

**Solution**: Use `openUrl()` from `lib/chrome-tabs.ts`

**Steps**:
1. Import `openUrl` from `../../lib/chrome-tabs`
2. Replace both `chrome.tabs.create()` calls with `openUrl()`
3. Run verification commands
4. Commit: `refactor(privacy-actions): use chrome-tabs wrapper`

---

### Step 2.6: Refactor PerformanceSettings.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 20 minutes  
**File**: `components/PerformanceSettings/PerformanceSettings.tsx`

**Problem**: Direct `chrome.storage.local` usage

**Current Code** (Lines 28, 48):
```typescript
const savedMode = await chrome.storage.local.get(['performanceMode']);
await chrome.storage.local.set({ performanceMode: newMode });
```

**Solution**: Create performance settings storage wrapper

**Steps**:
1. Create `lib/storage/performance-storage.ts`:
```typescript
import { BaseStorage } from './base-storage';

export type PerformanceMode = 'balanced' | 'performance' | 'battery';

export class PerformanceStorage extends BaseStorage {
  private static readonly KEY = 'performanceMode';

  static async getMode(): Promise<PerformanceMode> {
    const result = await chrome.storage.local.get([this.KEY]);
    return result[this.KEY] || 'balanced';
  }

  static async saveMode(mode: PerformanceMode): Promise<void> {
    await chrome.storage.local.set({ [this.KEY]: mode });
  }
}
```

2. Update `components/PerformanceSettings/PerformanceSettings.tsx`
3. Run verification commands
4. Commit: `refactor(performance): create PerformanceStorage wrapper`

---

### Step 2.7: Refactor CommunityInsights.tsx Chrome API Usage
**Priority**: MEDIUM  
**Effort**: 15 minutes  
**File**: `components/CommunityInsights/CommunityInsights.tsx`

**Problem**: Direct `chrome.storage.local` usage (2 locations)

**Current Code** (Lines 114, 155, 178):
```typescript
const result = await chrome.storage.local.get(['p2pSettings']);
await chrome.storage.local.set({ p2pSettings: settings });
```

**Solution**: Use `P2PStorage` created in Step 2.2

**Steps**:
1. Import `P2PStorage` from `../../lib/storage/p2p-storage`
2. Replace all `chrome.storage.local` calls with `P2PStorage` methods
3. Run verification commands
4. Commit: `refactor(community): use P2PStorage wrapper`

**Verification After Phase 2**:
```bash
# All Chrome API calls should now be isolated in lib/
npx tsc --noEmit
pnpm lint
pnpm build
# Manual: Test all affected features in extension
```

---

## 🔨 Phase 3: Single Responsibility Refactoring (4-6 hours)

### Step 3.1: Refactor ai-analysis-prompts.ts (HIGH PRIORITY)
**Priority**: HIGH  
**Effort**: 2-3 hours  
**File**: `lib/ai-analysis-prompts.ts` (466 lines, 8 responsibilities)

**Problem**: God object anti-pattern - does 8 different things

**Current Structure**:
- Query parsing
- Pattern analysis
- Risk analysis
- Tracker analysis
- Website analysis
- Timeline analysis
- Chat handling
- Response formatting

**Solution**: Split into specialized analyzer modules

**Step 3.1.1: Create Pattern Analyzer** (30 min)

1. Create `lib/analyzers/pattern-analyzer.ts`:
```typescript
import { TrackingAnalysis, type AnalysisResult } from '../tracking-analysis';

export class PatternAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzePatterns(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    return `Pattern Analysis:\n${result.summary}\n\nRecommendations:\n${result.recommendations.join('\n')}`;
  }
}
```

2. Create `lib/analyzers/index.ts` (barrel export)
3. Test pattern analysis works
4. Commit: `refactor(analyzers): extract PatternAnalyzer from ai-analysis-prompts`

**Step 3.1.2: Create Risk Analyzer** (30 min)

1. Create `lib/analyzers/risk-analyzer.ts`:
```typescript
import { TrackingAnalysis, type AnalysisResult } from '../tracking-analysis';

export class RiskAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeRisk(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    return `Risk Assessment:\n${result.summary}\n\nRecommendations:\n${result.recommendations.join('\n')}`;
  }
}
```

2. Update `lib/analyzers/index.ts`
3. Test risk analysis works
4. Commit: `refactor(analyzers): extract RiskAnalyzer`

**Step 3.1.3: Create Tracker Analyzer** (30 min)

1. Create `lib/analyzers/tracker-analyzer.ts`
2. Move tracker analysis logic
3. Update barrel export
4. Commit: `refactor(analyzers): extract TrackerAnalyzer`

**Step 3.1.4: Create Website Analyzer** (30 min)

1. Create `lib/analyzers/website-analyzer.ts`
2. Move website analysis logic
3. Update barrel export
4. Commit: `refactor(analyzers): extract WebsiteAnalyzer`

**Step 3.1.5: Create Timeline Analyzer** (30 min)

1. Create `lib/analyzers/timeline-analyzer.ts`
2. Move timeline analysis logic
3. Update barrel export
4. Commit: `refactor(analyzers): extract TimelineAnalyzer`

**Step 3.1.6: Simplify ai-analysis-prompts.ts** (30 min)

1. Update `lib/ai-analysis-prompts.ts` to use new analyzers:
```typescript
import { PatternAnalyzer, RiskAnalyzer, TrackerAnalyzer, WebsiteAnalyzer, TimelineAnalyzer } from './analyzers';

export class AIAnalysisPrompts {
  static async processQuery(query: string): Promise<string> {
    const analysisQuery = this.parseQuery(query);

    switch (analysisQuery.type) {
      case 'pattern':
        const patternResult = await PatternAnalyzer.analyze(analysisQuery.parameters?.timeframe);
        return PatternAnalyzer.formatResponse(patternResult);
      
      case 'risk':
        const riskResult = await RiskAnalyzer.analyze(analysisQuery.parameters?.timeframe);
        return RiskAnalyzer.formatResponse(riskResult);
      
      // ... delegate to other analyzers
    }
  }
}
```

2. Remove all analysis logic (now in specialized analyzers)
3. File should be ~80 lines (down from 466)
4. Run full verification
5. Commit: `refactor(ai-prompts): simplify by delegating to specialized analyzers`

**Verification After Step 3.1**:
```bash
npx tsc --noEmit
pnpm lint
pnpm build
# Manual: Test AI chat and analysis features
```

---

### Step 3.2: Refactor privacy-comparison.ts
**Priority**: MEDIUM  
**Effort**: 1-2 hours  
**File**: `lib/privacy-comparison.ts` (474 lines, 7 responsibilities)

**Problem**: Handles 7 different comparison types

**Solution**: Split into focused comparison modules

**Step 3.2.1: Create Category Comparison Module** (30 min)

1. Create `lib/comparisons/category-comparison.ts`:
```typescript
import { WebsiteCategorization } from '../website-categorization';
import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent } from '../types';

export interface CategoryComparison {
  currentSite: { domain: string; privacyScore: number; trackerCount: number; category: string };
  categoryAverage: { privacyScore: number; trackerCount: number; category: string };
  percentile: number;
  insight: string;
  betterThanAverage: boolean;
  improvementSuggestions: string[];
}

export class CategoryComparisonService {
  static async compare(domain: string, events: TrackingEvent[]): Promise<CategoryComparison> {
    // Move category comparison logic here
  }
}
```

2. Create `lib/comparisons/index.ts`
3. Commit: `refactor(comparisons): extract CategoryComparisonService`


**Step 3.2.2: Create User Comparison Module** (20 min)

1. Create `lib/comparisons/user-comparison.ts`
2. Move user comparison logic
3. Update barrel export
4. Commit: `refactor(comparisons): extract UserComparisonService`

**Step 3.2.3: Create Site Comparison Module** (20 min)

1. Create `lib/comparisons/site-comparison.ts`
2. Move similar site comparison logic
3. Update barrel export
4. Commit: `refactor(comparisons): extract SiteComparisonService`

**Step 3.2.4: Simplify privacy-comparison.ts** (20 min)

1. Update `lib/privacy-comparison.ts` to orchestrate comparisons:
```typescript
import { CategoryComparisonService, UserComparisonService, SiteComparisonService } from './comparisons';

export class PrivacyComparison {
  static async compareByCategory(domain: string) {
    return await CategoryComparisonService.compare(domain);
  }

  static async compareWithUser(domain: string) {
    return await UserComparisonService.compare(domain);
  }

  static async compareWithSimilarSites(domain: string) {
    return await SiteComparisonService.compare(domain);
  }
}
```

2. File should be ~100 lines (down from 474)
3. Run verification
4. Commit: `refactor(privacy-comparison): simplify by delegating to specialized services`

---

### Step 3.3: Refactor App.tsx
**Priority**: MEDIUM  
**Effort**: 1 hour  
**File**: `entrypoints/popup/App.tsx` (406 lines, 6 responsibilities)

**Problem**: Mixes layout, data fetching, state management

**Solution**: Extract custom hooks

**Step 3.3.1: Create useAppData Hook** (20 min)

1. Create `lib/hooks/useAppData.ts`:

```typescript
import { useState, useEffect } from 'react';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent, PrivacyScore } from '../types';

export function useAppData() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentSiteScore, setCurrentSiteScore] = useState<PrivacyScore | null>(null);
  const [overallScore, setOverallScore] = useState<PrivacyScore | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const recentEvents = await EventsStorage.getRecentEvents(100);
        setEvents(recentEvents);

        // Get current domain
        let domain = '';
        let isHttps = false;
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const activeTab = tabs[0];
          if (activeTab?.url) {
            domain = new URL(activeTab.url).hostname;
            isHttps = activeTab.url.startsWith('https:');
          }
        } catch (tabError) {
          console.warn('Failed to get active tab:', tabError);
        }
        setCurrentDomain(domain);

        // Calculate scores
        const domainEvents = recentEvents.filter(
          event => event.domain === domain || event.url.includes(domain)
        );
        const currentScore = calculatePrivacyScore(domainEvents, isHttps);
        setCurrentSiteScore(currentScore);

        const allScore = calculatePrivacyScore(recentEvents, true);
        setOverallScore(allScore);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { events, currentSiteScore, overallScore, currentDomain };
}
```

2. Commit: `refactor(hooks): extract useAppData hook from App.tsx`

**Step 3.3.2: Update App.tsx** (20 min)

1. Import `useAppData` hook
2. Remove data fetching logic (lines 80-130)
3. Replace with: `const { events, currentSiteScore, overallScore, currentDomain } = useAppData();`
4. File should be ~280 lines (down from 406)
5. Test extension works
6. Commit: `refactor(app): use useAppData hook for data management`

---


### Step 3.4: Refactor Settings.tsx
**Priority**: MEDIUM  
**Effort**: 1 hour  
**File**: `components/Settings/Settings.tsx` (394 lines, 6 responsibilities)

**Problem**: Mixes UI, data loading, saving, validation

**Solution**: Extract custom hooks and components

**Step 3.4.1: Create useSettings Hook** (30 min)

1. Create `lib/hooks/useSettings.ts`:
```typescript
import { useState, useEffect } from 'react';
import { SettingsStorage } from '../storage/settings-storage';
import type { ExtensionSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    enableAI: true,
    enableNotifications: true,
    riskThreshold: 'medium',
  });
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await SettingsStorage.getSettings();
      setSettings(currentSettings);
      setApiKey(currentSettings.openRouterApiKey || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const trimmedKey = apiKey.trim();
      const newSettings = {
        ...settings,
        openRouterApiKey: trimmedKey || undefined,
      };

      await SettingsStorage.saveSettings(newSettings);
      
      const verified = await SettingsStorage.getSettings();
      if (trimmedKey && !verified.openRouterApiKey) {
        setSaveError('API key was not saved. Please try again.');
        return;
      }

      setSaveSuccess(true);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    apiKey,
    setApiKey,
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  };
}
```

2. Commit: `refactor(hooks): extract useSettings hook`

**Step 3.4.2: Update Settings.tsx** (30 min)

1. Import `useSettings` hook
2. Remove state management and save logic (lines 25-130)
3. Replace with: `const { settings, setSettings, apiKey, setApiKey, saving, saveError, saveSuccess, saveSettings } = useSettings();`
4. File should be ~270 lines (down from 394)
5. Test settings save/load
6. Commit: `refactor(settings): use useSettings hook`

---


## 📝 Phase 4: Documentation & Final Verification (1 hour)

### Step 4.1: Update Documentation
**Priority**: MEDIUM  
**Effort**: 30 minutes

**Tasks**:
1. Update `REFACTORING_PLAN.md` with completion status
2. Create `ARCHITECTURE.md` documenting new structure:
   - New `lib/analyzers/` directory
   - New `lib/comparisons/` directory
   - New `lib/storage/` wrappers
   - Updated hooks in `lib/hooks/`

3. Update inline JSDoc comments for new public APIs
4. Commit: `docs: update architecture documentation after refactoring`

---

### Step 4.2: Final Verification
**Priority**: HIGH  
**Effort**: 30 minutes

**Verification Checklist**:

```bash
# 1. Type Check
npx tsc --noEmit
# Expected: 0 errors

# 2. Lint Check
pnpm lint
# Expected: 0 errors

# 3. Build Check
pnpm build
# Expected: Success, bundle size ~1.31 MB

# 4. Dependency Check
pnpm install
# Expected: No errors

# 5. Manual Testing
# Load extension in Chrome
# Test each refactored feature:
```

**Manual Test Cases**:
- [ ] Settings save/load works
- [ ] P2P settings save/load works
- [ ] Performance settings save/load works
- [ ] Badge settings update works
- [ ] Privacy tools "Install" buttons work
- [ ] Privacy actions "Learn More" buttons work
- [ ] AI chat and analysis works
- [ ] Privacy comparisons work
- [ ] All 6 main views render correctly
- [ ] Theme toggle works
- [ ] Export functionality works

---

## 📊 Summary & Metrics

### Before Refactoring
- **Chrome API in Components**: 7 files
- **`any` Types**: 1 file
- **God Objects**: 1 file (466 lines)
- **Large Files**: 4 files (>400 lines)
- **Empty Folders**: 1
- **Architecture Score**: 75%
- **SRP Score**: 96%

### After Refactoring
- **Chrome API in Components**: 0 files ✅
- **`any` Types**: 0 files ✅
- **God Objects**: 0 files ✅
- **Large Files**: 0 files (>400 lines) ✅
- **Empty Folders**: 0 ✅
- **Architecture Score**: 95% ✅
- **SRP Score**: 100% ✅

### New Structure


```
lib/
├── analyzers/                    # NEW: Specialized analysis modules
│   ├── pattern-analyzer.ts
│   ├── risk-analyzer.ts
│   ├── tracker-analyzer.ts
│   ├── website-analyzer.ts
│   ├── timeline-analyzer.ts
│   └── index.ts
├── comparisons/                  # NEW: Specialized comparison modules
│   ├── category-comparison.ts
│   ├── user-comparison.ts
│   ├── site-comparison.ts
│   └── index.ts
├── storage/                      # ENHANCED: More storage wrappers
│   ├── base-storage.ts
│   ├── events-storage.ts
│   ├── settings-storage.ts
│   ├── reports-storage.ts
│   ├── sync-storage.ts
│   ├── p2p-storage.ts           # NEW
│   ├── performance-storage.ts   # NEW
│   └── index.ts
├── hooks/                        # ENHANCED: More custom hooks
│   ├── useAppState.ts
│   ├── useStorage.ts
│   ├── useTrackingEvents.ts
│   ├── useAIAnalysis.ts
│   ├── useEventAnalysis.ts
│   ├── usePatternDetection.ts
│   ├── useAppData.ts            # NEW
│   ├── useSettings.ts           # NEW
│   └── index.ts
└── chrome-tabs.ts               # ENHANCED: More wrapper methods
```

---

## 🎯 Execution Strategy

### Option 1: All at Once (Recommended for Dedicated Time)
**Time**: 8-12 hours continuous
**Approach**: Complete all phases in order
**Benefit**: Clean, consistent refactoring
**Risk**: Longer time without commits

### Option 2: Incremental (Recommended for Part-Time)
**Time**: 2-3 hours per phase over 4-5 days
**Approach**: Complete one phase per session
**Benefit**: Regular commits, easier to track progress
**Risk**: Need to maintain consistency across sessions

### Option 3: Priority-Based (Recommended for Production)
**Time**: 4-6 hours for high/medium priority only
**Approach**: 
- Phase 1 (Quick Wins): 1-2 hours
- Phase 2 (Chrome API): 2-3 hours
- Phase 3.1 (God Object): 2-3 hours
- Skip Phase 3.2-3.4 for now

**Benefit**: Addresses critical issues quickly
**Risk**: Some SRP violations remain

---

## 🚨 Rollback Plan

If refactoring causes issues:

### Immediate Rollback
```bash
# If current changes break extension
git stash
pnpm install
pnpm build
# Test extension

# If still broken
git reset --hard HEAD~1
pnpm install
pnpm build
```

### Partial Rollback
```bash
# Rollback specific file
git checkout HEAD -- path/to/file.ts
pnpm install
pnpm build
```

### Complete Rollback
```bash
# Create backup branch first
git branch refactoring-backup

# Rollback all refactoring
git reset --hard <commit-before-refactoring>
pnpm install
pnpm build
```

---


## 📋 Detailed Task Checklist

### Phase 1: Quick Wins ✅ COMPLETE
- [x] Step 1.1: Fix `any` type in performance-monitor.ts (15 min) - Done in 3 min
- [x] Step 1.2: Remove empty DebugPanel folder (2 min) - Done in 2 min
- [x] Verify Phase 1 (5 min) - All checks passed

**Total Phase 1**: ~22 minutes (Actual: 5 minutes)  
**Completed**: January 24, 2026

---

### Phase 2: Chrome API Isolation ✅
- [ ] Step 2.1: Refactor Settings.tsx (30 min)
- [ ] Step 2.2: Create P2PStorage + refactor P2PSettings.tsx (20 min)
- [ ] Step 2.3: Refactor BadgeSettings.tsx (15 min)
- [ ] Step 2.4: Refactor PrivacyToolsStatus.tsx (10 min)
- [ ] Step 2.5: Refactor PrivacyActions.tsx (10 min)
- [ ] Step 2.6: Create PerformanceStorage + refactor PerformanceSettings.tsx (20 min)
- [ ] Step 2.7: Refactor CommunityInsights.tsx (15 min)
- [ ] Verify Phase 2 (10 min)

**Total Phase 2**: ~2 hours 10 minutes

---

### Phase 3: Single Responsibility ✅

#### Step 3.1: ai-analysis-prompts.ts (HIGH PRIORITY)
- [ ] Step 3.1.1: Create PatternAnalyzer (30 min)
- [ ] Step 3.1.2: Create RiskAnalyzer (30 min)
- [ ] Step 3.1.3: Create TrackerAnalyzer (30 min)
- [ ] Step 3.1.4: Create WebsiteAnalyzer (30 min)
- [ ] Step 3.1.5: Create TimelineAnalyzer (30 min)
- [ ] Step 3.1.6: Simplify ai-analysis-prompts.ts (30 min)
- [ ] Verify Step 3.1 (10 min)

**Subtotal 3.1**: ~3 hours 10 minutes

#### Step 3.2: privacy-comparison.ts (MEDIUM PRIORITY)
- [ ] Step 3.2.1: Create CategoryComparisonService (30 min)
- [ ] Step 3.2.2: Create UserComparisonService (20 min)
- [ ] Step 3.2.3: Create SiteComparisonService (20 min)
- [ ] Step 3.2.4: Simplify privacy-comparison.ts (20 min)
- [ ] Verify Step 3.2 (10 min)

**Subtotal 3.2**: ~1 hour 40 minutes

#### Step 3.3: App.tsx (MEDIUM PRIORITY)
- [ ] Step 3.3.1: Create useAppData hook (20 min)
- [ ] Step 3.3.2: Update App.tsx (20 min)
- [ ] Verify Step 3.3 (10 min)

**Subtotal 3.3**: ~50 minutes

#### Step 3.4: Settings.tsx (MEDIUM PRIORITY)
- [ ] Step 3.4.1: Create useSettings hook (30 min)
- [ ] Step 3.4.2: Update Settings.tsx (30 min)
- [ ] Verify Step 3.4 (10 min)

**Subtotal 3.4**: ~1 hour 10 minutes

**Total Phase 3**: ~6 hours 50 minutes

---

### Phase 4: Documentation & Verification ✅
- [ ] Step 4.1: Update documentation (30 min)
- [ ] Step 4.2: Final verification (30 min)

**Total Phase 4**: ~1 hour

---

## 🎯 Total Time Estimate

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Quick Wins | 22 min | LOW |
| Phase 2: Chrome API | 2h 10min | MEDIUM |
| Phase 3.1: God Object | 3h 10min | HIGH |
| Phase 3.2: Comparisons | 1h 40min | MEDIUM |
| Phase 3.3: App.tsx | 50 min | MEDIUM |
| Phase 3.4: Settings.tsx | 1h 10min | MEDIUM |
| Phase 4: Docs & Verify | 1h | MEDIUM |
| **Total** | **~10 hours** | - |

---

## ✅ Success Criteria

### Code Quality
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] Zero ESLint errors (`pnpm lint`)
- [ ] Successful build (`pnpm build`)
- [ ] No files over 500 lines
- [ ] No `any` types
- [ ] All folders have `index.ts` barrel exports

### Architecture
- [ ] No Chrome API calls in components
- [ ] All Chrome APIs wrapped in `lib/` utilities
- [ ] Single Responsibility: Each file does one thing
- [ ] Proper separation of concerns

### Functionality
- [ ] All 6 main views work
- [ ] All 8 settings tabs work
- [ ] AI chat and analysis work
- [ ] Export functionality works
- [ ] Theme toggle works
- [ ] All features tested manually

### Documentation
- [ ] Architecture documented
- [ ] New modules have JSDoc comments
- [ ] README updated if needed
- [ ] Refactoring plan marked complete

---

## 🎉 Completion

When all tasks are complete:

1. Run final verification:
```bash
npx tsc --noEmit && pnpm lint && pnpm build
```

2. Create completion commit:
```bash
git add .
git commit -m "refactor: complete coding rules compliance refactoring

- Fixed any type usage
- Isolated all Chrome APIs in lib/ wrappers
- Split god objects into specialized modules
- Extracted custom hooks for better separation
- Improved Single Responsibility compliance
- Updated documentation

Compliance scores:
- Architecture: 75% → 95%
- SRP: 96% → 100%
- Overall: 94% → 98%"
```

3. Update `REFACTORING_PLAN.md` status to COMPLETE
4. Archive audit documents for reference

---

## 📞 Support & Questions

If you encounter issues during refactoring:

1. **Check the rollback plan** above
2. **Review the verification steps** for each phase
3. **Test incrementally** after each step
4. **Commit frequently** to enable easy rollback
5. **Keep extension functional** - never break working features

**Remember**: This refactoring is **optional**. The extension works perfectly as-is. These improvements enhance maintainability and code quality for long-term development.

---

**End of Refactoring Plan**
