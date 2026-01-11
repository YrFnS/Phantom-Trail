# Feature: NetworkGraph Component

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a real-time network visualization component that displays tracking data flows as an interactive graph. Users will see domains as nodes and data connections as edges, with color-coded risk levels and real-time updates as new tracking events are detected. This transforms abstract privacy violations into concrete, understandable visuals.

## User Story

As a privacy-conscious user
I want to see a visual network graph of where my data flows
So that I can understand which companies are tracking me and how they're connected

## Problem Statement

The current LiveNarrative component provides text-based tracking information, but users need a visual representation to truly understand the scope and interconnectedness of data collection. Text alone doesn't convey the network effect of tracking or help users identify the most problematic data flows.

## Solution Statement

Create an interactive network graph using Vis.js that displays tracking domains as nodes and data flows as edges. The graph will update in real-time as new tracking events are detected, use color coding for risk levels, and provide interactive exploration capabilities.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: UI Components, Real-time data processing
**Dependencies**: vis-network (already installed), existing TrackingEvent data structure

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `lib/types.ts` (lines 5-13) - Why: TrackingEvent interface structure that will be converted to nodes/edges
- `components/LiveNarrative/LiveNarrative.hooks.ts` (lines 10-18, 70-75) - Why: useTrackingEvents hook pattern to follow for real-time data
- `lib/hooks/useStorage.ts` (lines 8-15, 40-55) - Why: Chrome storage real-time listener pattern for data updates
- `components/LiveNarrative/LiveNarrative.tsx` (lines 15-25) - Why: Risk level styling pattern to mirror for node colors
- `components/Settings/Settings.tsx` (lines 1-2, 19-25) - Why: React hooks import pattern and useEffect usage

### New Files to Create

- `components/NetworkGraph/NetworkGraph.tsx` - Main Vis.js network component
- `components/NetworkGraph/NetworkGraph.hooks.ts` - Data processing and network management hooks
- `components/NetworkGraph/NetworkGraph.types.ts` - Vis.js node/edge type definitions
- `components/NetworkGraph/index.ts` - Barrel export

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Vis.js Network React Integration](https://www.jamestharpe.com/react-visjs/)
  - Specific section: useRef and useEffect pattern for DOM integration
  - Why: Required for proper React-Vis.js integration without wrapper libraries
- [Vis.js Network Nodes Documentation](https://visjs.github.io/vis-network/docs/network/nodes.html)
  - Specific section: Node properties (id, label, color, shape, size)
  - Why: Shows proper node configuration for domain visualization
- [Vis.js Network Edges Documentation](https://visjs.github.io/vis-network/docs/network/edges.html)
  - Specific section: Edge properties (from, to, color, width, arrows)
  - Why: Shows proper edge configuration for data flow visualization

### Patterns to Follow

**React Hook Pattern:**
```typescript
// From components/LiveNarrative/LiveNarrative.hooks.ts
export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );
  return {
    events: events.slice(-10),
    loading: eventsLoading,
  };
}
```

**Risk Level Styling Pattern:**
```typescript
// From components/LiveNarrative/LiveNarrative.tsx
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

**Vis.js React Integration Pattern:**
```typescript
// From documentation research
const visJsRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const network = visJsRef.current && new Network(visJsRef.current, { nodes, edges });
}, [visJsRef, nodes, edges]);
```

**Component Export Pattern:**
```typescript
// From existing components
export function ComponentName({ prop }: ComponentProps) {
  // implementation
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic NetworkGraph component structure with Vis.js integration and TypeScript definitions.

**Tasks:**
- Create component directory structure following existing patterns
- Set up Vis.js React integration with proper DOM ref handling
- Define TypeScript interfaces for network data structures

### Phase 2: Core Implementation

Implement the main network visualization logic with real-time data processing.

**Tasks:**
- Create data transformation logic (TrackingEvent → Vis.js nodes/edges)
- Implement real-time network updates using existing storage hooks
- Add risk-based color coding for nodes and edges

### Phase 3: Integration

Connect the NetworkGraph component to the existing application structure.

**Tasks:**
- Integrate component into popup UI alongside LiveNarrative
- Add proper error handling and loading states
- Ensure responsive design within extension constraints

### Phase 4: Testing & Validation

Validate functionality and performance with real tracking data.

**Tasks:**
- Test with various tracking scenarios (single domain, multiple domains, cross-site)
- Validate performance with 50+ nodes as specified in success criteria
- Ensure proper cleanup and memory management

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE components/NetworkGraph/NetworkGraph.types.ts

- **IMPLEMENT**: TypeScript interfaces for Vis.js network data structures
- **PATTERN**: Mirror TrackingEvent interface structure from `lib/types.ts:5-13`
- **IMPORTS**: Import RiskLevel and TrackingEvent from '../../lib/types'
- **GOTCHA**: Vis.js expects specific property names (id, label, color) - don't use custom names
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/NetworkGraph/NetworkGraph.hooks.ts

- **IMPLEMENT**: Data processing hooks for converting TrackingEvent to network data
- **PATTERN**: Follow useTrackingEvents pattern from `components/LiveNarrative/LiveNarrative.hooks.ts:10-18`
- **IMPORTS**: Import useStorage, TrackingEvent, RiskLevel, and network types
- **GOTCHA**: Vis.js nodes need unique IDs - use domain names as node IDs to prevent duplicates
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/NetworkGraph/NetworkGraph.tsx

- **IMPLEMENT**: Main React component with Vis.js Network integration
- **PATTERN**: Use useRef + useEffect pattern from Vis.js documentation
- **IMPORTS**: Import React hooks, Network from 'vis-network', and local hooks/types
- **GOTCHA**: Network instance must be created only when ref.current exists and data changes
- **VALIDATE**: `npx tsc --noEmit`

### CREATE components/NetworkGraph/index.ts

- **IMPLEMENT**: Barrel export for NetworkGraph component
- **PATTERN**: Follow existing component export pattern from `components/LiveNarrative/index.ts`
- **IMPORTS**: Export NetworkGraph component and types
- **GOTCHA**: None
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE entrypoints/popup/App.tsx

- **IMPLEMENT**: Add NetworkGraph component to popup UI
- **PATTERN**: Follow LiveNarrative integration pattern from existing App.tsx
- **IMPORTS**: Import NetworkGraph from '../../components/NetworkGraph'
- **GOTCHA**: Extension popup has fixed dimensions (w-96 h-96) - ensure graph fits
- **VALIDATE**: `pnpm build && pnpm dev`

### REFACTOR entrypoints/popup/App.tsx

- **IMPLEMENT**: Add tab/toggle system for LiveNarrative vs NetworkGraph views
- **PATTERN**: Use useState for view switching similar to Settings toggle
- **IMPORTS**: Add useState import if not already present
- **GOTCHA**: Maintain existing Settings functionality while adding view switching
- **VALIDATE**: `pnpm build && pnpm dev`

---

## TESTING STRATEGY

### Unit Tests

Test data transformation logic and hook behavior in isolation:
- TrackingEvent to Vis.js node/edge conversion
- Real-time data updates through storage hooks
- Risk level to color mapping accuracy

### Integration Tests

Test component integration with existing systems:
- NetworkGraph component renders without errors
- Real-time updates work with Chrome storage changes
- Component integrates properly with popup UI layout

### Edge Cases

Test specific scenarios that must work correctly:
- Single domain tracking (one node, no edges)
- Multiple domains with cross-connections (complex network)
- Rapid tracking events (performance under load)
- Empty state (no tracking data available)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
```

### Level 2: Build Validation

```bash
pnpm build
```

### Level 3: Development Server

```bash
pnpm dev
```

### Level 4: Manual Validation

1. Load extension in Chrome (chrome://extensions/)
2. Visit a website with trackers (e.g., cnn.com)
3. Open extension popup
4. Verify NetworkGraph displays tracking domains as nodes
5. Verify real-time updates as new tracking events occur
6. Test view switching between LiveNarrative and NetworkGraph
7. Verify risk-based color coding (green=low, yellow=medium, orange=high, red=critical)

### Level 5: Performance Validation

1. Visit websites with 20+ trackers
2. Verify graph renders smoothly without lag
3. Verify memory usage remains stable during extended use
4. Test rapid navigation between multiple tracking-heavy sites

---

## ACCEPTANCE CRITERIA

- [ ] NetworkGraph component renders Vis.js network visualization
- [ ] TrackingEvent data converts to nodes (domains) and edges (connections)
- [ ] Real-time updates work when new tracking events are detected
- [ ] Risk-based color coding matches existing LiveNarrative patterns
- [ ] Component integrates into popup UI with view switching capability
- [ ] Graph handles 50+ nodes without performance degradation
- [ ] All validation commands pass with zero errors
- [ ] TypeScript strict mode compliance maintained
- [ ] Component follows existing architectural patterns
- [ ] Proper error handling and loading states implemented
- [ ] Memory cleanup on component unmount
- [ ] Responsive design within extension popup constraints

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (build + dev server)
- [ ] No TypeScript or linting errors
- [ ] Manual testing confirms feature works
- [ ] Performance testing shows smooth operation with 50+ nodes
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Key Design Decisions:**
- Use domain names as node IDs to prevent duplicate nodes for same tracker
- Implement view switching rather than side-by-side display due to popup size constraints
- Follow existing risk color scheme for consistency with LiveNarrative
- Use real-time storage hooks to maintain consistency with existing data flow

**Performance Considerations:**
- Limit node count display to prevent UI lag (similar to LiveNarrative's 10-event limit)
- Implement efficient data transformation to minimize re-renders
- Use Vis.js built-in clustering for large networks if needed

**Future Enhancement Opportunities:**
- Click-to-focus on specific tracker domains
- Export network graph as image
- Advanced filtering by tracker type or risk level
- Network analysis metrics (centrality, clustering coefficient)
