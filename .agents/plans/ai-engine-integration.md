# Feature: AI Engine Integration

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Complete the AI Engine integration to provide real-time AI-powered narratives and chat functionality for tracking analysis. The AI engine exists but needs full integration with the LiveNarrative component, proper error handling, and chat interface implementation. This is the core differentiator that makes Phantom Trail "AI-native" rather than just another tracker blocker.

## User Story

As a privacy-conscious user
I want to receive real-time AI explanations of tracking activity in plain English
So that I can understand what companies are learning about me and make informed decisions about my privacy

## Problem Statement

The current implementation has a solid AI engine foundation but lacks complete integration:
- AI analysis is not consistently triggered when new tracking events occur
- No chat interface for user queries like "What did Google learn about me today?"
- Error handling doesn't gracefully degrade when AI is unavailable
- No visual feedback for AI processing states
- Missing pattern detection for cross-site tracking

## Solution Statement

Complete the AI engine integration by connecting all components, implementing the chat interface, adding robust error handling, and ensuring seamless user experience with proper loading states and fallbacks.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: AI Engine, LiveNarrative, Background Script, Storage
**Dependencies**: OpenRouter API, Chrome storage API

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `lib/ai-engine.ts` (lines 1-250) - Why: Core AI engine with OpenRouter integration, needs chat interface connection
- `components/LiveNarrative/LiveNarrative.hooks.ts` (lines 30-50) - Why: AI analysis hook pattern, needs error handling improvements
- `components/LiveNarrative/LiveNarrative.tsx` (lines 60-80) - Why: Error display pattern for AI failures
- `lib/storage-manager.ts` (lines 1-100) - Why: Storage patterns for settings and events
- `lib/types.ts` (lines 1-50) - Why: Type definitions for AIAnalysis and TrackingEvent
- `entrypoints/background.ts` (lines 20-40) - Why: Event creation pattern, needs AI trigger integration

### New Files to Create

- `components/ChatInterface/ChatInterface.tsx` - Chat UI component for natural language queries
- `components/ChatInterface/ChatInterface.hooks.ts` - Chat state management and API integration
- `components/ChatInterface/ChatInterface.types.ts` - Chat-specific type definitions
- `components/ChatInterface/index.ts` - Barrel export

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenRouter API Authentication](https://openrouter.ai/docs/api-reference/authentication)
  - Specific section: Bearer token authentication with HTTP-Referer and X-Title headers
  - Why: Required for proper API integration and attribution
- [Chrome Extension Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
  - Specific section: chrome.storage.local for persistent settings
  - Why: API key storage and event persistence patterns

### Patterns to Follow

**Component Structure Pattern:**
```typescript
// From components/LiveNarrative/
export function ComponentName({ className = '' }: ComponentProps) {
  const { data, loading, error } = useComponentHook();
  // Component logic
}
```

**Custom Hook Pattern:**
```typescript
// From LiveNarrative.hooks.ts
export function useHookName(): HookState {
  const [state, setState] = useState<Type>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hook logic with error handling
  return { state, loading, error };
}
```

**Error Handling Pattern:**
```typescript
// From ai-engine.ts
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return null; // Graceful fallback
}
```

**Storage Pattern:**
```typescript
// From storage-manager.ts
static async getStoredData(): Promise<DataType> {
  try {
    const result = await chrome.storage.local.get(KEY);
    return result[KEY] || defaultValue;
  } catch (error) {
    console.error('Storage operation failed:', error);
    return defaultValue;
  }
}
```

**Risk Level Styling Pattern:**
```typescript
// From LiveNarrative.tsx
function getRiskStyling(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Enhancement

Improve the existing AI engine integration and error handling to ensure robust operation.

**Tasks:**
- Enhance AI analysis triggering in background script
- Improve error handling and fallback behavior
- Add proper loading states and user feedback
- Implement retry logic for API failures

### Phase 2: Chat Interface Implementation

Create the natural language chat interface for user queries about their tracking data.

**Tasks:**
- Build ChatInterface component with input/output UI
- Implement chat state management hooks
- Connect to AIEngine.chatQuery method
- Add chat history and conversation management

### Phase 3: Integration & Polish

Connect all components and ensure seamless user experience.

**Tasks:**
- Integrate chat interface into popup UI
- Add tab navigation for chat vs live feed
- Implement proper loading states across all components
- Add comprehensive error boundaries

### Phase 4: Testing & Validation

Ensure all AI features work correctly with proper fallbacks.

**Tasks:**
- Test with real OpenRouter API key
- Validate error handling with network failures
- Test rate limiting behavior
- Verify graceful degradation without API key

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE entrypoints/background.ts

- **IMPLEMENT**: Trigger AI analysis when significant tracking events occur
- **PATTERN**: Event creation pattern from lines 30-45, add AI trigger after StorageManager.addEvent
- **IMPORTS**: Import AIEngine from '../lib/ai-engine'
- **GOTCHA**: Don't trigger AI for every single request - batch or use significance threshold
- **VALIDATE**: `pnpm build && echo "Background script builds successfully"`

### UPDATE components/LiveNarrative/LiveNarrative.hooks.ts

- **IMPLEMENT**: Enhanced error handling and retry logic for AI analysis
- **PATTERN**: Existing useAIAnalysis hook pattern, add retry mechanism
- **IMPORTS**: No new imports needed
- **GOTCHA**: Prevent infinite retry loops, limit to 2-3 attempts
- **VALIDATE**: `npx tsc --noEmit && echo "TypeScript validation passes"`

### UPDATE components/LiveNarrative/LiveNarrative.tsx

- **IMPLEMENT**: Better error states and loading indicators for AI analysis
- **PATTERN**: Existing error display pattern from lines 60-80
- **IMPORTS**: No new imports needed
- **GOTCHA**: Show meaningful error messages, not technical details
- **VALIDATE**: `pnpm build && echo "LiveNarrative component builds successfully"`

### CREATE components/ChatInterface/ChatInterface.types.ts

- **IMPLEMENT**: Type definitions for chat interface
- **PATTERN**: Mirror LiveNarrative.types.ts structure
- **IMPORTS**: Import base types from '../../lib/types'
- **GOTCHA**: Include message history types and loading states
- **VALIDATE**: `npx tsc --noEmit && echo "Chat types validate successfully"`

### CREATE components/ChatInterface/ChatInterface.hooks.ts

- **IMPLEMENT**: Chat state management and API integration hooks
- **PATTERN**: Mirror LiveNarrative.hooks.ts pattern with useState and useCallback
- **IMPORTS**: Import AIEngine, useState, useCallback, useEffect from react
- **GOTCHA**: Implement message history persistence and proper error handling
- **VALIDATE**: `npx tsc --noEmit && echo "Chat hooks validate successfully"`

### CREATE components/ChatInterface/ChatInterface.tsx

- **IMPLEMENT**: Chat UI component with input field and message history
- **PATTERN**: Follow LiveNarrative.tsx component structure and styling
- **IMPORTS**: Import hooks from './ChatInterface.hooks', types from './ChatInterface.types'
- **GOTCHA**: Handle empty states, loading states, and long message content
- **VALIDATE**: `pnpm build && echo "ChatInterface component builds successfully"`

### CREATE components/ChatInterface/index.ts

- **IMPLEMENT**: Barrel export for ChatInterface component
- **PATTERN**: Mirror other component index.ts files
- **IMPORTS**: Export ChatInterface from './ChatInterface'
- **GOTCHA**: Keep exports clean and consistent
- **VALIDATE**: `npx tsc --noEmit && echo "ChatInterface exports validate"`

### UPDATE entrypoints/popup/App.tsx

- **IMPLEMENT**: Add chat interface tab to popup navigation
- **PATTERN**: Existing tab navigation pattern with activeView state
- **IMPORTS**: Import ChatInterface from '../../components/ChatInterface'
- **GOTCHA**: Maintain consistent tab styling and state management
- **VALIDATE**: `pnpm build && echo "Popup App builds with chat integration"`

### UPDATE lib/ai-engine.ts

- **IMPLEMENT**: Enhanced error handling and response validation
- **PATTERN**: Existing error handling pattern, add more robust validation
- **IMPORTS**: No new imports needed
- **GOTCHA**: Validate API responses more thoroughly, handle malformed JSON
- **VALIDATE**: `npx tsc --noEmit && echo "AI engine validates successfully"`

---

## TESTING STRATEGY

### Unit Tests

No formal unit testing framework is configured. Manual testing approach:

- Test each component in isolation by loading extension in Chrome
- Verify error states by temporarily breaking API calls
- Test with and without API key configuration

### Integration Tests

- Test complete user flow: install extension → configure API key → browse websites → see AI narratives
- Test chat interface with various query types
- Verify graceful degradation when AI is unavailable

### Edge Cases

- API key validation and error messages
- Rate limiting behavior (10 requests/minute)
- Network failures and retry logic
- Malformed API responses
- Empty or invalid tracking data
- Long chat conversations and message history

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
```

```bash
pnpm lint
```

```bash
pnpm format
```

### Level 2: Build Validation

```bash
pnpm build
```

### Level 3: Extension Loading

```bash
# Load .output/chrome-mv3 in Chrome extensions page
# Verify no console errors on extension load
echo "Manual: Load extension in Chrome and check console"
```

### Level 4: Manual Validation

```bash
# Test AI integration
echo "Manual: Configure API key in settings"
echo "Manual: Visit tracker-heavy website (news site)"
echo "Manual: Verify AI narrative appears in Live Feed"
echo "Manual: Test chat interface with query 'What trackers did I encounter?'"
echo "Manual: Test error handling by using invalid API key"
```

### Level 5: Performance Validation

```bash
# Check memory usage and performance
echo "Manual: Monitor extension memory usage in Chrome task manager"
echo "Manual: Verify <5% CPU overhead during browsing"
```

---

## ACCEPTANCE CRITERIA

- [ ] AI narratives generate automatically for new tracking events
- [ ] Chat interface responds to natural language queries about tracking data
- [ ] Error handling gracefully degrades when AI is unavailable
- [ ] Loading states provide clear feedback during AI processing
- [ ] Rate limiting prevents API abuse (10 requests/minute)
- [ ] Extension works offline with basic features (no AI)
- [ ] API key validation provides helpful error messages
- [ ] Chat history persists during session
- [ ] All TypeScript validation passes with zero errors
- [ ] Extension builds successfully without warnings
- [ ] No console errors during normal operation
- [ ] Memory usage remains under 100MB
- [ ] Response times under 5 seconds for AI analysis

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full build passes without errors
- [ ] No TypeScript or linting errors
- [ ] Manual testing confirms AI features work
- [ ] Error handling tested with invalid API key
- [ ] Chat interface responds to user queries
- [ ] Loading states work correctly
- [ ] Acceptance criteria all met
- [ ] Code follows project patterns and conventions

---

## NOTES

**Key Implementation Decisions:**
- Chat interface uses same tab navigation pattern as existing Live Feed/Network Graph
- AI analysis triggers on significant events only (not every request) to manage rate limits
- Error handling prioritizes user experience over technical accuracy
- Message history persists in session storage for better UX

**Performance Considerations:**
- Rate limiting prevents API abuse and cost overruns
- Retry logic includes exponential backoff to avoid hammering failed endpoints
- Chat history limited to prevent memory bloat
- AI analysis batched for efficiency

**Security Notes:**
- API keys stored in chrome.storage.local (encrypted by Chrome)
- No API keys logged or transmitted except to OpenRouter
- Proper attribution headers required by OpenRouter terms
