import { useState, useEffect } from 'react';
import {
  BadgeManager,
  BadgeSettings,
  BadgeStyle,
} from '../../lib/badge-manager';
import { ChromeTabs } from '../../lib/chrome-tabs';

export function BadgeSettingsComponent() {
  const [settings, setSettings] = useState<BadgeSettings>({
    enabled: true,
    style: BadgeStyle.GRADE_ONLY,
    showScore: true,
    showGrade: true,
    colorScheme: 'traffic-light',
    updateFrequency: 'realtime',
    showOnlyRisks: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await BadgeManager.getBadgeSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load badge settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await BadgeManager.saveBadgeSettings(settings);

      // Update current tab badge immediately to show changes
      const activeTab = await ChromeTabs.getActiveTab();
      if (activeTab?.id) {
        if (settings.enabled) {
          // Force badge update by clearing and setting again
          await BadgeManager.clearBadge(activeTab.id);
          // Badge will be updated by the background script on next tracking event
        } else {
          await BadgeManager.clearBadge(activeTab.id);
        }
      }
    } catch (error) {
      console.error('Failed to save badge settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof BadgeSettings>(
    key: K,
    value: BadgeSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          Privacy Badge
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Show privacy scores directly in your browser toolbar for instant
          feedback.
        </p>
      </div>

      {/* Enable/Disable Badge */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Enable Privacy Badge
          </label>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Show privacy scores in the browser toolbar
          </p>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={e => updateSetting('enabled', e.target.checked)}
          className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
        />
      </div>

      {settings.enabled && (
        <>
          {/* Badge Style */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Badge Style
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <input
                  type="radio"
                  name="badgeStyle"
                  value={BadgeStyle.GRADE_ONLY}
                  checked={settings.style === BadgeStyle.GRADE_ONLY}
                  onChange={e =>
                    updateSetting('style', e.target.value as BadgeStyle)
                  }
                  className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Grade Only
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Show letter grade (A, B, C, D, F)
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-green-500 text-white text-xs rounded font-bold">
                    A
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <input
                  type="radio"
                  name="badgeStyle"
                  value={BadgeStyle.SCORE_ONLY}
                  checked={settings.style === BadgeStyle.SCORE_ONLY}
                  onChange={e =>
                    updateSetting('style', e.target.value as BadgeStyle)
                  }
                  className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Score Only
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Show numeric score (0-100)
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-green-500 text-white text-xs rounded font-bold">
                    85
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <input
                  type="radio"
                  name="badgeStyle"
                  value={BadgeStyle.COMBINED}
                  checked={settings.style === BadgeStyle.COMBINED}
                  onChange={e =>
                    updateSetting('style', e.target.value as BadgeStyle)
                  }
                  className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Combined
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Show both grade and score
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-green-500 text-white text-xs rounded font-bold">
                    A85
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <input
                  type="radio"
                  name="badgeStyle"
                  value={BadgeStyle.ICON_COLOR}
                  checked={settings.style === BadgeStyle.ICON_COLOR}
                  onChange={e =>
                    updateSetting('style', e.target.value as BadgeStyle)
                  }
                  className="mr-3 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Icon Color Only
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Change icon color based on score
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                </div>
              </label>
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Color Scheme
            </label>
            <select
              value={settings.colorScheme}
              onChange={e =>
                updateSetting(
                  'colorScheme',
                  e.target.value as BadgeSettings['colorScheme']
                )
              }
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="traffic-light">
                Traffic Light (Green/Yellow/Red)
              </option>
              <option value="gradient">
                Gradient (Smooth color transitions)
              </option>
              <option value="minimal">Minimal (Gray with red alerts)</option>
            </select>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              Advanced Options
            </h4>

            <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Show Only Risks
                </label>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Only show badge when privacy score is below 80
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showOnlyRisks}
                onChange={e => updateSetting('showOnlyRisks', e.target.checked)}
                className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Update Frequency
              </label>
              <select
                value={settings.updateFrequency}
                onChange={e =>
                  updateSetting(
                    'updateFrequency',
                    e.target.value as BadgeSettings['updateFrequency']
                  )
                }
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              >
                <option value="realtime">Real-time (Immediate updates)</option>
                <option value="periodic">Periodic (Every 5 seconds)</option>
                <option value="manual">Manual (Only when popup opens)</option>
              </select>
            </div>
          </div>

          {/* Color Preview */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Color Preview
            </label>
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  90-100
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-lime-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  B
                </div>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  80-89
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  70-79
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  D
                </div>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  60-69
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  F
                </div>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  0-59
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Badge Settings'}
        </button>
      </div>
    </div>
  );
}
