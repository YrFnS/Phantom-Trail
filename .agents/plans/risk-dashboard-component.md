# Feature: Risk Dashboard Component

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A comprehensive Risk Dashboard component that transforms raw tracking data into actionable privacy insights. The dashboard provides users with a visual overview of their privacy exposure through risk scoring, trend analysis, top tracker identification, and AI-powered recommendations. This component serves as the central privacy command center, making complex tracking patterns understandable to non-technical users.

## User Story

As a privacy-conscious user
I want to see a comprehensive overview of my privacy risks and tracking exposure
So that I can understand my digital footprint and make informed decisions about which websites to trust

## Problem Statement

Currently, users see individual tracking events in the Live Feed but lack a holistic view of their privacy exposure. They need:

- Overall privacy risk assessment across all browsing activity
- Trend analysis to understand if their privacy exposure is increasing or decreasing
- Identification of the most problematic trackers and domains
- Actionable recommendations based on AI analysis patterns
- Visual representation of complex tracking data for easy comprehension

## Solution Statement

Create a Risk Dashboard component that aggregates tracking data into meaningful privacy metrics with visual charts, risk scoring algorithms, and AI-powered insights. The dashboard will use Chart.js for data visualization and leverage existing AI analysis to provide contextual recommendations.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: UI Components, Data Processing, AI Analysis Integration
**Dependencies**: Chart.js (already installed), react-chartjs-2, existing storage and AI systems

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `lib/types.ts` (lines 1-50) - Why: Core TrackingEvent, RiskLevel, and AIAnalysis interfaces
- `components/LiveNarrative/LiveNarrative.types.ts` (lines 1-80) - Why: Extended types including TrackingPattern, EventAnalysis, WebsiteContext
- `lib/storage-manager.ts` (lines 1-100) - Why: Storage patterns for retrieving events and settings
- `lib/hooks/useStorage.ts` (lines 1-70) - Why: Real-time storage hook pattern for live updates
- `components/ui/Card.tsx` (lines 1-50) - Why: Existing Card component structure and styling
- `components/ui/index.ts` (lines 1-10) - Why: UI component export patterns
- `entrypoints/popup/App.tsx` (lines 40-80) - Why: Tab navigation pattern and activeView state management
- `tailwind.config.mjs` (lines 1-30) - Why: Phantom brand colors and Tailwind configuration
- `components/LiveNarrative/LiveNarrative.hooks.ts` (lines 1-50) - Why: Event processing and AI analysis integration patterns

### New Files to Create

- `components/RiskDashboard/RiskDashboard.tsx` - Main dashboard component with charts and metrics
- `components/RiskDashboard/RiskDashboard.hooks.ts` - Data processing hooks for risk calculations
- `components/RiskDashboard/RiskDashboard.types.ts` - Dashboard-specific TypeScript interfaces
- `components/RiskDashboard/index.ts` - Barrel export for clean imports

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Chart.js React Integration Guide](https://blog.logrocket.com/using-chart-js-react/)
  - Specific section: react-chartjs-2 setup and TypeScript patterns
  - Why: Required for implementing charts with proper TypeScript integration
- [Chart.js Configuration Options](https://www.chartjs.org/docs/latest/general/options.html)
  - Specific section: Responsive design and color configuration
  - Why: Needed for phantom brand color integration and responsive charts

### Patterns to Follow

**Component Structure Pattern:**

```typescript
// From components/LiveNarrative/LiveNarrative.tsx
export function ComponentName({ className }: ComponentProps) {
  const hookData = useComponentHook();

  return (
    <Card className={cn('default-classes', className)}>
      <CardHeader>
        <h3>Component Title</h3>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}
```

**Hook Pattern:**

```typescript
// From lib/hooks/useStorage.ts
export function useCustomHook(): HookReturnType {
  const [data, setData] = useState<DataType>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Data processing logic
  }, [dependencies]);

  return { data, loading /* other returns */ };
}
```

**TypeScript Interface Pattern:**

```typescript
// From lib/types.ts
export interface ComponentProps {
  className?: string;
  // Required props
}

export interface ComponentState {
  // State properties with proper types
}
```

**Risk Level Color Mapping:**

```typescript
// From existing codebase pattern
const riskColors = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};
```

**Tab Integration Pattern:**

```typescript
// From entrypoints/popup/App.tsx (lines 40-80)
const [activeView, setActiveView] = useState<'narrative' | 'network' | 'chat' | 'dashboard'>('narrative');

// Add dashboard tab to existing navigation
<Button
  variant={activeView === 'dashboard' ? 'primary' : 'ghost'}
  size="sm"
  onClick={() => setActiveView('dashboard')}
  className={`flex-1 rounded-none border-0 ${
    activeView === 'dashboard'
      ? 'bg-phantom-600 text-white'
      : 'bg-transparent text-gray-600 hover:bg-gray-50'
  }`}
>
  Dashboard
</Button>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic component structure, TypeScript interfaces, and Chart.js integration following existing patterns.

**Tasks:**

- Create component directory structure with proper barrel exports
- Define TypeScript interfaces for dashboard data and props
- Install and configure react-chartjs-2 with proper TypeScript support
- Set up basic component shell with Card layout

### Phase 2: Core Implementation

Implement risk calculation algorithms, data processing hooks, and chart components.

**Tasks:**

- Create risk scoring algorithm based on tracking events
- Implement data aggregation hooks for dashboard metrics
- Build Chart.js components for risk trends and tracker distribution
- Add real-time data updates using existing storage hook patterns

### Phase 3: Integration

Connect dashboard to existing tab navigation and ensure proper styling consistency.

**Tasks:**

- Add dashboard tab to popup navigation system
- Integrate with existing AI analysis for recommendations
- Apply phantom brand colors and consistent styling
- Ensure responsive design within popup constraints

### Phase 4: Testing & Validation

Validate dashboard functionality, performance, and visual consistency.

**Tasks:**

- Test with various tracking data scenarios
- Validate chart responsiveness and performance
- Ensure proper TypeScript compilation
- Test real-time updates and data accuracy

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE components/RiskDashboard/RiskDashboard.types.ts

- **IMPLEMENT**: TypeScript interfaces for dashboard data structures
- **PATTERN**: Mirror lib/types.ts interface patterns (lines 1-50)
- **IMPORTS**: Import base types from '../../lib/types'
- **GOTCHA**: Use existing RiskLevel and TrackingEvent types, don't redefine
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/RiskDashboard/RiskDashboard.hooks.ts

- **IMPLEMENT**: Data processing hooks for risk calculations and chart data
- **PATTERN**: Follow lib/hooks/useStorage.ts hook structure (lines 1-70)
- **IMPORTS**: Import useStorage, StorageManager, and type definitions
- **GOTCHA**: Use existing storage keys and event processing patterns
- **VALIDATE**: `npx tsc --noEmit`

### INSTALL react-chartjs-2

- **IMPLEMENT**: Add Chart.js React integration dependency
- **PATTERN**: Use pnpm for consistency with existing package.json
- **IMPORTS**: N/A (dependency installation)
- **GOTCHA**: Ensure Chart.js is already installed (check package.json)
- **VALIDATE**: `pnpm list react-chartjs-2 chart.js`

### CREATE components/RiskDashboard/RiskDashboard.tsx

- **IMPLEMENT**: Main dashboard component with charts and metrics display
- **PATTERN**: Mirror components/LiveNarrative/LiveNarrative.tsx component structure
- **IMPORTS**: Import Card components, Chart.js components, hooks, and utilities
- **GOTCHA**: Use existing Card, CardHeader, CardContent pattern from ui/Card.tsx
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/RiskDashboard/index.ts

- **IMPLEMENT**: Barrel export for clean component imports
- **PATTERN**: Follow components/ui/index.ts export pattern (lines 1-10)
- **IMPORTS**: Export RiskDashboard component and types
- **GOTCHA**: Maintain consistent export naming conventions
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE components/ui/index.ts

- **IMPLEMENT**: Add any new UI components needed for dashboard
- **PATTERN**: Follow existing export pattern in file
- **IMPORTS**: Add exports for new dashboard-specific UI components if created
- **GOTCHA**: Only add if new UI components are created beyond existing ones
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE entrypoints/popup/App.tsx

- **IMPLEMENT**: Add dashboard tab to navigation and routing
- **PATTERN**: Mirror existing tab pattern (lines 40-80)
- **IMPORTS**: Import RiskDashboard component
- **GOTCHA**: Update activeView type to include 'dashboard' option
- **VALIDATE**: `pnpm build`

### UPDATE tailwind.config.mjs

- **IMPLEMENT**: Add any dashboard-specific color utilities if needed
- **PATTERN**: Follow existing phantom color extension pattern
- **IMPORTS**: N/A (configuration file)
- **GOTCHA**: Only add if new colors beyond existing phantom palette are needed
- **VALIDATE**: `pnpm build`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests for risk calculation algorithms and data processing hooks following existing testing patterns in the project.

**Test Coverage Requirements:**

- Risk scoring algorithm accuracy with various event combinations
- Chart data transformation functions
- Hook state management and real-time updates
- Error handling for malformed tracking data

### Integration Tests

**Test Scenarios:**

- Dashboard displays correctly with real tracking data
- Charts update in real-time as new events are detected
- Tab navigation works seamlessly with existing components
- AI recommendations integrate properly with dashboard metrics

### Edge Cases

**Specific Edge Cases:**

- Empty tracking data (no events detected)
- High volume tracking data (100+ events)
- Mixed risk levels across different tracker types
- API failures for AI analysis integration
- Browser storage limitations or corruption

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
```

### Level 3: Extension Loading

```bash
# Manual: Load extension in Chrome and verify dashboard tab appears
# Manual: Navigate to dashboard and verify charts render
# Manual: Verify real-time updates work with new tracking events
```

### Level 4: Manual Validation

**Dashboard Functionality:**

- Navigate to dashboard tab and verify layout renders correctly
- Confirm risk score calculation displays appropriate values
- Test chart responsiveness within popup dimensions
- Verify AI recommendations appear when available
- Test with various tracking scenarios (high/low risk sites)

**Integration Testing:**

- Verify dashboard updates in real-time as tracking events occur
- Test tab switching between dashboard and other views
- Confirm consistent styling with phantom brand colors
- Validate performance with large datasets (50+ tracking events)

---

## ACCEPTANCE CRITERIA

- [ ] Risk Dashboard component renders within existing tab navigation
- [ ] Privacy risk score accurately reflects tracking event severity and frequency
- [ ] Charts display tracking trends and top tracker domains with proper styling
- [ ] Real-time updates work seamlessly with existing storage system
- [ ] AI recommendations integrate and display contextual privacy advice
- [ ] Component follows existing TypeScript strict mode and coding standards
- [ ] Dashboard is responsive within Chrome extension popup constraints
- [ ] All validation commands pass with zero errors
- [ ] Performance remains under 5% CPU overhead with dashboard active
- [ ] Phantom brand colors and styling consistency maintained
- [ ] Component works gracefully with empty or minimal tracking data

---

## COMPLETION CHECKLIST

- [ ] All TypeScript interfaces defined with proper type safety
- [ ] Risk calculation algorithms implemented and tested
- [ ] Chart.js integration working with react-chartjs-2
- [ ] Dashboard component integrated into tab navigation
- [ ] Real-time data updates functioning correctly
- [ ] AI recommendations displaying when available
- [ ] Phantom brand styling applied consistently
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms feature works end-to-end
- [ ] No regressions in existing functionality
- [ ] Code follows project conventions and 500-line file limits
- [ ] Performance requirements met (<5% CPU overhead)

---

## NOTES

**Design Decisions:**

- Use Chart.js for consistency with existing package.json dependencies
- Implement risk scoring based on frequency, severity, and context patterns
- Leverage existing AI analysis cache for recommendations to avoid additional API calls
- Follow existing tab navigation pattern for seamless user experience
- Use session-based data aggregation to balance performance with real-time updates

**Performance Considerations:**

- Limit chart data to last 100 events to prevent memory issues
- Use React.memo for chart components to prevent unnecessary re-renders
- Implement data aggregation caching to reduce computation overhead
- Debounce real-time updates to prevent excessive chart re-rendering

**Future Enhancement Opportunities:**

- Export dashboard data as privacy reports
- Add privacy score history tracking over time
- Implement privacy goal setting and progress tracking
- Add comparative privacy analysis across different websites
