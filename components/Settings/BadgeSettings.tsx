import { useEffect, useState } from 'react';
import {
  BadgeManager,
  type BadgeSettings,
  BadgeStyle,
} from '../../lib/badge-manager';
import { ChromeTabs } from '../../lib/chrome-tabs';

export function BadgeSettingsComponent() {
  const [settings, setSettings] = useState<BadgeSettings>({
    enabled: false,
    style: BadgeStyle.GRADE_ONLY,
    showScore: false,
    showGrade: true,
    colorScheme: 'traffic-light',
    updateFrequency: 'realtime',
    showOnlyRisks: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettings(await BadgeManager.getBadgeSettings());
      } catch (error) {
        console.error('Failed to load heuristic badge settings:', error);
      }
    };

    void loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await BadgeManager.saveBadgeSettings(settings);
      const activeTab = await ChromeTabs.getActiveTab();
      if (activeTab?.id) {
        await BadgeManager.clearBadge(activeTab.id);
      }
    } catch (error) {
      console.error('Failed to save heuristic badge settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof BadgeSettings>(
    key: K,
    value: BadgeSettings[K]
  ) => {
    setSettings(previous => ({ ...previous, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Experimental Toolbar Badge
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Optionally display the current prototype grade or score in the browser
          toolbar. The value is a heuristic detector summary, not a privacy,
          security, or safety certification.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Enable experimental badge
          </label>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Disabled by default for new installations.
          </p>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={event => updateSetting('enabled', event.target.checked)}
          className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
        />
      </div>

      {settings.enabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Display format
            </label>
            <select
              value={settings.style}
              onChange={event =>
                updateSetting('style', event.target.value as BadgeStyle)
              }
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value={BadgeStyle.GRADE_ONLY}>
                Experimental letter grade
              </option>
              <option value={BadgeStyle.SCORE_ONLY}>
                Experimental numeric score
              </option>
              <option value={BadgeStyle.COMBINED}>Grade and score</option>
              <option value={BadgeStyle.ICON_COLOR}>Color only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Color mapping
            </label>
            <select
              value={settings.colorScheme}
              onChange={event =>
                updateSetting(
                  'colorScheme',
                  event.target.value as BadgeSettings['colorScheme']
                )
              }
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="traffic-light">Green / yellow / red</option>
              <option value="gradient">Prototype gradient</option>
              <option value="minimal">Neutral with elevated labels</option>
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Colors represent model thresholds only; green does not mean safe.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Show only elevated heuristics
              </label>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Hide the badge when the prototype score is 80 or higher.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showOnlyRisks}
              onChange={event =>
                updateSetting('showOnlyRisks', event.target.checked)
              }
              className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Requested refresh mode
            </label>
            <select
              value={settings.updateFrequency}
              onChange={event =>
                updateSetting(
                  'updateFrequency',
                  event.target.value as BadgeSettings['updateFrequency']
                )
              }
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="realtime">On recorded updates</option>
              <option value="periodic">Periodic prototype mode</option>
              <option value="manual">When manually refreshed</option>
            </select>
          </div>
        </>
      )}

      <button
        onClick={() => void handleSave()}
        disabled={loading}
        className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Saving...' : 'Save Badge Settings'}
      </button>
    </div>
  );
}
