# New Features Implementation Plan

**Objective**: Add 3 high-impact features to strengthen hackathon submission
**Time Estimate**: 2-3 hours total
**Priority**: Execute in order for maximum impact

## 1. Add More Tracker Patterns (45 minutes) 🎯

### 1.1 Expand Tracker Database (30 min)

- [ ] **Add 10+ new tracker patterns** to `lib/tracker-db.ts`:
  - TikTok Pixel (`analytics.tiktok.com`)
  - Microsoft Clarity (`clarity.ms`)
  - Hotjar (`hotjar.com`)
  - Mixpanel (`mixpanel.com`)
  - Segment (`segment.com`)
  - Adobe Analytics (`omtrdc.net`)
  - Salesforce (`salesforce.com`)
  - HubSpot (`hubspot.com`)
  - Intercom (`intercom.io`)
  - Zendesk (`zendesk.com`)

### 1.2 Add Pattern Matching (15 min)

- [ ] **Enhance URL classification** in `TrackerDatabase.classifyUrl()`:
  - Add subdomain matching (e.g., `*.google-analytics.com`)
  - Add path-based detection (e.g., `/gtag/`, `/pixel/`)
  - Add query parameter detection (e.g., `?utm_source=`)

**Files to modify**:

- `lib/tracker-db.ts` - Add new KNOWN_TRACKERS entries
- Test on 3-4 websites to verify detection

## 2. Create Privacy Score System (60 minutes) 📊

### 2.1 Privacy Score Algorithm (30 min)

- [ ] **Create scoring system** in `lib/privacy-score.ts`:
  - Base score: 100 (perfect privacy)
  - Deduct points per tracker type:
    - High risk: -15 points each
    - Medium risk: -8 points each
    - Low risk: -3 points each
  - Bonus for HTTPS: +5 points
  - Penalty for 10+ trackers: -20 points

### 2.2 Privacy Score Component (30 min)

- [ ] **Create PrivacyScore component** in `components/PrivacyScore/`:
  - Display score as colored badge (0-40: Red, 41-70: Yellow, 71-100: Green)
  - Show breakdown: "Score: 65/100 (8 trackers detected)"
  - Add trend indicator (improving/declining)

**Files to create**:

- `lib/privacy-score.ts` - Scoring algorithm
- `components/PrivacyScore/PrivacyScore.tsx` - Score display
- `components/PrivacyScore/PrivacyScore.types.ts` - Type definitions
- `components/PrivacyScore/index.ts` - Barrel export

**Files to modify**:

- `entrypoints/popup/App.tsx` - Add PrivacyScore to header
- `lib/types.ts` - Add PrivacyScore interface

## 3. Add Export Functionality (75 minutes) 📥

### 3.1 Export Service (45 min)

- [ ] **Create export utility** in `lib/export-service.ts`:
  - Generate CSV format with columns: Timestamp, Domain, Tracker Type, Risk Level, Description
  - Generate JSON format with full event data
  - Generate PDF summary report (basic text format)
  - Include privacy score and recommendations

### 3.2 Export UI Component (30 min)

- [ ] **Create ExportButton component** in `components/ExportButton/`:
  - Dropdown with format options (CSV, JSON, PDF)
  - Download progress indicator
  - Success/error notifications
  - Export last 24 hours of data by default

**Files to create**:

- `lib/export-service.ts` - Export logic and file generation
- `components/ExportButton/ExportButton.tsx` - Export UI
- `components/ExportButton/ExportButton.types.ts` - Type definitions
- `components/ExportButton/index.ts` - Barrel export

**Files to modify**:

- `entrypoints/popup/App.tsx` - Add ExportButton to header
- `lib/storage-manager.ts` - Add getEventsByDateRange() method

## Implementation Details

### Tracker Database Enhancement

```typescript
// Add to lib/tracker-db.ts
'clarity.ms': {
  domain: 'clarity.ms',
  name: 'Microsoft Clarity',
  category: 'Analytics',
  description: 'User session recording and heatmaps',
  riskLevel: 'high', // Session recording is high risk
},
```

### Privacy Score Algorithm

```typescript
// lib/privacy-score.ts
export function calculatePrivacyScore(events: TrackingEvent[]): number {
  let score = 100;

  events.forEach(event => {
    switch (event.riskLevel) {
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
    }
  });

  if (events.length > 10) score -= 20; // Penalty for excessive tracking
  return Math.max(0, score);
}
```

### Export Service Structure

```typescript
// lib/export-service.ts
export class ExportService {
  static async exportAsCSV(events: TrackingEvent[]): Promise<Blob>;
  static async exportAsJSON(events: TrackingEvent[]): Promise<Blob>;
  static async exportAsPDF(
    events: TrackingEvent[],
    score: number
  ): Promise<Blob>;
}
```

## Testing Checklist

### After Each Feature:

- [ ] **TypeScript**: Run `npx tsc --noEmit` (0 errors)
- [ ] **Linting**: Run `pnpm lint` (0 errors)
- [ ] **Build**: Run `pnpm build` (successful)
- [ ] **Manual Test**: Load extension and verify feature works

### Integration Testing:

- [ ] Test on Amazon.com (should detect 15+ trackers, score ~40-60)
- [ ] Test on simple blog (should detect 2-5 trackers, score ~80-90)
- [ ] Export data and verify file contents
- [ ] Privacy score updates in real-time

## Success Metrics

**Tracker Detection**:

- [ ] Detect 25+ different tracker types across test sites
- [ ] Identify trackers on 95%+ of popular websites

**Privacy Score**:

- [ ] Score correlates with user perception of privacy
- [ ] Clear visual indication (red/yellow/green)
- [ ] Updates in real-time as trackers are detected

**Export Functionality**:

- [ ] Generate valid CSV/JSON files
- [ ] Include all relevant tracking data
- [ ] Files open correctly in Excel/text editors

## Execution Order

1. **Start with Tracker Database** - Foundation for better scores
2. **Add Privacy Score** - Visual impact for demos
3. **Implement Export** - Professional feature that judges love

**Time Management**:

- Tracker patterns: 45 min
- Privacy score: 60 min (high visual impact)
- Export functionality: 75 min (professional polish)

---

**These features will make your extension stand out! 🚀**
