import { useCallback, useEffect, useState } from 'react';
import { NotificationManager } from '../../lib/notification-manager';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../lib/notification-policy.mts';
import type { NotificationSettings as NotificationSettingsType } from '../../lib/types';
import { Button } from '../ui';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({
  className = '',
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType>({
    ...DEFAULT_NOTIFICATION_SETTINGS,
  });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCapability = useCallback(async () => {
    try {
      const capability = await NotificationManager.getCapability();
      setSettings(capability.settings);
      setPermissionGranted(capability.permissionGranted);
    } catch (loadError) {
      console.error('Failed to load evidence alert settings:', loadError);
      setError('Evidence alert settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCapability();
  }, [loadCapability]);

  const persist = async (next: NotificationSettingsType) => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await NotificationManager.updateSettings(next);
      setSettings(saved);
      setStatus('Evidence alert settings saved.');
    } catch (saveError) {
      console.error('Failed to save evidence alert settings:', saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Evidence alert settings could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  };

  const enableAlerts = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      let granted = permissionGranted;
      if (!granted) granted = await NotificationManager.requestPermission();
      setPermissionGranted(granted);
      if (!granted) {
        setError('Browser notification permission was not granted.');
        return;
      }
      const saved = await NotificationManager.updateSettings({
        ...settings,
        enabled: true,
      });
      setSettings(saved);
      setStatus('Evidence alerts enabled.');
    } catch (enableError) {
      console.error('Failed to enable evidence alerts:', enableError);
      setError('Evidence alerts could not be enabled.');
    } finally {
      setSaving(false);
    }
  };

  const disableAlerts = async () => {
    await persist({ ...settings, enabled: false, dailySummary: false });
  };

  const revokePermission = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await NotificationManager.revokePermission();
      setPermissionGranted(false);
      setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
      setStatus('Notification permission revoked and alerts disabled.');
    } catch (revokeError) {
      console.error('Failed to revoke notification permission:', revokeError);
      setError('Notification permission could not be revoked.');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    setSaving(true);
    setError(null);
    try {
      const shown = await NotificationManager.showTestNotification();
      setStatus(
        shown
          ? 'A test evidence notification was created.'
          : 'The test notification could not be created.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-5 rounded bg-[var(--bg-tertiary)]" />
        <div className="h-20 rounded bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Optional evidence alerts
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          Off by default. Alerts can describe newly stored, score-qualified
          high/critical detector evidence and an optional completed daily local
          snapshot. They are not security incidents or proof of collection.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Browser permission
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {permissionGranted
                ? 'Granted for Phantom Trail.'
                : 'Not granted. No browser notifications can be created.'}
            </p>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wide ${
              permissionGranted
                ? 'text-[var(--success)]'
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            {permissionGranted ? 'Granted' : 'Off'}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          {!permissionGranted ? (
            <Button
              size="sm"
              disabled={saving}
              onClick={() => void enableAlerts()}
            >
              Allow and enable
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={saving}
                onClick={() => void testNotification()}
              >
                Send test
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => void revokePermission()}
              >
                Revoke permission
              </Button>
            </>
          )}
        </div>
      </div>

      {permissionGranted && (
        <div className="space-y-4">
          <ToggleRow
            label="Evidence alerts"
            description="Notify only for newly appended score-qualified evidence carrying a high or critical prototype label."
            checked={settings.enabled}
            disabled={saving}
            onChange={checked =>
              checked ? void enableAlerts() : void disableAlerts()
            }
          />

          <ToggleRow
            label="Critical label only"
            description="When enabled, high-label evidence remains in the popup but does not create an alert."
            checked={settings.criticalOnly}
            disabled={saving || !settings.enabled}
            onChange={checked =>
              void persist({ ...settings, criticalOnly: checked })
            }
          />

          <ToggleRow
            label="Daily local snapshot summary"
            description="Create one notification after the real daily report alarm stores its snapshot. N/A is preserved."
            checked={settings.dailySummary}
            disabled={saving || !settings.enabled}
            onChange={checked =>
              void persist({ ...settings, dailySummary: checked })
            }
          />

          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Quiet hours
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Alerts are suppressed during this local-time interval.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TimeField
                label="Start"
                value={settings.quietHours.start}
                disabled={saving || !settings.enabled}
                onChange={value =>
                  void persist({
                    ...settings,
                    quietHours: { ...settings.quietHours, start: value },
                  })
                }
              />
              <TimeField
                label="End"
                value={settings.quietHours.end}
                disabled={saving || !settings.enabled}
                onChange={value =>
                  void persist({
                    ...settings,
                    quietHours: { ...settings.quietHours, end: value },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="rounded border border-[var(--success)]/30 bg-[var(--success)]/10 p-3 text-xs text-[var(--success)]">
          {status}
        </div>
      )}
      {error && (
        <div className="rounded border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-xs text-[var(--error)]">
          {error}
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
      <span>
        <span className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-[var(--text-secondary)]">
      {label}
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
      />
    </label>
  );
}
