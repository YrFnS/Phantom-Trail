# Hybrid Trusted Sites System - Implementation Plan

## Overview

Implement a smart, hybrid approach to identifying trusted sites that combines:

1. **Default Whitelist** - Pre-configured trusted sites (existing)
2. **User-Configurable Whitelist** - Users can add their own trusted sites
3. **Smart Context Detection** - Automatic detection of security contexts (login pages, banking, etc.)

## Goals

- ✅ Reduce false positives for legitimate security fingerprinting
- ✅ Allow users to customize trusted sites without editing code
- ✅ Automatically detect security contexts (login pages, banking sites)
- ✅ Maintain privacy-first approach (no external API calls)
- ✅ Keep bundle size under 1MB

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Fingerprinting Detected                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Is Site Trusted?          │
         │  (3-Layer Check)           │
         └────────────┬───────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────┐   ┌─────────┐   ┌──────────┐
   │Default │   │  User   │   │ Context  │
   │Whitelist│   │Whitelist│   │Detection │
   └────┬───┘   └────┬────┘   └────┬─────┘
        │            │             │
        └────────────┼─────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Trusted?     │
              │ Yes → Skip   │
              │ No → Report  │
              └──────────────┘
```

## Implementation Tasks

### Phase 1: Core Infrastructure [1h]

#### Task 1.1: Extend Types

**File**: `lib/types.ts`
**Action**: Add user whitelist types

```typescript
export interface UserTrustedSite {
  domain: string;
  addedAt: number;
  reason?: string;
  allowedMethods?: InPageTrackingMethod[];
  temporary?: boolean; // Session-only whitelist
}

export interface SecurityContext {
  isLoginPage: boolean;
  isBankingPage: boolean;
  isPaymentPage: boolean;
  hasPasswordField: boolean;
  hasAuthKeywords: boolean;
  confidence: 'low' | 'medium' | 'high';
}
```

#### Task 1.2: Create Context Detector

**File**: `lib/context-detector.ts` (NEW)
**Action**: Implement smart context detection

**Features**:

- Detect login pages (URL patterns: /login, /signin, /auth, /sso)
- Detect banking domains (keywords: bank, credit, financial)
- Detect payment pages (stripe, paypal, checkout)
- Detect password fields on page
- Detect authentication keywords in page content
- Return confidence score

**Logic**:

```typescript
export class SecurityContextDetector {
  static detectContext(url: string, pageInfo?: PageInfo): SecurityContext;
  static isLoginPage(url: string): boolean;
  static isBankingDomain(domain: string): boolean;
  static isPaymentPage(url: string): boolean;
  static hasAuthenticationIndicators(pageInfo?: PageInfo): boolean;
}
```

#### Task 1.3: Create User Whitelist Manager

**File**: `lib/user-whitelist-manager.ts` (NEW)
**Action**: Manage user-added trusted sites

**Features**:

- Add/remove user trusted sites
- Store in chrome.storage.local
- Validate domain format
- Support temporary (session-only) whitelist
- Export/import whitelist

**API**:

```typescript
export class UserWhitelistManager {
  static async addTrustedSite(site: UserTrustedSite): Promise<void>;
  static async removeTrustedSite(domain: string): Promise<void>;
  static async getUserWhitelist(): Promise<UserTrustedSite[]>;
  static async isUserTrusted(domain: string): Promise<boolean>;
  static async clearTemporary(): Promise<void>;
  static async exportWhitelist(): Promise<string>;
  static async importWhitelist(json: string): Promise<void>;
}
```

### Phase 2: Enhanced Trusted Sites Logic [30min]

#### Task 2.1: Update Trusted Sites Module

**File**: `lib/trusted-sites.ts`
**Action**: Integrate all three layers

**New Functions**:

```typescript
// Main function - checks all three layers
export async function isSiteTrusted(
  domain: string,
  method: InPageTrackingMethod,
  context?: SecurityContext
): Promise<{
  trusted: boolean;
  source: 'default' | 'user' | 'context';
  reason: string;
}>;

// Layer 1: Default whitelist (existing)
export function isDefaultTrusted(domain: string): TrustedSiteConfig | null;

// Layer 2: User whitelist (new)
export async function isUserTrusted(
  domain: string
): Promise<UserTrustedSite | null>;

// Layer 3: Context detection (new)
export function isContextTrusted(
  domain: string,
  method: InPageTrackingMethod,
  context: SecurityContext
): boolean;
```

**Context Trust Logic**:

- High confidence login page + device-api/canvas → Trusted
- Banking domain + high confidence → Trusted
- Payment page + device-api → Trusted
- Password field present + device-api → Trusted

### Phase 3: Settings UI Integration [1h]

#### Task 3.1: Create Trusted Sites Settings Component

**File**: `components/Settings/TrustedSitesSettings.tsx` (NEW)
**Action**: UI for managing user whitelist

**Features**:

- List of user-added trusted sites
- Add new trusted site (domain input + reason)
- Remove trusted site
- Toggle temporary whitelist
- Export/import whitelist
- Show default whitelist (read-only)
- Show currently detected context

**UI Layout**:

```
┌─────────────────────────────────────────┐
│ Trusted Sites Management                │
├─────────────────────────────────────────┤
│                                         │
│ Default Trusted Sites (10)              │
│ ✓ github.com - Account security         │
│ ✓ paypal.com - Payment security         │
│ ... (read-only list)                    │
│                                         │
│ Your Trusted Sites (3)                  │
│ ✓ mybank.com - Banking [Remove]         │
│ ✓ company-sso.com - Work SSO [Remove]   │
│ ✓ myschool.edu - School portal [Remove] │
│                                         │
│ [+ Add Trusted Site]                    │
│                                         │
│ Current Page Context:                   │
│ Domain: github.com                      │
│ Context: Login page detected (High)     │
│ Status: ✓ Trusted (default whitelist)  │
│                                         │
│ [Export Whitelist] [Import Whitelist]  │
└─────────────────────────────────────────┘
```

#### Task 3.2: Add Dialog for Adding Sites

**File**: `components/Settings/AddTrustedSiteDialog.tsx` (NEW)
**Action**: Modal dialog for adding trusted sites

**Fields**:

- Domain (required, validated)
- Reason (optional, text)
- Allowed methods (checkboxes)
- Temporary (checkbox - session only)

#### Task 3.3: Update Settings Component

**File**: `components/Settings/Settings.tsx`
**Action**: Add new "Trusted Sites" tab

**Changes**:

- Add tab navigation: General | Trusted Sites
- Import TrustedSitesSettings component
- Add state management for tab switching

### Phase 4: Content Script Integration [30min]

#### Task 4.1: Update Content Script

**File**: `entrypoints/content.ts`
**Action**: Use hybrid trust check

**Changes**:

```typescript
// Before reporting fingerprinting:
const context = SecurityContextDetector.detectContext(window.location.href, {
  hasPasswordField: document.querySelector('input[type="password"]') !== null,
});

const trustCheck = await isSiteTrusted(
  window.location.hostname,
  detectionResult.method,
  context
);

if (trustCheck.trusted) {
  console.log(
    `[Phantom Trail] Skipping ${detectionResult.method} on trusted site: ${currentDomain}`,
    `Source: ${trustCheck.source}, Reason: ${trustCheck.reason}`
  );
  return;
}
```

#### Task 4.2: Add Context Info to Events

**File**: `lib/types.ts`
**Action**: Add context info to TrackingEvent

**Changes**:

```typescript
export interface TrackingEvent {
  // ... existing fields
  securityContext?: SecurityContext;
  trustStatus?: {
    checked: boolean;
    trusted: boolean;
    source?: 'default' | 'user' | 'context';
  };
}
```

### Phase 5: UI Enhancements [30min]

#### Task 5.1: Add Quick Trust Button

**File**: `components/LiveNarrative/LiveNarrative.tsx`
**Action**: Add "Trust This Site" button to alerts

**Feature**:

- Show button on fingerprinting alerts
- Click → Opens dialog to add site to user whitelist
- Pre-fills domain and detected method
- Option for temporary (session-only) trust

#### Task 5.2: Update Pattern Alert Display

**File**: `components/LiveNarrative/LiveNarrative.tsx`
**Action**: Show context information in alerts

**Enhancement**:

```
⚠️ Pattern Detected
Advanced fingerprinting techniques detected

Context: Login page detected
💡 This might be for security. Trust this site?
[Trust Temporarily] [Trust Permanently] [Keep Warning]
```

### Phase 6: Testing & Validation [30min]

#### Task 6.1: Test Default Whitelist

- Visit github.com → No warning ✓
- Visit random site → Warning shown ✓

#### Task 6.2: Test User Whitelist

- Add custom site → Saves correctly ✓
- Visit custom site → No warning ✓
- Remove custom site → Warning returns ✓

#### Task 6.3: Test Context Detection

- Visit login page (not in whitelist) → Detects context ✓
- Visit banking site → Detects context ✓
- Visit regular page → No false positives ✓

#### Task 6.4: Test UI

- Settings UI loads ✓
- Add/remove sites works ✓
- Export/import works ✓
- Quick trust button works ✓

#### Task 6.5: Verify Build

```bash
pnpm lint
npx tsc --noEmit
pnpm build
# Check bundle size < 1MB
```

## File Structure

```
lib/
├── trusted-sites.ts (MODIFY - add hybrid logic)
├── context-detector.ts (NEW - smart detection)
├── user-whitelist-manager.ts (NEW - user whitelist)
└── types.ts (MODIFY - add new types)

components/
└── Settings/
    ├── Settings.tsx (MODIFY - add tab)
    ├── TrustedSitesSettings.tsx (NEW - main UI)
    └── AddTrustedSiteDialog.tsx (NEW - add dialog)

entrypoints/
└── content.ts (MODIFY - use hybrid check)
```

## Success Criteria

### Functional Requirements

- ✅ Default whitelist works (existing sites)
- ✅ Users can add custom trusted sites
- ✅ Context detection identifies login/banking pages
- ✅ All three layers work together seamlessly
- ✅ Settings UI is intuitive and functional
- ✅ Quick trust button works from alerts
- ✅ Export/import whitelist works

### Technical Requirements

- ✅ TypeScript strict mode (0 errors)
- ✅ ESLint passes (0 errors, 0 warnings)
- ✅ Bundle size < 1MB
- ✅ No performance degradation
- ✅ Proper error handling

### User Experience

- ✅ No false positives for common sites
- ✅ Easy to add custom sites
- ✅ Clear feedback on trust status
- ✅ Context information is helpful
- ✅ Quick actions available

## Edge Cases to Handle

1. **Invalid Domain Input**: Validate domain format before adding
2. **Duplicate Entries**: Check if site already exists
3. **Storage Limits**: Handle chrome.storage quota exceeded
4. **Context Detection Failures**: Graceful fallback if detection fails
5. **Import Invalid JSON**: Validate imported whitelist format
6. **Temporary Whitelist Cleanup**: Clear on browser restart
7. **Subdomain Matching**: Handle www.example.com vs example.com

## Performance Considerations

- **Context Detection**: Run once per page load, cache result
- **User Whitelist**: Load once, cache in memory
- **Storage Access**: Batch operations, avoid frequent writes
- **UI Updates**: Debounce user input, optimize re-renders

## Security Considerations

- **Domain Validation**: Prevent XSS through domain input
- **Storage Isolation**: Use chrome.storage.local (not accessible to pages)
- **No External Calls**: All detection happens locally
- **User Control**: Users can always remove sites
- **Audit Trail**: Log when sites are added/removed

## Future Enhancements (Out of Scope)

- [ ] Machine learning-based context detection
- [ ] Community-shared whitelist (with privacy)
- [ ] Automatic expiration of user-added sites
- [ ] Site-specific method permissions
- [ ] Whitelist sync across devices
- [ ] Import from browser bookmarks
- [ ] Suggest sites based on browsing history

## Estimated Time

- **Phase 1**: 1 hour (Core Infrastructure)
- **Phase 2**: 30 minutes (Enhanced Logic)
- **Phase 3**: 1 hour (Settings UI)
- **Phase 4**: 30 minutes (Content Script)
- **Phase 5**: 30 minutes (UI Enhancements)
- **Phase 6**: 30 minutes (Testing)

**Total**: ~4 hours

## Dependencies

- No new npm packages required
- Uses existing: React, Zustand, Tailwind CSS
- Chrome APIs: chrome.storage.local

## Rollout Plan

1. **Phase 1-2**: Core functionality (can deploy)
2. **Phase 3**: Settings UI (can deploy)
3. **Phase 4-5**: Enhanced UX (can deploy)
4. **Phase 6**: Final testing and polish

Each phase is independently deployable for incremental rollout.

---

**Created**: January 14, 2026  
**Status**: Ready for Implementation  
**Priority**: High (Improves UX significantly)
