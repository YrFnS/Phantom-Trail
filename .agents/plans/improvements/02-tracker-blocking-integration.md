# Tracker Blocking Integration Implementation Plan

## Overview
Add one-click tracker blocking functionality integrated with popular filter lists, transforming the extension from detection-only to active privacy protection.

## Technical Requirements

### Chrome Permissions
```json
// manifest.json additions
"permissions": ["declarativeNetRequest", "webRequest", "storage", "activeTab", "tabs"]
```

### Implementation Files
- `lib/blocking-manager.ts` - Core blocking logic using declarativeNetRequest
- `lib/filter-lists.ts` - Integration with EasyList/EasyPrivacy filters
- `components/BlockingControls/` - UI for blocking management
- `entrypoints/background.ts` - Integration with existing detection

## Core Implementation

### 1. Blocking Manager (`lib/blocking-manager.ts`)
```typescript
export class BlockingManager {
  static async blockTracker(domain: string): Promise<void>
  static async unblockTracker(domain: string): Promise<void>
  static async getBlockedTrackers(): Promise<string[]>
  static async syncWithFilterLists(): Promise<void>
  static async getBlockingStats(): Promise<BlockingStats>
}
```

### 2. Filter List Integration
- **EasyList**: General ad blocking rules
- **EasyPrivacy**: Privacy-focused tracking protection
- **Custom Rules**: User-defined blocking patterns
- **Whitelist**: Trusted sites and essential trackers

### 3. Blocking UI Components
```typescript
interface BlockingControlsProps {
  tracker: TrackerInfo;
  isBlocked: boolean;
  onToggleBlock: (domain: string, blocked: boolean) => void;
}
```

## Implementation Steps

### Phase 1: Core Blocking System (2 hours)
1. Implement `BlockingManager` using Chrome's declarativeNetRequest API
2. Create dynamic rule management for tracker domains
3. Add blocking status tracking in storage
4. Integrate with existing tracker detection in background script

### Phase 2: Filter List Integration (1 hour)
1. Download and parse EasyList/EasyPrivacy filter formats
2. Convert filter rules to declarativeNetRequest format
3. Implement periodic filter list updates
4. Add custom rule management for user-defined blocks

### Phase 3: User Interface (1 hour)
1. Create blocking toggle buttons in Live Narrative
2. Add blocked tracker indicators with visual styling
3. Create blocking management page in settings
4. Show blocking statistics and effectiveness metrics

## User Experience

### Live Narrative Integration
- **Block Button**: One-click blocking next to each tracker
- **Status Indicators**: 🚫 for blocked, ⚠️ for detected but allowed
- **Bulk Actions**: "Block all high-risk trackers on this site"

### Blocking Management
- **Blocked List**: View and manage all blocked trackers
- **Whitelist**: Essential trackers that shouldn't be blocked
- **Statistics**: "Blocked 1,247 tracking requests this week"
- **Filter Updates**: Automatic updates with manual refresh option

## Technical Implementation

### 1. declarativeNetRequest Rules
```typescript
const blockingRule: chrome.declarativeNetRequest.Rule = {
  id: ruleId,
  priority: 1,
  action: { type: 'block' },
  condition: {
    urlFilter: `*://*.${domain}/*`,
    resourceTypes: ['script', 'xmlhttprequest', 'image']
  }
};
```

### 2. Filter List Processing
```typescript
// Convert EasyList format to Chrome rules
function parseFilterList(filterContent: string): chrome.declarativeNetRequest.Rule[] {
  // Parse ||example.com^ format
  // Convert to declarativeNetRequest rules
  // Handle exceptions and whitelists
}
```

### 3. Storage Schema
```typescript
interface BlockingData {
  blockedDomains: string[];
  whitelistedDomains: string[];
  filterListVersion: string;
  lastUpdate: number;
  blockingStats: {
    totalBlocked: number;
    weeklyBlocked: number;
    savedBandwidth: number;
  };
}
```

## Integration Points

### Live Narrative Component
- Add blocking toggle buttons next to each tracker
- Show blocking status with visual indicators
- Update privacy scores based on blocking effectiveness

### Settings Page
- Blocking management section
- Filter list update controls
- Blocking statistics dashboard
- Whitelist management interface

### Background Script
- Integrate blocking with existing tracking detection
- Update blocking statistics on each blocked request
- Handle filter list updates and rule synchronization

## Testing Strategy

### Functional Testing
1. Test blocking effectiveness on known tracking domains
2. Verify filter list integration and updates
3. Test whitelist functionality for essential services
4. Validate blocking statistics accuracy

### Performance Testing
- Measure impact on page load times
- Test with large filter lists (50,000+ rules)
- Verify memory usage with extensive blocking rules
- Test rule update performance

### Edge Cases
- Handle conflicting rules and priorities
- Graceful degradation when declarativeNetRequest unavailable
- Filter list parsing errors and malformed rules
- Storage quota limits for large rule sets

## Success Metrics
- Successfully blocks 95%+ of detected trackers
- No noticeable impact on page load performance
- Filter lists update automatically within 24 hours
- User can easily manage blocked/allowed trackers

## Estimated Time: 4 hours
- Phase 1: 2 hours (core blocking system)
- Phase 2: 1 hour (filter list integration)
- Phase 3: 1 hour (user interface)

## Dependencies
- Chrome declarativeNetRequest API (Manifest V3)
- EasyList/EasyPrivacy filter formats
- Existing tracker detection system
- Storage manager for persistence
