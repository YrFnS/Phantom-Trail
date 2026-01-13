# Feature: Complete LiveNarrative Component for Real-Time AI Explanations

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Complete the LiveNarrative component to provide real-time AI explanations of web tracking activity. Transform the current basic event display into a sophisticated privacy guardian that narrates tracking activity in plain English as it happens, with individual event analysis, pattern detection, and proactive risk alerts.

## User Story

As a privacy-conscious web user
I want to see real-time AI explanations of tracking activity as it happens
So that I can understand what companies are learning about me and make informed decisions about my privacy

## Problem Statement

The current LiveNarrative component shows basic tracking events but lacks the core value proposition:

- Only shows one AI narrative for all events (not individual explanations)
- No real-time streaming of AI analysis as events occur
- Missing context awareness (banking vs shopping sites)
- No pattern detection across sites
- No proactive alerts for high-risk tracking

Users need immediate, contextual explanations like "Amazon just tracked your mouse movements on this product page" rather than generic event lists.

## Solution Statement

Enhance the LiveNarrative component with:

1. **Individual event AI analysis** - Each tracking event gets its own AI explanation
2. **Real-time streaming** - AI analysis appears immediately as events occur
3. **Context-aware narratives** - Different explanations for banking, shopping, social media sites
4. **Pattern detection** - Identify cross-site tracking and suspicious behavior
5. **Proactive alerts** - Immediate notifications for high-risk events
6. **Performance optimization** - Caching, batching, and efficient updates

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: High
**Primary Systems Affected**: LiveNarrative component, AI Engine, Background Script, Storage Manager
**Dependencies**: OpenRouter API, Chrome Storage API, existing tracker database

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `components/LiveNarrative/LiveNarrative.tsx` (lines 1-120) - Why: Current component implementation to enhance
- `components/LiveNarrative/LiveNarrative.hooks.ts` (lines 1-80) - Why: Existing hooks pattern for real-time updates
- `components/LiveNarrative/LiveNarrative.types.ts` (lines 1-25) - Why: Type definitions to extend
- `lib/ai-engine.ts` (lines 1-200) - Why: AI integration patterns and API calling logic
- `lib/storage-manager.ts` (lines 1-100) - Why: Event storage and retrieval patterns
- `lib/types.ts` (lines 1-50) - Why: Core type definitions for events and analysis
- `entrypoints/background.ts` (lines 40-80) - Why: Event generation and AI trigger logic
- `lib/hooks/useStorage.ts` - Why: Real-time storage update pattern

### New Files to Create

- `components/LiveNarrative/LiveNarrative.cache.ts` - AI analysis caching system
- `components/LiveNarrative/LiveNarrative.patterns.ts` - Pattern detection utilities
- `components/LiveNarrative/LiveNarrative.context.ts` - Website context analysis

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenRouter API Documentation](https://openrouter.ai/docs#quick-start)
  - Specific section: Chat completions and streaming
  - Why: Required for implementing real-time AI analysis
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
  - Specific section: onChanged events for real-time updates
  - Why: Shows proper real-time data synchronization patterns
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
  - Specific section: Memoization and avoiding unnecessary re-renders
  - Why: Critical for real-time component performance

### Patterns to Follow

**Event Processing Pattern** (from background.ts):

```typescript
// Throttle events from same domain (5 second intervals)
const DOMAIN_THROTTLE_MS = 5000;
const recentDomains = new Map<string, number>();

// Clean up old entries periodically
if (recentDomains.size > 100) {
  const cutoff = now - DOMAIN_THROTTLE_MS * 2;
  // ... cleanup logic
}
```

**AI Analysis Pattern** (from ai-engine.ts):

```typescript
// Rate limiting with session storage
private static readonly MAX_REQUESTS_PER_MINUTE = 10;
private static readonly RATE_LIMIT_KEY = 'phantom_trail_rate_limit';

// Retry logic with exponential backoff
for (let attempt = 0; attempt <= retries; attempt++) {
  // ... API call with increasing delays
}
```

**Real-time Updates Pattern** (from LiveNarrative.hooks.ts):

```typescript
const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
  'phantom_trail_events',
  []
);
// useStorage automatically provides real-time updates via chrome.storage.onChanged
```

**Error Handling Pattern** (from ai-engine.ts):

```typescript
// Graceful degradation
if (!settings.enableAI || !settings.apiKey) {
  return null; // Component continues to work without AI
}

// Fallback analysis
return {
  narrative: 'Multiple trackers detected on this page',
  riskAssessment: 'medium',
  recommendations: ['Consider using privacy-focused browser settings'],
  confidence: 0.3,
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Enhancement

Extend existing types and create caching infrastructure for individual event analysis.

**Tasks:**

- Extend TypeScript interfaces for individual event analysis
- Create AI analysis caching system to avoid redundant API calls
- Add website context detection utilities
- Enhance storage patterns for better real-time performance

### Phase 2: Individual Event Analysis

Implement per-event AI analysis with context awareness and caching.

**Tasks:**

- Create hook for individual event AI analysis
- Implement context-aware prompt generation
- Add caching layer for AI responses
- Integrate with existing real-time update system

### Phase 3: Pattern Detection & Alerts

Add cross-site tracking detection and proactive risk alerts.

**Tasks:**

- Implement pattern detection algorithms
- Create alert system for high-risk events
- Add pattern-based AI analysis
- Enhance UI for pattern visualization

### Phase 4: Performance & UX Optimization

Optimize for real-time performance and enhanced user experience.

**Tasks:**

- Implement batching for AI requests
- Add progressive loading states
- Optimize component re-rendering
- Add accessibility and interaction improvements

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE components/LiveNarrative/LiveNarrative.types.ts

- **IMPLEMENT**: Extend existing types for individual event analysis and caching
- **PATTERN**: Follow existing type structure in `lib/types.ts` (TrackingEvent, AIAnalysis)
- **IMPORTS**: Import base types from `../../lib/types`
- **GOTCHA**: Maintain backward compatibility with existing NarrativeState interface
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/LiveNarrative/LiveNarrative.cache.ts

- **IMPLEMENT**: AI analysis caching system with TTL and event-based invalidation
- **PATTERN**: Mirror storage patterns from `lib/storage-manager.ts` (Chrome storage operations)
- **IMPORTS**: Import types from `./LiveNarrative.types`, `../../lib/types`
- **GOTCHA**: Use session storage for cache to reset per browser session
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/LiveNarrative/LiveNarrative.context.ts

- **IMPLEMENT**: Website context detection (banking, shopping, social media, etc.)
- **PATTERN**: Follow classification logic from `lib/tracker-db.ts` (domain-based classification)
- **IMPORTS**: Import TrackingEvent from `../../lib/types`
- **GOTCHA**: Handle edge cases for unknown domains gracefully
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE components/LiveNarrative/LiveNarrative.hooks.ts

- **IMPLEMENT**: Add useEventAnalysis hook for individual event AI analysis
- **PATTERN**: Mirror existing useAIAnalysis pattern with caching integration
- **IMPORTS**: Add imports for new cache and context utilities
- **GOTCHA**: Maintain existing retry logic and error handling patterns
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE components/LiveNarrative/LiveNarrative.hooks.ts

- **IMPLEMENT**: Add usePatternDetection hook for cross-site tracking analysis
- **PATTERN**: Follow existing useCallback pattern for expensive operations
- **IMPORTS**: Use existing TrackingEvent type and AIAnalysis
- **GOTCHA**: Debounce pattern detection to avoid excessive processing
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Enhance EventDisplay component with individual AI analysis
- **PATTERN**: Follow existing Card/Badge component usage from `../ui`
- **IMPORTS**: Import enhanced types and hooks
- **GOTCHA**: Handle loading states for individual event analysis
- **VALIDATE**: `pnpm build && echo "Build successful"`

### UPDATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Add pattern detection alerts and high-risk event notifications
- **PATTERN**: Follow existing error/warning display pattern (yellow background)
- **IMPORTS**: Use existing Badge component with new variants
- **GOTCHA**: Ensure alerts don't overwhelm the interface
- **VALIDATE**: `pnpm build && echo "Build successful"`

### UPDATE lib/ai-engine.ts

- **IMPLEMENT**: Add generateEventAnalysis method for individual event analysis
- **PATTERN**: Mirror existing generateNarrative method structure
- **IMPORTS**: Import context utilities from components
- **GOTCHA**: Maintain existing rate limiting and fallback logic
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE lib/ai-engine.ts

- **IMPLEMENT**: Add context-aware prompt generation for different website types
- **PATTERN**: Follow existing buildPrompt method pattern
- **IMPORTS**: Use existing TrackingEvent and context types
- **GOTCHA**: Keep prompts concise to stay within token limits
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE entrypoints/background.ts

- **IMPLEMENT**: Enhance event generation with website context detection
- **PATTERN**: Follow existing event creation pattern around line 60
- **IMPORTS**: Import context detection utilities
- **GOTCHA**: Don't break existing domain throttling logic
- **VALIDATE**: `pnpm build && echo "Background script builds successfully"`

### UPDATE entrypoints/background.ts

- **IMPLEMENT**: Add immediate AI analysis trigger for high-risk events
- **PATTERN**: Extend existing triggerAIAnalysisIfNeeded function
- **IMPORTS**: Use existing AIEngine import
- **GOTCHA**: Respect rate limiting even for high-risk events
- **VALIDATE**: `pnpm build && echo "Background script builds successfully"`

### UPDATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Add performance optimizations (memoization, virtualization)
- **PATTERN**: Use React.memo and useMemo for expensive operations
- **IMPORTS**: Import React optimization hooks
- **GOTCHA**: Don't over-optimize and break real-time updates
- **VALIDATE**: `pnpm build && echo "Build successful"`

### UPDATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Enhance accessibility and interaction (keyboard navigation, ARIA labels)
- **PATTERN**: Follow existing component accessibility patterns
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure screen readers can understand the real-time updates
- **VALIDATE**: `pnpm build && echo "Build successful"`

---

## TESTING STRATEGY

### Unit Tests

**Scope**: Test individual hooks, utilities, and component logic

- Test caching system with various TTL scenarios
- Test context detection with known domain patterns
- Test pattern detection algorithms with mock event data
- Test AI analysis integration with mocked API responses

**Framework**: Follow existing testing patterns (likely Jest with React Testing Library based on package.json)

### Integration Tests

**Scope**: Test real-time data flow and Chrome extension integration

- Test storage listener integration with live updates
- Test background script event generation with real network requests
- Test AI analysis pipeline from event to display
- Test error handling and fallback scenarios

### Edge Cases

**Specific edge cases that must be tested for this feature:**

- High-frequency event generation (100+ events per minute)
- AI API failures and fallback behavior
- Cache invalidation and memory management
- Pattern detection with insufficient data
- Context detection for unknown domains
- Rate limiting edge cases and queue management

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
pnpm lint
pnpm format
```

### Level 2: Build Validation

```bash
pnpm build
pnpm zip
```

### Level 3: Extension Loading

```bash
# Manual: Load .output/chrome-mv3 in Chrome extensions page
# Verify no console errors on extension load
echo "Load extension in Chrome and check console for errors"
```

### Level 4: Manual Validation

```bash
# Test real-time tracking detection
echo "1. Visit amazon.com and verify events appear in LiveNarrative"
echo "2. Check individual event AI analysis appears within 3 seconds"
echo "3. Visit multiple sites to test pattern detection"
echo "4. Test high-risk event alerts (visit banking + advertising sites)"
echo "5. Test offline functionality (disable network, verify graceful degradation)"
```

### Level 5: Performance Validation

```bash
# Chrome DevTools performance profiling
echo "1. Open Chrome DevTools Performance tab"
echo "2. Record while browsing 5+ websites"
echo "3. Verify <5% CPU usage and <100MB memory"
echo "4. Check for memory leaks in extension popup"
```

---

## ACCEPTANCE CRITERIA

- [ ] Individual events show AI analysis within 3 seconds of detection
- [ ] Pattern detection identifies cross-site tracking scenarios
- [ ] High-risk events trigger immediate proactive alerts
- [ ] Context-aware narratives differ for banking vs shopping sites
- [ ] Caching reduces redundant API calls by 70%+
- [ ] Component handles 50+ events without performance degradation
- [ ] Real-time updates work smoothly without UI flickering
- [ ] Graceful degradation when AI API unavailable
- [ ] All validation commands pass with zero errors
- [ ] Memory usage stays under 100MB during heavy usage
- [ ] Accessibility features work with screen readers
- [ ] Error handling provides clear user feedback

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in dependency order
- [ ] Each task validation passed immediately after implementation
- [ ] TypeScript compilation successful with zero errors
- [ ] Extension builds and loads in Chrome without errors
- [ ] Real-time AI analysis working on live websites
- [ ] Pattern detection identifies tracking scenarios
- [ ] Performance requirements met (<5% CPU, <100MB memory)
- [ ] Accessibility and error handling implemented
- [ ] Manual testing confirms all features work as expected
- [ ] No regressions in existing functionality

---

## NOTES

**Key Design Decisions:**

- Individual event analysis over batch analysis for better real-time experience
- Session-based caching to balance performance and freshness
- Context-aware prompts to provide more relevant AI explanations
- Progressive enhancement approach - basic functionality works without AI

**Performance Considerations:**

- Cache AI responses to avoid redundant API calls
- Use React.memo and useMemo for expensive operations
- Implement proper cleanup for event listeners and timers
- Batch storage operations to reduce Chrome API overhead

**Security Considerations:**

- All AI analysis happens via secure HTTPS API calls
- No sensitive data stored in cache (only analysis results)
- Maintain existing rate limiting to prevent API abuse
- Graceful degradation preserves core privacy functionality
