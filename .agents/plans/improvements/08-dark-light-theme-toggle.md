# Dark/Light Theme Toggle Implementation Plan

## Overview
Add theme switching functionality allowing users to choose between dark and light modes, improving accessibility and user preference accommodation.

## Technical Requirements

### Implementation Files
- `lib/theme-manager.ts` - Theme switching logic and persistence
- `styles/themes.css` - CSS custom properties for both themes
- `components/Settings/ThemeSettings.tsx` - Theme selection UI
- `components/ui/ThemeToggle.tsx` - Quick theme toggle component

## Core Implementation

### 1. Theme Manager (`lib/theme-manager.ts`)
```typescript
export class ThemeManager {
  static async getCurrentTheme(): Promise<Theme>
  static async setTheme(theme: Theme): Promise<void>
  static async toggleTheme(): Promise<void>
  static async getSystemTheme(): Promise<Theme>
  static async setAutoTheme(enabled: boolean): Promise<void>
}

enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}
```

### 2. Theme Configuration
```typescript
interface ThemeConfig {
  current: Theme;
  autoSwitch: boolean;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  current: Theme.AUTO,
  autoSwitch: true
};
```

### 3. CSS Custom Properties System
```css
/* styles/themes.css */
:root {
  /* Light theme (default) */
  --color-background: #ffffff;
  --color-surface: #f8f9fa;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #3b82f6;
}

[data-theme="dark"] {
  /* Dark theme overrides */
  --color-background: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-text-primary: #ffffff;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
  --color-accent: #60a5fa;
}
```

## Implementation Steps

### Phase 1: Theme System Foundation (20 minutes)
1. Create CSS custom properties for both themes
2. Implement ThemeManager with storage persistence
3. Add theme detection and application logic
4. Update existing components to use CSS variables

### Phase 2: Theme Toggle UI (15 minutes)
1. Create theme toggle component with icon switching
2. Add theme selection to settings page
3. Implement auto theme detection based on system preference
4. Add smooth theme transition animations

### Phase 3: Component Integration (10 minutes)
1. Update all existing components to support both themes
2. Add theme-aware icons and illustrations
3. Implement theme persistence across browser sessions
4. Test theme switching in all UI states

## User Experience

### Theme Toggle Options
- **Light Mode**: Clean, bright interface for daytime use
- **Dark Mode**: Easy on eyes for low-light environments
- **Auto Mode**: Follows system theme preference
- **Quick Toggle**: One-click switching between light/dark

### Visual Transitions
- **Smooth Animation**: 200ms transition between themes
- **Consistent Colors**: Maintain brand identity across themes
- **Accessibility**: Ensure sufficient contrast in both modes
- **Icon Updates**: Theme-appropriate icons and illustrations

## Technical Implementation

### 1. Theme Application Logic
```typescript
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  if (theme === Theme.AUTO) {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? Theme.DARK 
      : Theme.LIGHT;
    root.setAttribute('data-theme', systemTheme);
  } else {
    root.setAttribute('data-theme', theme);
  }
  
  // Trigger theme change event for components
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}
```

### 2. System Theme Detection
```typescript
function setupSystemThemeListener(): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  mediaQuery.addEventListener('change', (e) => {
    const currentConfig = await ThemeManager.getCurrentTheme();
    if (currentConfig === Theme.AUTO) {
      applyTheme(Theme.AUTO);
    }
  });
}
```

### 3. Theme Toggle Component
```typescript
export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<Theme>(Theme.AUTO);
  
  const toggleTheme = async () => {
    const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    await ThemeManager.setTheme(newTheme);
    setTheme(newTheme);
  };
  
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === Theme.LIGHT ? 'dark' : 'light'} theme`}
    >
      {theme === Theme.LIGHT ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
```

## Color Scheme Design

### Light Theme Colors
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --border-primary: #e2e8f0;
  --border-secondary: #cbd5e1;
  --accent-primary: #3b82f6;
  --accent-secondary: #1d4ed8;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

### Dark Theme Colors
```css
[data-theme="dark"] {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #262626;
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --border-primary: #404040;
  --border-secondary: #525252;
  --accent-primary: #60a5fa;
  --accent-secondary: #3b82f6;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
}
```

## Component Updates

### Existing Components to Update
1. **Popup App**: Main background and text colors
2. **Live Narrative**: Event cards and status indicators
3. **Network Graph**: Node and edge colors for visibility
4. **Chat Interface**: Message bubbles and input styling
5. **Settings**: Form controls and section backgrounds
6. **Privacy Score**: Score colors and progress indicators

### Theme-Aware Styling
```typescript
// Update existing Tailwind classes to use CSS variables
const cardClasses = `
  bg-[var(--bg-secondary)] 
  text-[var(--text-primary)] 
  border-[var(--border-primary)]
  hover:bg-[var(--bg-tertiary)]
`;
```

## Integration Points

### Settings Integration
- Add theme selection dropdown in main settings
- Include auto-theme toggle option
- Show current theme status
- Provide theme preview functionality

### Storage Integration
- Persist theme preference in chrome.storage.local
- Sync theme across extension contexts
- Handle storage errors gracefully
- Provide theme reset functionality

### Accessibility Integration
- Ensure WCAG contrast compliance in both themes
- Support high contrast mode detection
- Provide reduced motion options
- Test with screen readers

## Testing Strategy

### Visual Testing
1. Test all components in both light and dark themes
2. Verify color contrast meets accessibility standards
3. Test theme transitions are smooth and complete
4. Validate theme persistence across browser restarts

### Accessibility Testing
- Test with screen readers in both themes
- Verify keyboard navigation visibility
- Test high contrast mode compatibility
- Validate color-blind accessibility

### Performance Testing
- Measure theme switching performance
- Test CSS variable update efficiency
- Verify no layout shifts during theme changes
- Test memory usage with theme switching

## Success Metrics
- Users can easily discover and use theme toggle
- Theme switching is instant and smooth
- Both themes meet accessibility contrast requirements
- Theme preference persists across browser sessions

## Estimated Time: 45 minutes
- Phase 1: 20 minutes (theme system foundation)
- Phase 2: 15 minutes (theme toggle UI)
- Phase 3: 10 minutes (component integration)

## Future Enhancements
- Custom color theme creation
- Scheduled theme switching (day/night)
- High contrast theme option
- Theme sharing and import/export
