# Keyboard Shortcuts Implementation Plan

## Overview
Add keyboard shortcuts for power users to quickly access extension features without mouse interaction, improving workflow efficiency.

## Technical Requirements

### Chrome Permissions
```json
// manifest.json additions
"commands": {
  "toggle-popup": {
    "suggested_key": {
      "default": "Ctrl+Shift+P",
      "mac": "Command+Shift+P"
    },
    "description": "Toggle Phantom Trail popup"
  },
  "quick-analysis": {
    "suggested_key": {
      "default": "Ctrl+Shift+A",
      "mac": "Command+Shift+A"
    },
    "description": "Quick privacy analysis of current site"
  },
  "export-data": {
    "suggested_key": {
      "default": "Ctrl+Shift+E",
      "mac": "Command+Shift+E"
    },
    "description": "Export privacy data"
  }
}
```

### Implementation Files
- `entrypoints/background.ts` - Command listener integration
- `lib/keyboard-shortcuts.ts` - Shortcut handling logic
- `components/Settings/ShortcutSettings.tsx` - Shortcut configuration UI
- `components/ui/ShortcutHint.tsx` - Keyboard hint display component

## Core Implementation

### 1. Shortcut Handler (`lib/keyboard-shortcuts.ts`)
```typescript
export class KeyboardShortcuts {
  static async handleCommand(command: string): Promise<void>
  static async getShortcuts(): Promise<ShortcutConfig[]>
  static async updateShortcut(command: string, keys: string): Promise<void>
  static async resetToDefaults(): Promise<void>
}
```

### 2. Shortcut Configuration
```typescript
interface ShortcutConfig {
  command: string;
  keys: string;
  description: string;
  category: 'navigation' | 'analysis' | 'data' | 'ui';
  enabled: boolean;
}

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    command: 'toggle-popup',
    keys: 'Ctrl+Shift+P',
    description: 'Open/close extension popup',
    category: 'navigation',
    enabled: true
  },
  // ... more shortcuts
];
```

### 3. In-Page Shortcuts (Content Script)
```typescript
// Additional shortcuts that work on web pages
const IN_PAGE_SHORTCUTS = {
  'Ctrl+Shift+T': 'toggle-tracking-overlay',
  'Ctrl+Shift+S': 'show-site-analysis',
  'Ctrl+Shift+B': 'toggle-blocking-mode',
  'Escape': 'close-overlays'
};
```

## Implementation Steps

### Phase 1: Basic Command System (30 minutes)
1. Add command definitions to manifest.json
2. Implement command listener in background script
3. Create basic shortcut handling for popup toggle
4. Test cross-platform key combinations

### Phase 2: Advanced Shortcuts (20 minutes)
1. Add content script shortcuts for in-page actions
2. Implement quick analysis and export shortcuts
3. Add visual feedback for shortcut activation
4. Create shortcut conflict detection

### Phase 3: Configuration UI (10 minutes)
1. Create shortcut settings page
2. Add shortcut customization interface
3. Implement shortcut hints in UI components
4. Add help overlay showing all shortcuts

## Keyboard Shortcuts List

### Navigation Shortcuts
- **Ctrl+Shift+P**: Toggle extension popup
- **Ctrl+Shift+O**: Open side panel (if available)
- **Ctrl+Shift+S**: Focus on settings
- **Escape**: Close popup/overlays

### Analysis Shortcuts
- **Ctrl+Shift+A**: Quick privacy analysis of current site
- **Ctrl+Shift+R**: Refresh tracking data
- **Ctrl+Shift+C**: Open chat interface
- **Ctrl+Shift+N**: Show network graph

### Data Shortcuts
- **Ctrl+Shift+E**: Export privacy data
- **Ctrl+Shift+I**: Import settings
- **Ctrl+Shift+D**: Download current site report
- **Ctrl+Shift+X**: Clear tracking history

### UI Shortcuts
- **Tab**: Navigate between interface elements
- **Enter**: Activate focused element
- **Space**: Toggle checkboxes/switches
- **Arrow Keys**: Navigate lists and charts

## Technical Implementation

### 1. Background Script Integration
```typescript
// entrypoints/background.ts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    await KeyboardShortcuts.handleCommand(command);
  } catch (error) {
    console.error('Shortcut execution failed:', error);
  }
});

// Handle specific commands
async function handleCommand(command: string): Promise<void> {
  switch (command) {
    case 'toggle-popup':
      await togglePopup();
      break;
    case 'quick-analysis':
      await performQuickAnalysis();
      break;
    case 'export-data':
      await exportPrivacyData();
      break;
  }
}
```

### 2. Content Script Shortcuts
```typescript
// entrypoints/content.ts
document.addEventListener('keydown', (event) => {
  const shortcut = `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`;
  
  if (IN_PAGE_SHORTCUTS[shortcut]) {
    event.preventDefault();
    handleInPageShortcut(IN_PAGE_SHORTCUTS[shortcut]);
  }
});

function handleInPageShortcut(action: string): void {
  switch (action) {
    case 'toggle-tracking-overlay':
      showTrackingOverlay();
      break;
    case 'show-site-analysis':
      showQuickAnalysis();
      break;
  }
}
```

### 3. Visual Feedback System
```typescript
// Show temporary notification when shortcut is used
function showShortcutFeedback(action: string): void {
  const notification = document.createElement('div');
  notification.className = 'phantom-trail-shortcut-feedback';
  notification.textContent = `Action: ${action}`;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}
```

## User Experience

### Shortcut Discovery
- **Help Overlay**: Press `?` to show all available shortcuts
- **Tooltip Hints**: Show keyboard shortcuts in button tooltips
- **Settings Page**: Dedicated shortcuts configuration section
- **Onboarding**: Introduce key shortcuts during setup

### Visual Indicators
- **Shortcut Badges**: Show key combinations next to buttons
- **Feedback Animations**: Brief highlight when shortcut is used
- **Status Messages**: Confirm shortcut actions with brief messages
- **Conflict Warnings**: Alert users to shortcut conflicts

## Accessibility Features

### Screen Reader Support
- Announce shortcut availability
- Provide alternative navigation methods
- Ensure shortcuts work with assistive technology
- Add ARIA labels for shortcut hints

### Customization Options
- Allow users to disable shortcuts
- Support alternative key combinations
- Provide single-key shortcuts for accessibility
- Enable voice command integration (future)

## Integration Points

### Popup Interface
- Add shortcut hints to all major buttons
- Implement keyboard navigation between sections
- Show active shortcuts in status bar
- Provide shortcut help button

### Settings Integration
- Dedicated shortcuts configuration page
- Shortcut conflict detection and resolution
- Import/export shortcut configurations
- Reset to defaults option

### Chat Interface
- Keyboard shortcuts for common queries
- Quick access to analysis functions
- Navigation shortcuts for chat history
- Voice input shortcuts (future)

## Testing Strategy

### Cross-Platform Testing
1. Test shortcuts on Windows, Mac, and Linux
2. Verify key combination compatibility
3. Test with different keyboard layouts
4. Ensure shortcuts don't conflict with browser/OS

### Accessibility Testing
- Test with screen readers
- Verify keyboard-only navigation
- Test with assistive technology
- Validate ARIA labels and announcements

### User Experience Testing
- Test shortcut discoverability
- Verify visual feedback clarity
- Test customization interface usability
- Validate help system effectiveness

## Success Metrics
- Power users adopt and regularly use shortcuts
- Shortcut usage reduces mouse interaction time
- No conflicts with browser or system shortcuts
- Accessibility compliance for keyboard navigation

## Estimated Time: 1 hour
- Phase 1: 30 minutes (basic command system)
- Phase 2: 20 minutes (advanced shortcuts)
- Phase 3: 10 minutes (configuration UI)

## Future Enhancements
- Voice command integration
- Gesture shortcuts for touch devices
- Customizable shortcut sequences
- Context-aware shortcut suggestions
