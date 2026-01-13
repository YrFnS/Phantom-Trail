# Coding Rules

These rules MUST be followed when writing code. No exceptions.

## Code Quality

**500-Line Limit** - No file may exceed 500 lines. Split into:

- Separate components
- Custom hooks
- Utility modules
- Barrel exports (index.ts)

**TypeScript Strict** - All code must pass `npx tsc --noEmit` with zero errors

**No `any` Types** - Use proper interfaces. If unknown type, use `unknown` and narrow with type guards

**Barrel Exports** - Every folder with multiple exports must have `index.ts`

**Single Responsibility** - Each file does ONE thing well

## Security

**API Keys in .env.local Only** - Never hardcode secrets, never commit `.env.local`

**User-Provided Keys** - OpenRouter API key stored in `chrome.storage.local`, never logged or transmitted

**Input Validation** - Validate all user inputs before processing

**Minimal Permissions** - Only request Chrome permissions actually needed

**No Remote Code** - Manifest V3 requirement: no `eval()`, no remote scripts

## Architecture

**Feature-Based Structure**:

```
components/
  LiveNarrative/
    LiveNarrative.tsx
    LiveNarrative.hooks.ts
    LiveNarrative.types.ts
    index.ts
```

**Separation of Concerns**:

- `entrypoints/` - Chrome extension entry points only
- `components/` - React UI components
- `lib/` - Business logic, utilities, API clients
- `hooks/` - Shared React hooks

**Chrome API Isolation** - Wrap Chrome APIs in `lib/` utilities for testability

## Error Handling

**No Silent Failures** - Always handle errors explicitly

**User-Friendly Messages** - Show clear error messages, not technical stack traces

**Graceful Degradation** - Extension should work (limited) if AI API unavailable

## Testing & Verification

**Build Before Commit** - Run `pnpm build` after each task

**Type Check** - Run `npx tsc --noEmit` before committing

**Lint Check** - Run `pnpm lint` and fix all warnings before committing

**Manual Test** - Load extension in Chrome and verify changes work

**No Breaking Changes** - Extension must function after each commit

**Dependency Verification** - After adding dependencies, verify `pnpm lint` and `pnpm build` still work

## Git Workflow

**Descriptive Commits** - Format: `type(scope): description`

- `feat(narrative): add real-time tracking feed`
- `fix(ai-engine): handle API timeout errors`
- `refactor(storage): extract chrome.storage wrapper`

**Commit After Each Task** - Small, atomic commits

## Documentation

**Update README** - Keep setup instructions current

**JSDoc for Public APIs** - Document exported functions and types

**Comment WHY, Not WHAT** - Explain reasoning for non-obvious code
