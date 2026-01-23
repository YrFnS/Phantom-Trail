# Frontend Design - Phantom Trail

**IMPORTANT:** You are working on frontend files for a privacy-focused Chrome extension. Follow these design principles to create a trustworthy, professional interface that conveys security and transparency.

## Design Philosophy

**Core Principle**: Privacy tools must look trustworthy, not flashy. Users need to feel secure, not entertained.

**Visual Language**: Clean, minimal, professional - like a security dashboard, not a gaming app.

**User Psychology**: Privacy-conscious users value clarity over creativity. Show competence through restraint.

## Color System

### Primary Palette

```css
/* Phantom Trail System */
--void: #050a0e; /* Background - "Dark Web" canvas */
--plasma: #bc13fe; /* Primary - Ghost Plasma (user node) */
--tracker: #00f0ff; /* Secondary - Tracker Cyan (data streams) */
--expose: #ff2a6d; /* Alert - High risk */
--hud: #161b22; /* Surface - HUD/narrative box */
--terminal: #e6edf3; /* Text - Terminal white */

/* Risk System */
--risk-safe: #10b981; /* Green - Safe sites */
--risk-low: #84cc16; /* Lime - Low risk */
--risk-medium: #f59e0b; /* Amber - Medium risk */
--risk-high: #ff2a6d; /* Expose Red - High/Critical risk */
```

### Usage Guidelines

- **Plasma (#BC13FE)**: Primary actions, user nodes, ghost elements
- **Tracker (#00F0FF)**: Data streams, tracker visualization, secondary actions
- **Expose (#FF2A6D)**: High-risk trackers, critical alerts
- **Risk colors**: Safe (green), low (lime), medium (amber), high/critical (expose red)
- **Void/HUD**: Background and surface hierarchy
- **Terminal**: Primary text color

## Typography

### Font Stack

```css
/* Primary UI Font */
font-family:
  'Inter',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;

/* Monospace (for technical data) */
font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

### Type Scale

```css
/* Headlines */
--text-xl: 1.25rem; /* 20px - Section headers */
--text-lg: 1.125rem; /* 18px - Card titles */

/* Body Text */
--text-base: 1rem; /* 16px - Primary text */
--text-sm: 0.875rem; /* 14px - Secondary text */
--text-xs: 0.75rem; /* 12px - Labels, metadata */
```

### Usage Rules

- **Inter**: All UI text, buttons, labels
- **JetBrains Mono**: URLs, tracker names, technical identifiers
- **Bold weights**: Only for critical warnings or primary CTAs
- **Line height**: 1.5 for readability in dense information displays

## Component Patterns

### Glass Card (Signature Style)

```css
.phantom-card {
  background: rgba(22, 27, 34, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### Risk Indicator Badge

```css
.risk-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.risk-high {
  background: #ff2a6d;
  color: white;
}
.risk-medium {
  background: #f59e0b;
  color: white;
}
.risk-low {
  background: #10b981;
  color: white;
}
```

### Network Graph Styling

```css
.network-node {
  /* Tracker nodes: Red with opacity based on risk */
  /* Site nodes: Blue, larger size */
  /* Data broker nodes: Dark red, distinctive shape */
}

.network-edge {
  /* Data flow lines: Animated dashes for active tracking */
  /* Thickness indicates data volume */
  /* Color indicates risk level */
}
```

## Layout Principles

### Extension Popup (320px width)

- **Header**: Logo + current site status (60px)
- **Main Content**: Scrollable area (400px max height)
- **Footer**: Settings/chat toggle (40px)

### Side Panel (400px width)

- **Sidebar**: Navigation tabs (60px)
- **Content**: Full-height scrollable area
- **Responsive**: Collapse to icons on narrow screens

### Information Hierarchy

1. **Critical alerts** (red, prominent)
2. **Current site status** (large, central)
3. **Active trackers** (list, medium emphasis)
4. **Historical data** (charts, low emphasis)

## Animation Guidelines

### Micro-interactions

```css
/* Subtle hover states */
.interactive:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

/* Loading states */
.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Risk level changes */
.risk-change {
  animation: flash 0.5s ease-in-out;
}
```

### Performance Rules

- **Duration**: Max 300ms for UI transitions
- **Easing**: Use `ease-out` for entrances, `ease-in` for exits
- **Reduce motion**: Respect `prefers-reduced-motion`
- **60fps**: Animate only transform and opacity

## Accessibility Standards

### Color Contrast

- **Text on dark**: Minimum 4.5:1 ratio
- **Interactive elements**: 3:1 minimum
- **Status indicators**: Don't rely on color alone

### Keyboard Navigation

- **Tab order**: Logical flow through interface
- **Focus indicators**: Visible 2px blue outline
- **Skip links**: For screen readers in dense data

### Screen Reader Support

```html
<!-- Risk indicators -->
<span class="risk-badge" aria-label="High risk tracker detected">HIGH</span>

<!-- Network graph -->
<div role="img" aria-label="Data flow visualization showing 12 trackers">
  <!-- Loading states -->
  <div aria-live="polite" aria-label="Analyzing website..."></div>
</div>
```

## Data Visualization

### Network Graph

- **Nodes**: Circular for sites, square for trackers, diamond for brokers
- **Size**: Proportional to data volume or risk level
- **Color**: Consistent with risk palette
- **Labels**: Show on hover, not cluttered by default

### Charts & Metrics

- **Bar charts**: For tracker counts by category
- **Line charts**: For tracking activity over time
- **Pie charts**: Avoid - use horizontal bars instead
- **Color coding**: Consistent with risk levels

## Mobile Considerations

### Responsive Breakpoints

```css
/* Extension popup is fixed width, but side panel adapts */
@media (max-width: 480px) {
  .side-panel {
    width: 100vw;
  }
  .network-graph {
    height: 300px;
  }
  .text-base {
    font-size: 0.875rem;
  }
}
```

### Touch Targets

- **Minimum size**: 44px × 44px
- **Spacing**: 8px between interactive elements
- **Gestures**: Swipe to dismiss notifications

## Anti-Patterns to Avoid

### Visual

- ❌ Bright, saturated colors (looks unprofessional)
- ❌ Complex gradients or patterns (distracting)
- ❌ Comic Sans or playful fonts (undermines trust)
- ❌ Excessive animations (feels like malware)

### UX

- ❌ Auto-playing sounds (privacy tools should be silent)
- ❌ Popup notifications without user action
- ❌ Hiding critical information behind multiple clicks
- ❌ Using jargon without explanations

### Technical

- ❌ Loading states longer than 3 seconds
- ❌ Blocking the main thread with animations
- ❌ Memory leaks in network graph rendering
- ❌ Inaccessible color-only status indicators

## Implementation Checklist

### Before Coding

- [ ] Wireframe the information hierarchy
- [ ] Choose appropriate risk color coding
- [ ] Plan keyboard navigation flow
- [ ] Consider screen reader experience

### During Development

- [ ] Test with actual tracker data (not lorem ipsum)
- [ ] Verify color contrast ratios
- [ ] Test with browser zoom at 200%
- [ ] Validate HTML semantics

### Before Commit

- [ ] Test extension popup in Chrome
- [ ] Verify side panel responsive behavior
- [ ] Check performance with 50+ network nodes
- [ ] Test with screen reader (NVDA/JAWS)

## Brand Alignment

### Phantom Trail Identity

- **Trustworthy**: Professional color palette, clean typography
- **Transparent**: Clear information hierarchy, no hidden features
- **Empowering**: Users understand what's happening, not overwhelmed
- **Technical**: Monospace fonts for data, precise terminology

### Competitive Differentiation

- **Not like ad blockers**: More sophisticated, AI-powered insights
- **Not like VPNs**: Focus on awareness, not hiding
- **Not like antivirus**: Proactive education, not reactive blocking

This design system ensures Phantom Trail looks professional, trustworthy, and distinctly different from generic privacy tools while maintaining excellent usability and accessibility.
