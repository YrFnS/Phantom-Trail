# Privacy Score Badges Implementation Plan

## Overview

Add visual privacy score indicators in the browser toolbar that provide instant privacy feedback without opening the extension popup.

## Technical Requirements

### Chrome Permissions

```json
// manifest.json - already has required permissions
"permissions": ["activeTab", "tabs", "storage"]
```

### Implementation Files

- `lib/badge-manager.ts` - Badge display and update logic
- `lib/icon-generator.ts` - Dynamic icon generation with scores
- `entrypoints/background.ts` - Integration with existing tracking detection
- `components/Settings/BadgeSettings.tsx` - Badge configuration UI

## Core Implementation

### 1. Badge Manager (`lib/badge-manager.ts`)

```typescript
export class BadgeManager {
  static async updateBadge(tabId: number, score: PrivacyScore): Promise<void>;
  static async setBadgeStyle(style: BadgeStyle): Promise<void>;
  static async clearBadge(tabId: number): Promise<void>;
  static async getBadgeSettings(): Promise<BadgeSettings>;
  static async showQuickTooltip(tabId: number, summary: string): Promise<void>;
}
```

### 2. Badge Configuration

```typescript
interface BadgeSettings {
  enabled: boolean;
  style: BadgeStyle;
  showScore: boolean;
  showGrade: boolean;
  colorScheme: 'traffic-light' | 'gradient' | 'minimal';
  updateFrequency: 'realtime' | 'periodic' | 'manual';
  showOnlyRisks: boolean;
}

enum BadgeStyle {
  SCORE_ONLY = 'score', // "85"
  GRADE_ONLY = 'grade', // "A"
  ICON_COLOR = 'icon', // Colored icon only
  COMBINED = 'combined', // "A 85"
}
```

### 3. Dynamic Icon System

```typescript
interface IconConfig {
  baseIcon: string;
  scoreColor: string;
  backgroundColor: string;
  textColor: string;
  size: number;
}
```

## Implementation Steps

### Phase 1: Basic Badge System (20 minutes)

1. Create BadgeManager with Chrome action API integration
2. Implement score-to-color mapping and badge text generation
3. Add badge update triggers from existing tracking detection
4. Create basic icon color changing based on privacy score

### Phase 2: Dynamic Icon Generation (25 minutes)

1. Implement canvas-based icon generation with embedded scores
2. Create color schemes for different privacy score ranges
3. Add animated badge updates for score changes
4. Implement badge caching to improve performance

### Phase 3: Advanced Features (15 minutes)

1. Add tooltip functionality with quick privacy summary
2. Create badge click actions (open popup, show quick analysis)
3. Implement badge settings and customization options
4. Add badge notification system for critical privacy events

## User Experience

### Badge Display Options

- **Score Badge**: "85" in green/yellow/red
- **Grade Badge**: "A" / "B" / "C" / "D" / "F"
- **Icon Color**: Extension icon changes color based on score
- **Combined**: "A 85" for comprehensive information

### Color Coding System

- **Green (A: 90-100)**: Excellent privacy, minimal tracking
- **Light Green (B: 80-89)**: Good privacy, acceptable tracking
- **Yellow (C: 70-79)**: Moderate privacy, some concerns
- **Orange (D: 60-69)**: Poor privacy, significant tracking
- **Red (F: 0-59)**: Critical privacy risks, extensive tracking

### Interactive Features

- **Hover Tooltip**: Quick privacy summary without opening popup
- **Click Actions**: Configurable click behavior (popup, analysis, settings)
- **Animated Updates**: Smooth transitions when score changes
- **Critical Alerts**: Flashing or pulsing for high-risk events

## Technical Implementation

### 1. Badge Update Logic

```typescript
async function updateTabBadge(
  tabId: number,
  events: TrackingEvent[]
): Promise<void> {
  const settings = await BadgeManager.getBadgeSettings();
  if (!settings.enabled) return;

  const score = calculatePrivacyScore(events);
  const badgeText = generateBadgeText(score, settings.style);
  const badgeColor = getScoreColor(score.score, settings.colorScheme);

  // Update badge text and color
  await chrome.action.setBadgeText({
    text: badgeText,
    tabId: tabId,
  });

  await chrome.action.setBadgeBackgroundColor({
    color: badgeColor,
    tabId: tabId,
  });

  // Update icon if using icon color mode
  if (settings.style === BadgeStyle.ICON_COLOR) {
    await updateIconColor(tabId, score.score);
  }
}
```

### 2. Dynamic Icon Generation

```typescript
function generateScoreIcon(score: number, config: IconConfig): string {
  const canvas = new OffscreenCanvas(19, 19);
  const ctx = canvas.getContext('2d');

  // Draw base icon
  const img = new Image();
  img.src = config.baseIcon;
  ctx.drawImage(img, 0, 0, 19, 19);

  // Add score overlay
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(12, 12, 7, 7);

  ctx.fillStyle = config.textColor;
  ctx.font = '8px Arial';
  ctx.fillText(score.toString(), 13, 18);

  return canvas.toDataURL();
}
```

### 3. Tooltip System

```typescript
// Add tooltip functionality using chrome.action.setTitle
async function updateTooltip(
  tabId: number,
  summary: PrivacySummary
): Promise<void> {
  const tooltipText = `
Privacy Score: ${summary.score} (${summary.grade})
Trackers: ${summary.trackerCount}
Risk Level: ${summary.riskLevel}
Click for details
  `.trim();

  await chrome.action.setTitle({
    title: tooltipText,
    tabId: tabId,
  });
}
```

## Badge Styles and Variations

### Score Display Formats

1. **Numeric Score**: "85", "72", "91"
2. **Letter Grade**: "A", "B+", "C-"
3. **Risk Level**: "LOW", "MED", "HIGH"
4. **Tracker Count**: "3", "12", "25+"

### Color Schemes

```typescript
const COLOR_SCHEMES = {
  'traffic-light': {
    excellent: '#22c55e', // Green
    good: '#84cc16', // Light green
    moderate: '#eab308', // Yellow
    poor: '#f97316', // Orange
    critical: '#ef4444', // Red
  },
  gradient: {
    excellent: '#10b981',
    good: '#34d399',
    moderate: '#fbbf24',
    poor: '#fb923c',
    critical: '#f87171',
  },
  minimal: {
    excellent: '#6b7280', // Gray variations
    good: '#6b7280',
    moderate: '#6b7280',
    poor: '#6b7280',
    critical: '#ef4444', // Only red for critical
  },
};
```

### Animation Effects

- **Score Change**: Smooth color transition over 300ms
- **Critical Alert**: Pulsing red badge for high-risk events
- **Loading State**: Subtle animation while calculating score
- **Update Indicator**: Brief highlight when new data arrives

## Integration Points

### Background Script Integration

- Update badges when tracking events are detected
- Handle tab switching and badge persistence
- Manage badge updates for multiple tabs
- Clear badges when tabs are closed

### Settings Integration

- Add badge configuration section to main settings
- Include style preview and customization options
- Provide badge enable/disable toggle
- Add advanced options for power users

### Privacy Score Integration

- Use existing privacy score calculation
- Include badge context in score explanations
- Show badge history in privacy trends
- Sync badge settings across devices

## Performance Considerations

### Badge Update Optimization

- Debounce rapid score changes (max 1 update per second)
- Cache generated icons to avoid repeated canvas operations
- Use requestIdleCallback for non-critical badge updates
- Batch badge updates for multiple tabs

### Memory Management

- Limit cached icons to 50 most recent
- Clean up badge data when tabs are closed
- Use weak references for tab-specific data
- Implement LRU cache for icon generation

## Testing Strategy

### Visual Testing

1. Test badge visibility across different browser themes
2. Verify color accuracy for all score ranges
3. Test badge readability at different screen resolutions
4. Validate icon generation quality and performance

### Functional Testing

- Test badge updates with real tracking events
- Verify tooltip accuracy and formatting
- Test badge persistence across browser restarts
- Validate settings synchronization

### Performance Testing

- Measure badge update latency
- Test icon generation performance with many tabs
- Verify memory usage with extended browsing
- Test battery impact on mobile devices

## Success Metrics

- Users can quickly assess site privacy without opening extension
- Badge updates reflect privacy changes within 2 seconds
- Badge visibility and readability meet accessibility standards
- Badge feature adoption rate exceeds 60% of active users

## Estimated Time: 1 hour

- Phase 1: 20 minutes (basic badge system)
- Phase 2: 25 minutes (dynamic icon generation)
- Phase 3: 15 minutes (advanced features)

## Future Enhancements

- Animated privacy score trends in badge
- Badge notifications for privacy improvements
- Custom badge themes and user-created styles
- Integration with browser's native privacy indicators
