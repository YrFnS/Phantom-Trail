import React, { useState, useEffect } from 'react';
import { SyncManager, SyncSettings, SyncStatus } from '../../lib/sync-manager';

interface SyncSettingsProps {
  onClose?: () => void;
}

export const SyncSettingsComponent: React.FC<SyncSettingsProps> = ({
  onClose,
}) => {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const syncSettings = await SyncManager.getSyncSettings();
      setSettings(syncSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    }
  };

  const loadStatus = async () => {
    try {
      const syncStatus = await SyncManager.getSyncStatus();
      setStatus(syncStatus);
    } catch (err) {
      console.warn('Failed to load sync status:', err);
    }
  };

  const handleToggleSync = async () => {
    if (!settings) return;

    setIsLoading(true);
    setError(null);

    try {
      if (settings.enabled) {
        await SyncManager.disableSync();
      } else {
        await SyncManager.enableSync();
      }
      await loadSettings();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle sync');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = async (
    key: keyof SyncSettings,
    value: boolean | string
  ) => {
    if (!settings) return;

    try {
      const newSettings = { ...settings, [key]: value };
      await SyncManager.setSyncSettings({ [key]: value });
      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await SyncManager.syncNow();
      if (!result.success) {
        setError(result.error || 'Sync failed');
      } else if (result.conflicts.length > 0) {
        setError(`Sync completed with ${result.conflicts.length} conflicts`);
      }
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'syncing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'success':
        return 'Synced successfully';
      case 'error':
        return 'Sync failed';
      case 'syncing':
        return 'Syncing...';
      default:
        return 'Ready to sync';
    }
  };

  if (!settings) {
    return (
      <div className="p-4">
        <div className="animate-pulse">Loading sync settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-[var(--bg-primary)] rounded-lg shadow-lg border border-[var(--border-primary)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Sync Settings
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-md">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Sync Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Sync Status</span>
          <span
            className={`text-sm ${status ? getStatusColor(status.status) : 'text-gray-600'}`}
          >
            {status ? getStatusText(status.status) : 'Unknown'}
          </span>
        </div>

        {status && (
          <>
            <div className="text-xs text-gray-500 mb-2">
              Last sync: {formatLastSync(status.lastSyncTime)}
            </div>
            {status.deviceCount && status.deviceCount > 1 && (
              <div className="text-xs text-gray-500">
                Synced across {status.deviceCount} devices
              </div>
            )}
          </>
        )}
      </div>

      {/* Enable/Disable Sync */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Enable Sync</h3>
            <p className="text-xs text-gray-500">
              Sync your settings across all devices
            </p>
          </div>
          <button
            onClick={handleToggleSync}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {settings.enabled && (
        <>
          {/* Sync Data Types */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              What to Sync
            </h3>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncPrivacySettings}
                  onChange={e =>
                    handleSettingChange('syncPrivacySettings', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Privacy Settings
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncTrustedSites}
                  onChange={e =>
                    handleSettingChange('syncTrustedSites', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Trusted Sites
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncPrivacyGoals}
                  onChange={e =>
                    handleSettingChange('syncPrivacyGoals', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Privacy Goals
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncExportSchedules}
                  onChange={e =>
                    handleSettingChange('syncExportSchedules', e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Export Schedules
                </span>
              </label>
            </div>
          </div>

          {/* Conflict Resolution */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Conflict Resolution
            </h3>
            <select
              value={settings.conflictResolution}
              onChange={e =>
                handleSettingChange('conflictResolution', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="newest-wins">Newest Wins</option>
              <option value="merge">Smart Merge</option>
              <option value="manual">Manual Resolution</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How to handle conflicts when data differs between devices
            </p>
          </div>

          {/* Manual Sync Button */}
          <div className="flex gap-2">
            <button
              onClick={handleManualSync}
              disabled={isLoading || status?.status === 'syncing'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || status?.status === 'syncing'
                ? 'Syncing...'
                : 'Sync Now'}
            </button>
          </div>
        </>
      )}

      {/* Sync Info */}
      <div className="mt-6 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-700">
          <strong>Privacy Note:</strong> Your data is synced through
          Chrome&apos;s secure sync service. Sensitive information like tracking
          events and API keys are never synced.
        </p>
      </div>
    </div>
  );
};

export default SyncSettingsComponent;
