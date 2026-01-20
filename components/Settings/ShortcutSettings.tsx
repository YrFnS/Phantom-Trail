import React, { useState, useEffect } from 'react';
import { KeyboardShortcuts, type ShortcutConfig } from '../../lib/keyboard-shortcuts';

interface ShortcutSettingsProps {
  className?: string;
}

export const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({ className = '' }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      const shortcutConfigs = await KeyboardShortcuts.getShortcuts();
      setShortcuts(shortcutConfigs);
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortcut = async (command: string) => {
    try {
      await KeyboardShortcuts.toggleShortcut(command);
      await loadShortcuts();
    } catch (error) {
      console.error('Failed to toggle shortcut:', error);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await KeyboardShortcuts.resetToDefaults();
      await loadShortcuts();
    } catch (error) {
      console.error('Failed to reset shortcuts:', error);
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'navigation': return '🧭';
      case 'analysis': return '🔍';
      case 'data': return '📊';
      case 'ui': return '🎨';
      default: return '⌨️';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'navigation': return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20';
      case 'analysis': return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20';
      case 'data': return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20';
      case 'ui': return 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20';
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-16 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-16 bg-[var(--bg-tertiary)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, ShortcutConfig[]>);

  return (
    <div className={`p-4 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
        <button
          onClick={handleResetToDefaults}
          className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] px-3 py-1 rounded-md hover:bg-[var(--bg-tertiary)]"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-[var(--accent-primary)] text-lg">💡</div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Keyboard Shortcuts Help</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              Use keyboard shortcuts to quickly access extension features. Press <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs">?</kbd> in the popup to see all available shortcuts.
            </div>
          </div>
        </div>
      </div>

      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getCategoryIcon(category)}</span>
            <h4 className="text-md font-medium text-[var(--text-primary)] capitalize">{category}</h4>
          </div>
          
          <div className="space-y-2">
            {categoryShortcuts.map((shortcut) => (
              <div key={shortcut.command} className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-[var(--text-primary)]">{shortcut.description}</div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(shortcut.category)}`}>
                        {shortcut.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-sm font-mono text-[var(--text-primary)]">
                        {shortcut.keys}
                      </kbd>
                      <span className="text-sm text-[var(--text-secondary)]">({shortcut.command})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shortcut.enabled}
                        onChange={() => handleToggleShortcut(shortcut.command)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Additional In-Page Shortcuts</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Toggle Tracking Overlay:</span>
            <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+Shift+T</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Show Site Analysis:</span>
            <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+Shift+S</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Toggle Blocking Mode:</span>
            <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+Shift+B</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Close Overlays:</span>
            <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs font-mono text-[var(--text-primary)]">Escape</kbd>
          </div>
        </div>
        <div className="text-xs text-[var(--text-tertiary)] mt-3">
          * In-page shortcuts work when browsing websites and cannot be customized.
        </div>
      </div>

      <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-[var(--warning)] text-lg">⚠️</div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Platform Differences</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              On Mac, <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-primary)]">Ctrl</kbd> is replaced with <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-primary)]">Cmd</kbd>. 
              Some shortcuts may conflict with browser or system shortcuts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
