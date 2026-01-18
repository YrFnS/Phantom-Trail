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
      case 'navigation': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'analysis': return 'bg-green-50 text-green-700 border-green-200';
      case 'data': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ui': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
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
        <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
        <button
          onClick={handleResetToDefaults}
          className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-lg">💡</div>
          <div>
            <div className="text-sm font-medium text-blue-900">Keyboard Shortcuts Help</div>
            <div className="text-sm text-blue-700 mt-1">
              Use keyboard shortcuts to quickly access extension features. Press <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">?</kbd> in the popup to see all available shortcuts.
            </div>
          </div>
        </div>
      </div>

      {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getCategoryIcon(category)}</span>
            <h4 className="text-md font-medium text-gray-900 capitalize">{category}</h4>
          </div>
          
          <div className="space-y-2">
            {categoryShortcuts.map((shortcut) => (
              <div key={shortcut.command} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900">{shortcut.description}</div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(shortcut.category)}`}>
                        {shortcut.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                        {shortcut.keys}
                      </kbd>
                      <span className="text-sm text-gray-500">({shortcut.command})</span>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Additional In-Page Shortcuts</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Toggle Tracking Overlay:</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+Shift+T</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Show Site Analysis:</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+Shift+S</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Toggle Blocking Mode:</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+Shift+B</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Close Overlays:</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">Escape</kbd>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          * In-page shortcuts work when browsing websites and cannot be customized.
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 text-lg">⚠️</div>
          <div>
            <div className="text-sm font-medium text-yellow-900">Platform Differences</div>
            <div className="text-sm text-yellow-700 mt-1">
              On Mac, <kbd className="px-1 py-0.5 bg-yellow-100 rounded text-xs">Ctrl</kbd> is replaced with <kbd className="px-1 py-0.5 bg-yellow-100 rounded text-xs">Cmd</kbd>. 
              Some shortcuts may conflict with browser or system shortcuts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
