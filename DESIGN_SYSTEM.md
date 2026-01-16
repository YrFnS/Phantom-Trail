# Phantom Trail Design System

## Overview
Dark cyberpunk-inspired privacy theme with neon accents. Designed to feel professional, modern, and distinctive - not generic AI-generated.

## Color Palette

### Background Colors
- **Primary Background**: `#0a0a0f` (dark-900) - Deep black-blue
- **Secondary Background**: `#13131a` (dark-800) - Card backgrounds
- **Tertiary Background**: `#1a1a24` (dark-700) - Hover states, inputs
- **Border Color**: `#24243a` (dark-600) - Subtle borders

### Accent Colors (Neon)
- **Purple**: `#a855f7` - Primary actions, highlights
- **Pink**: `#ec4899` - Secondary accents
- **Cyan**: `#06b6d4` - Info, links
- **Green**: `#10b981` - Success states

### Text Colors
- **Primary Text**: `#ffffff` - Headings
- **Secondary Text**: `#e5e7eb` - Body text
- **Tertiary Text**: `#9ca3af` - Muted text
- **Disabled Text**: `#6b7280` - Disabled states

### Risk Level Colors
- **Low Risk**: Green (`#10b981`) with 20% opacity background
- **Medium Risk**: Yellow (`#f59e0b`) with 20% opacity background
- **High Risk**: Orange (`#f97316`) with 20% opacity background
- **Critical Risk**: Red (`#ef4444`) with 20% opacity background

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, sans-serif
```

### Sizes
- **Headings**: 
  - H1: `text-lg` (18px) - Main title
  - H2: `text-base` (16px) - Section headers
  - H3: `text-sm` (14px) - Card headers
- **Body**: `text-sm` (14px)
- **Small**: `text-xs` (12px) - Labels, captions

### Weights
- **Bold**: `font-bold` (700) - Headings, emphasis
- **Semibold**: `font-semibold` (600) - Subheadings
- **Medium**: `font-medium` (500) - Default
- **Normal**: `font-normal` (400) - Body text

## Components

### Card
```tsx
<Card>
  <CardHeader>
    <h3 className="text-white">Title</h3>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```
- Background: `bg-dark-800`
- Border: `border-dark-600`
- Rounded: `rounded-lg`
- Shadow: `shadow-lg`

### Button
**Primary** (Purple neon):
- Background: `bg-neon-purple`
- Hover: `hover:bg-purple-600`
- Shadow: `shadow-neon-purple`

**Secondary** (Dark):
- Background: `bg-dark-700`
- Border: `border-dark-600`
- Hover: `hover:bg-dark-600`

**Ghost** (Transparent):
- Text: `text-gray-400`
- Hover: `hover:bg-dark-700`

### Badge
- Border: `border` with rounded-full
- Padding: `px-2 py-1`
- Font: `text-xs font-medium`
- Colors match risk levels

### Input Fields
- Background: `bg-dark-700`
- Border: `border-dark-600`
- Focus: `focus:ring-2 focus:ring-neon-purple`
- Text: `text-gray-200`
- Placeholder: `placeholder-gray-500`

## Layout

### Spacing
- **Tight**: `space-y-1` (4px) - Compact lists
- **Normal**: `space-y-2` (8px) - Default spacing
- **Relaxed**: `space-y-3` (12px) - Sections
- **Loose**: `space-y-4` (16px) - Major sections

### Padding
- **Compact**: `p-2` (8px) - Small cards
- **Normal**: `p-3` (12px) - Default
- **Comfortable**: `p-4` (16px) - Main containers

### Borders
- **Subtle**: `border-dark-600` - Default borders
- **Neon**: `border-neon-purple` with glow effect
- **Accent**: Left border `border-l-4` for highlights

## Effects

### Shadows
- **Card Shadow**: `shadow-lg`
- **Neon Glow**: `shadow-neon-purple` (0 0 20px rgba(168, 85, 247, 0.3))

### Animations
- **Fade In**: `animate-fade-in` (0.3s ease-out)
- **Pulse Glow**: For active elements
- **Hover Transitions**: `transition-colors duration-200`

### Scrollbars
- Width: 8px
- Track: `#1a1a24`
- Thumb: `#a855f7` (neon purple)
- Hover: `#c084fc` (lighter purple)

## Accessibility

### Contrast Ratios
- White text on dark-800: 15:1 (AAA)
- Gray-300 text on dark-800: 8:1 (AAA)
- Neon colors on dark backgrounds: 7:1+ (AA)

### Focus States
- Ring: `focus-visible:ring-2`
- Color: `focus-visible:ring-neon-purple`
- Offset: `focus-visible:ring-offset-2`

### Interactive States
- Hover: Brightness increase or background change
- Active: Slight scale or color shift
- Disabled: 50% opacity, cursor-not-allowed

## Usage Guidelines

### Do's ✅
- Use neon colors sparingly for emphasis
- Maintain consistent spacing (4px grid)
- Use semantic color meanings (green=good, red=bad)
- Provide clear visual feedback for interactions
- Keep text readable with sufficient contrast

### Don'ts ❌
- Don't overuse neon colors (causes eye strain)
- Don't use pure white backgrounds
- Don't mix light and dark themes
- Don't use color as the only indicator
- Don't create low-contrast text

## Component Examples

### Privacy Score Display
```tsx
<div className="bg-dark-800 rounded-lg p-3 border border-dark-600 neon-border">
  <div className="text-xs font-medium text-neon-cyan uppercase">
    Current Site
  </div>
  <PrivacyScoreBadge score={85} grade="A" color="green" />
</div>
```

### Alert/Warning
```tsx
<div className="p-3 bg-red-500/10 rounded-lg border-l-4 border-red-400">
  <p className="text-sm text-red-300">Critical tracking detected</p>
</div>
```

### Navigation Tabs
```tsx
<div className="flex gap-1 bg-dark-800 p-1 rounded-lg border border-dark-600">
  <Button variant="primary" size="sm">Active</Button>
  <Button variant="ghost" size="sm">Inactive</Button>
</div>
```

## Responsive Behavior

### Extension Popup
- Fixed width: 400px
- Min height: 500px
- Max height: 600px
- Scrollable content areas

### Breakpoints
Not applicable for Chrome extension popup (fixed size)

## Future Enhancements

### Potential Additions
- Animated gradient backgrounds
- Particle effects for network graph
- Smooth page transitions
- Custom loading animations
- Glassmorphism effects for overlays

### Accessibility Improvements
- High contrast mode toggle
- Reduced motion support
- Font size preferences
- Color blind friendly palette option
