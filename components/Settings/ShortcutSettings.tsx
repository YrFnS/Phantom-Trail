import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardShortcuts,
  type ShortcutConfig,
} from '../../lib/keyboard-shortcuts';
import { Button } from '../ui';

interface ShortcutSettingsProps {
  className?: string;
}

export function ShortcutSettings({ className = '' }: ShortcutSettingsProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShortcuts = useCallback(async () => {
    try {
      setShortcuts(await KeyboardShortcuts.getShortcuts());
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShortcuts();
  }, [loadShortcuts]);

  const toggle = async (command: string) => {
    await KeyboardShortcuts.toggleShortcut(command);
    await loadShortcuts();
  };

  const reset = async () => {
    await KeyboardShortcuts.resetToDefaults();
    await loadShortcuts();
  };

  const openBrowserShortcutSettings = async () => {
    try {
      await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } catch (error) {
      console.warn('Could not open browser shortcut settings:', error);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-5 rounded bg-[var(--bg-tertiary)]" />
        <div className="h-16 rounded bg-[var(--bg-tertiary)]" />
        <div className="h-16 rounded bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 p-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Working browser commands only
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          P4 removed the broken background export command and the advertised
          in-page overlay/blocking shortcuts. The two commands below open the
          real popup views they describe.
        </p>
      </div>

      <div className="space-y-2">
        {shortcuts.map(shortcut => (
          <label
            key={shortcut.command}
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3"
          >
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                {shortcut.description}
              </span>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                <kbd className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono">
                  {shortcut.keys}
                </kbd>{' '}
                • {shortcut.command}
              </span>
            </span>
            <input
              type="checkbox"
              checked={shortcut.enabled}
              onChange={() => void toggle(shortcut.command)}
              className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void openBrowserShortcutSettings()}
        >
          Open Chrome shortcut settings
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void reset()}>
          Reset local enablement
        </Button>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--text-tertiary)]">
        Chrome controls the actual key assignment. Phantom Trail stores only
        whether it should respond when Chrome invokes a declared command.
      </p>
    </div>
  );
}
