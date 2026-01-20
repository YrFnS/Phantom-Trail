import { useState, useEffect } from 'react';
import { NotificationManager } from '../../lib/notification-manager';
import type { NotificationSettings as NotificationSettingsType } from '../../lib/types';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType>({
    enabled: true,
    criticalOnly: false,
    dailySummary: true,
    weeklyReport: false,
    quietHours: { start: '22:00', end: '08:00' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Get current settings from NotificationManager
      const enabled = await NotificationManager.isEnabled();
      setSettings(prev => ({ ...prev, enabled }));
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async <K extends keyof NotificationSettingsType>(
    key: K, 
    value: NotificationSettingsType[K]
  ) => {
    try {
      setSaving(true);
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await NotificationManager.updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursChange = async (type: 'start' | 'end', value: string) => {
    const newQuietHours = { ...settings.quietHours, [type]: value };
    await handleSettingChange('quietHours', newQuietHours);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-[var(--bg-tertiary)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Notification Settings
        </h3>
        
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Enable Notifications
            </label>
            <p className="text-xs text-[var(--text-secondary)]">
              Show browser notifications for privacy alerts
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
          </label>
        </div>

        {settings.enabled && (
          <>
            {/* Critical Only */}
            <div className="flex items-center justify-between py-3 border-t border-[var(--border-primary)]">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Critical Alerts Only
                </label>
                <p className="text-xs text-[var(--text-secondary)]">
                  Only show notifications for critical privacy threats
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.criticalOnly}
                  onChange={(e) => handleSettingChange('criticalOnly', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>

            {/* Daily Summary */}
            <div className="flex items-center justify-between py-3 border-t border-[var(--border-primary)]">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Daily Summary
                </label>
                <p className="text-xs text-[var(--text-secondary)]">
                  Daily privacy score and tracking summary
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailySummary}
                  onChange={(e) => handleSettingChange('dailySummary', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>

            {/* Quiet Hours */}
            <div className="py-3 border-t border-[var(--border-primary)]">
              <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                Quiet Hours
              </label>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                No notifications during these hours
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-[var(--text-secondary)]">From:</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    disabled={saving}
                    className="px-2 py-1 text-xs border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-[var(--text-secondary)]">To:</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    disabled={saving}
                    className="px-2 py-1 text-xs border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {saving && (
          <div className="text-xs text-[var(--accent-primary)] mt-2">
            Saving settings...
          </div>
        )}
      </div>
    </div>
  );
}
