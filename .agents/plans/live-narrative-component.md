# Feature: Live Narrative Component

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The Live Narrative Component is the core UI feature that displays real-time tracking activity in plain English. It shows a live feed of tracking events as they happen, with AI-generated narratives explaining what each tracker is doing and why it matters. This component transforms technical tracking data into user-friendly explanations, making invisible data collection visible and understandable.

## User Story

As a privacy-conscious web user
I want to see real-time explanations of tracking activity on websites I visit
So that I understand what data is being collected and can make informed decisions about my privacy

## Problem Statement

Users are unaware of the extensive tracking happening on websites they visit. Technical tracker names and URLs are meaningless to non-technical users. Current privacy tools show raw data without context or explanation, leaving users confused about the actual privacy implications.

## Solution Statement

Create a live narrative feed that displays tracking events in real-time with AI-generated plain English explanations. The component will show recent tracking activity, explain what each tracker does, assess risk levels, and provide actionable recommendations. It gracefully degrades to basic descriptions when AI is unavailable.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: React UI, Background Script, Storage System, AI Engine
**Dependencies**: React 19.2.3, Tailwind CSS, Chrome Storage API, OpenRouter API (optional)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `entrypoints/popup/App.tsx` (lines 1-30) - Why: Current popup structure and Tailwind patterns to follow
- `entrypoints/popup/main.tsx` (lines 1-15) - Why: React setup pattern with createRoot and StrictMode
- `entrypoints/background.ts` (lines 1-25) - Why: Current request interception framework to enhance
- `lib/types.ts` (lines 1-44) - Why: TrackingEvent, AIAnalysis, and other core interfaces
- `lib/storage-manager.ts` (lines 1-80) - Why: Storage patterns for getRecentEvents and addEvent methods
- `lib/tracker-db.ts` (lines 1-150) - Why: TrackerDatabase.classifyUrl pattern for URL classification
- `lib/ai-engine.ts` (lines 1-180) - Why: AIEngine.generateNarrative pattern and rate limiting
- `tailwind.config.js` (lines 1-20) - Why: Custom color palette and styling configuration
- `wxt.config.ts` (lines 1-15) - Why: Extension permissions and manifest configuration

### New Files to Create

- `components/LiveNarrative/LiveNarrative.tsx` - Main component displaying tracking events
- `components/LiveNarrative/LiveNarrative.hooks.ts` - Custom hooks for storage and real-time updates
- `components/LiveNarrative/LiveNarrative.types.ts` - Component-specific type definitions
- `components/LiveNarrative/index.ts` - Barrel export for clean imports
- `lib/hooks/useStorage.ts` - Reusable Chrome storage hook (based on research)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage)
  - Specific section: onChanged listener for real-time updates
  - Why: Required for live updates when background script adds new events
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
  - Specific section: Effect cleanup and dependency arrays
  - Why: Proper cleanup of Chrome storage listeners
- [Tailwind CSS Utilities](https://tailwindcss.com/docs/utility-first)
  - Specific section: Layout and spacing utilities
  - Why: Consistent styling with existing popup component

### Patterns to Follow

**Component Structure Pattern** (from `entrypoints/popup/App.tsx`):
```tsx
function ComponentName() {
  return (
    <div className="w-96 h-96 p-4 bg-gray-50">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Title</h1>
        <p className="text-sm text-gray-600">Subtitle</p>
      </header>
      <main className="space-y-4">
        {/* Content */}
      </main>
    </div>
  );
}
```

**Storage Pattern** (from `lib/storage-manager.ts`):
```typescript
static async getRecentEvents(limit = 100): Promise<TrackingEvent[]> {
  try {
    const result = await chrome.storage.local.get(this.EVENTS_KEY);
    const events: TrackingEvent[] = result[this.EVENTS_KEY] || [];
    return events.slice(-limit);
  } catch (error) {
    console.error('Failed to get events:', error);
    return [];
  }
}
```

**Error Handling Pattern** (from `lib/ai-engine.ts`):
```typescript
try {
  // Main logic
} catch (error) {
  console.error('Operation failed:', error);
  return fallbackValue;
}
```

**TypeScript Interface Pattern** (from `lib/types.ts`):
```typescript
export interface ComponentProps {
  property: string;
  optionalProperty?: number;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the component structure and Chrome storage integration for real-time updates.

**Tasks:**
- Create component directory structure following WXT conventions
- Implement Chrome storage hook for real-time updates
- Set up TypeScript interfaces for component props and state

### Phase 2: Core Implementation

Build the main Live Narrative component with event display and AI integration.

**Tasks:**
- Implement main LiveNarrative component with event list
- Add real-time event updates using Chrome storage listeners
- Integrate AI narrative generation with graceful fallback
- Style component using existing Tailwind patterns

### Phase 3: Integration

Connect the component to the background script and enhance tracker detection.

**Tasks:**
- Enhance background script to actually classify and store tracking events
- Integrate LiveNarrative component into popup App
- Test real-time updates across extension contexts

### Phase 4: Testing & Validation

Ensure component works correctly with various tracking scenarios.

**Tasks:**
- Test with known tracker websites (Google Analytics, Facebook)
- Validate AI narrative generation and fallback behavior
- Verify real-time updates and performance

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE lib/hooks/useStorage.ts

- **IMPLEMENT**: Chrome storage hook with real-time updates using onChanged listener
- **PATTERN**: Based on GitHub gist research - useStorage hook with TypeScript
- **IMPORTS**: `import { useState, useEffect, useCallback, useRef } from 'react'`
- **GOTCHA**: Must cleanup onChanged listener to prevent memory leaks
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

### CREATE components/LiveNarrative/LiveNarrative.types.ts

- **IMPLEMENT**: Component-specific interfaces extending base types from lib/types.ts
- **PATTERN**: Mirror interface pattern from `lib/types.ts:1-44`
- **IMPORTS**: `import type { TrackingEvent, AIAnalysis } from '../../lib/types'`
- **GOTCHA**: Use `import type` for type-only imports to avoid runtime overhead
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

### CREATE components/LiveNarrative/LiveNarrative.hooks.ts

- **IMPLEMENT**: Custom hooks for tracking events and AI analysis
- **PATTERN**: Use useStorage hook and StorageManager methods from `lib/storage-manager.ts:25-45`
- **IMPORTS**: `import { useStorage } from '../../lib/hooks/useStorage'`, `import { StorageManager } from '../../lib/storage-manager'`
- **GOTCHA**: Handle empty events array gracefully, implement proper error boundaries
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

### CREATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Main component displaying live tracking events with AI narratives
- **PATTERN**: Follow component structure from `entrypoints/popup/App.tsx:1-30`
- **IMPORTS**: `import React from 'react'`, custom hooks, and type imports
- **GOTCHA**: Handle loading states, empty states, and AI unavailable states
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

### CREATE components/LiveNarrative/index.ts

- **IMPLEMENT**: Barrel export for clean component imports
- **PATTERN**: Simple re-export pattern: `export { LiveNarrative } from './LiveNarrative'`
- **IMPORTS**: Component and types from local files
- **GOTCHA**: Export both component and types for external usage
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

### UPDATE entrypoints/background.ts

- **IMPLEMENT**: Enhance request interception to actually classify URLs and store events
- **PATTERN**: Use TrackerDatabase.classifyUrl from `lib/tracker-db.ts:45-65` and StorageManager.addEvent from `lib/storage-manager.ts:65-80`
- **IMPORTS**: `import { TrackerDatabase } from '../lib/tracker-db'`, `import { StorageManager } from '../lib/storage-manager'`
- **GOTCHA**: Generate unique IDs for events, handle classification failures gracefully
- **VALIDATE**: `pnpm build` (successful build), test with `chrome://extensions/` load

### UPDATE entrypoints/popup/App.tsx

- **IMPLEMENT**: Replace placeholder content with LiveNarrative component
- **PATTERN**: Maintain existing layout structure from lines 1-30, replace main content
- **IMPORTS**: `import { LiveNarrative } from '../../components/LiveNarrative'`
- **GOTCHA**: Keep existing header structure, maintain responsive design
- **VALIDATE**: `pnpm build` (successful build), visual inspection in Chrome extension

### UPDATE lib/index.ts

- **IMPLEMENT**: Add barrel exports for new hooks and components
- **PATTERN**: Add exports following existing pattern in file
- **IMPORTS**: Re-export from hooks and components directories
- **GOTCHA**: Maintain alphabetical order of exports for consistency
- **VALIDATE**: `npx tsc --noEmit` (no TypeScript errors)

---

## TESTING STRATEGY

### Unit Tests

Currently no test framework is configured. Focus on TypeScript compilation and manual testing for this iteration.

**Validation Commands:**
- `npx tsc --noEmit` - Ensure zero TypeScript errors
- `pnpm build` - Verify successful build without warnings

### Integration Tests

**Manual Testing Scenarios:**
1. Load extension in Chrome and verify popup displays
2. Visit websites with known trackers (google.com, facebook.com)
3. Verify events appear in real-time in popup
4. Test with and without OpenRouter API key
5. Verify graceful degradation when AI unavailable

### Edge Cases

- Empty events array (first load)
- Storage errors or corruption
- AI API rate limiting (>10 requests/minute)
- Very long tracker URLs or descriptions
- Rapid page navigation causing event flood

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
```
**Expected**: Zero TypeScript errors

### Level 2: Build Validation

```bash
pnpm build
```
**Expected**: Successful build with no errors or warnings

### Level 3: Extension Loading

```bash
# Manual: Load .output/chrome-mv3 in chrome://extensions/
```
**Expected**: Extension loads without errors in Chrome

### Level 4: Manual Validation

**Test Scenarios:**
1. Open extension popup - should show Live Narrative component
2. Visit google.com - should detect Google Analytics tracker
3. Visit facebook.com - should detect Facebook tracking
4. Check real-time updates - events should appear immediately
5. Test without API key - should show basic descriptions

### Level 5: Performance Validation

**Metrics to Check:**
- Popup opens in <500ms
- Events display within 1 second of detection
- No memory leaks in Chrome DevTools
- CPU usage <5% during normal browsing

---

## ACCEPTANCE CRITERIA

- [ ] LiveNarrative component displays in popup interface
- [ ] Real-time tracking events appear as they're detected
- [ ] AI narratives generate when API key is available
- [ ] Graceful fallback to basic descriptions without AI
- [ ] Component follows existing Tailwind styling patterns
- [ ] TypeScript compilation passes with zero errors
- [ ] Extension builds successfully without warnings
- [ ] Background script actually detects and classifies trackers
- [ ] Chrome storage integration works for real-time updates
- [ ] Performance meets requirements (<500ms popup load)
- [ ] Manual testing confirms functionality on real websites
- [ ] Error handling prevents crashes on edge cases

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in dependency order
- [ ] Each task validation passed immediately
- [ ] TypeScript compilation successful (zero errors)
- [ ] Extension build successful (zero warnings)
- [ ] Manual testing on tracker websites successful
- [ ] Real-time updates working correctly
- [ ] AI integration working with proper fallback
- [ ] Component styling consistent with existing patterns
- [ ] Performance requirements met
- [ ] Error handling robust for edge cases

---

## NOTES

**Design Decisions:**
- Used Chrome storage onChanged listener for real-time updates instead of polling
- Implemented graceful AI degradation to ensure extension works without API key
- Followed WXT component directory structure for consistency
- Used existing Tailwind patterns to maintain visual consistency

**Performance Considerations:**
- Limited event storage to 1000 items to prevent memory issues
- Implemented AI rate limiting to avoid API costs
- Used React.memo for component optimization if needed

**Security Considerations:**
- API key stored locally in Chrome storage (never transmitted)
- All data processing happens locally
- Minimal Chrome permissions used (already configured)

**Future Enhancements:**
- Add event filtering and search capabilities
- Implement event categorization and grouping
- Add export functionality for tracking data
- Create detailed event inspection modal
