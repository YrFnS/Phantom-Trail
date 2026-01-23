# Trusted Sites Management Implementation Plan

## Overview

Add user-controlled trusted sites management allowing users to whitelist domains they trust, reducing monitoring intensity and adjusting privacy scores accordingly.

## Technical Requirements

### Implementation Files

- `lib/trusted-sites-manager.ts` - Core trusted sites logic
- `components/TrustedSites/` - Management UI components
- `lib/storage-manager.ts` - Enhanced storage for trusted sites data
- `components/Settings/TrustedSitesSettings.tsx` - Settings integration

## Core Implementation

### 1. Trusted Sites Manager (`lib/trusted-sites-manager.ts`)

```typescript
export class TrustedSitesManager {
  static async addTrustedSite(domain: string, reason?: string): Promise<void>;
  static async removeTrustedSite(domain: string): Promise<void>;
  static async isTrustedSite(domain: string): Promise<boolean>;
  static async getTrustedSites(): Promise<TrustedSite[]>;
  static async updateTrustLevel(
    domain: string,
    level: TrustLevel
  ): Promise<void>;
}
```

### 2. Trust Level System

```typescript
enum TrustLevel {
  FULL_TRUST = 'full', // No monitoring, always green score
  PARTIAL_TRUST = 'partial', // Reduced monitoring, adjusted scoring
  CONDITIONAL = 'conditional', // Trust with specific conditions
}

interface TrustedSite {
  domain: string;
  trustLevel: TrustLevel;
  dateAdded: number;
  reason?: string;
  conditions?: TrustCondition[];
  lastVerified?: number;
}
```

### 3. Trust Conditions

```typescript
interface TrustCondition {
  type: 'max_trackers' | 'allowed_types' | 'time_limit';
  value: any;
  description: string;
}

// Example: Trust Amazon but only for shopping, not if >10 trackers
```

## Implementation Steps

### Phase 1: Core Trust System (1 hour)

1. Create `TrustedSitesManager` with CRUD operations
2. Implement trust level logic and scoring adjustments
3. Add storage schema for trusted sites data
4. Integrate with existing privacy score calculation

### Phase 2: Smart Trust Features (1 hour)

1. Add automatic trust suggestions based on user behavior
2. Implement conditional trust with specific criteria
3. Create trust verification system (periodic re-evaluation)
4. Add bulk trust operations for related domains

### Phase 3: User Interface (1 hour)

1. Create trusted sites management page
2. Add quick trust/untrust buttons in Live Narrative
3. Implement trust level indicators throughout UI
4. Create trust import/export functionality

## User Experience

### Trust Management Interface

- **Quick Actions**: "Trust this site" button in popup
- **Trust Levels**: Full, Partial, Conditional trust options
- **Bulk Operations**: "Trust all Google services"
- **Smart Suggestions**: "You visit this site daily, trust it?"

### Visual Indicators

- **Trusted Badge**: 🛡️ icon next to trusted site names
- **Trust Level Colors**: Green (full), Yellow (partial), Blue (conditional)
- **Score Adjustments**: "Score adjusted for trusted site"
- **Trust Reasons**: Hover tooltip showing why site is trusted

## Technical Implementation

### 1. Privacy Score Adjustment

```typescript
function adjustScoreForTrust(
  baseScore: number,
  domain: string,
  trustLevel: TrustLevel
): number {
  switch (trustLevel) {
    case TrustLevel.FULL_TRUST:
      return Math.max(baseScore, 85); // Minimum B+ score
    case TrustLevel.PARTIAL_TRUST:
      return baseScore + 10; // Boost score by 10 points
    case TrustLevel.CONDITIONAL:
      return evaluateConditions(baseScore, domain);
  }
}
```

### 2. Monitoring Adjustment

```typescript
function shouldMonitorTracker(
  tracker: TrackerInfo,
  domain: string,
  trustLevel: TrustLevel
): boolean {
  if (trustLevel === TrustLevel.FULL_TRUST) {
    return false; // Skip all monitoring for fully trusted sites
  }

  if (trustLevel === TrustLevel.PARTIAL_TRUST) {
    return tracker.riskLevel === 'critical'; // Only monitor critical risks
  }

  return true; // Normal monitoring for untrusted sites
}
```

### 3. Smart Trust Suggestions

```typescript
function generateTrustSuggestions(
  domain: string,
  visitHistory: VisitData[]
): TrustSuggestion[] {
  const suggestions = [];

  // Frequent visits with consistent low risk
  if (isFrequentlyVisited(domain, visitHistory) && hasLowRiskHistory(domain)) {
    suggestions.push({
      type: 'frequent_safe',
      confidence: 0.8,
      reason: 'You visit this site often and it has low privacy risks',
    });
  }

  // Known reputable domains
  if (isReputableDomain(domain)) {
    suggestions.push({
      type: 'reputable',
      confidence: 0.9,
      reason: 'This is a well-known, reputable website',
    });
  }

  return suggestions;
}
```

## Trust Categories

### Automatic Trust Candidates

1. **Banking & Finance**: Known secure financial institutions
2. **Government**: Official government websites (.gov domains)
3. **Education**: Educational institutions (.edu domains)
4. **Healthcare**: Medical and health service providers
5. **Utilities**: Essential services (electricity, water, internet)

### User-Defined Trust

1. **Work Sites**: Company intranets and work-related services
2. **Personal Services**: Email, cloud storage, personal tools
3. **Shopping**: Frequently used e-commerce sites
4. **Entertainment**: Streaming services, gaming platforms

### Conditional Trust Examples

- **Amazon**: Trust for shopping, but monitor advertising trackers
- **Google**: Trust core services, but watch data collection
- **Social Media**: Trust for social features, monitor advertising

## Integration Points

### Privacy Score Calculation

- Adjust scores based on trust level
- Show trust-adjusted vs raw scores
- Include trust context in score explanations

### Live Narrative Integration

- Add trust status to tracker descriptions
- Show "Trusted site" badges in event feed
- Provide trust/untrust quick actions

### AI Analysis Enhancement

- Include trust context in AI prompts
- Generate trust-aware recommendations
- Explain trust implications for privacy

### Settings Integration

- Dedicated trusted sites management section
- Trust level configuration options
- Import/export trusted sites lists
- Trust verification settings

## Storage Schema

### Trusted Sites Data

```typescript
interface TrustedSitesStorage {
  sites: Record<string, TrustedSite>; // domain -> trust data
  settings: {
    autoSuggestTrust: boolean;
    verificationInterval: number; // days
    defaultTrustLevel: TrustLevel;
    inheritSubdomains: boolean;
  };
  suggestions: TrustSuggestion[];
}
```

### Performance Optimization

- Cache trust status for active tabs
- Batch trust lookups for efficiency
- Lazy load trust suggestions
- Compress trust data for storage

## Testing Strategy

### Functional Testing

1. Test trust level adjustments affect privacy scores correctly
2. Verify monitoring reduction works for trusted sites
3. Test trust suggestions accuracy and relevance
4. Validate trust conditions work as expected

### User Experience Testing

- Test trust management interface usability
- Verify trust indicators are clear and helpful
- Test bulk operations work smoothly
- Validate import/export functionality

### Edge Cases

- Handle subdomain trust inheritance
- Test trust conflicts (trusted site with critical risks)
- Verify trust data migration and backup
- Handle trust verification failures gracefully

## Success Metrics

- Users can easily identify and manage trusted sites
- Trust adjustments improve user satisfaction with scores
- Monitoring reduction improves performance on trusted sites
- Trust suggestions have >70% acceptance rate

## Estimated Time: 3 hours

- Phase 1: 1 hour (core trust system)
- Phase 2: 1 hour (smart trust features)
- Phase 3: 1 hour (user interface)

## Future Enhancements

- Community trust ratings and sharing
- Machine learning for trust prediction
- Integration with browser bookmark trust
- Enterprise trust policy management
