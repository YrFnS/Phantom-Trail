import { useEffect, useMemo, useState } from 'react';
import type { DataProtectionSettings } from '../../lib/types';
import {
  DEFAULT_DATA_PROTECTION_SETTINGS,
} from '../../lib/data-protection-policy.mts';
import {
  DataProtectionStorage,
  type StorageInventory,
} from '../../lib/storage/data-protection-storage';
import { EventsStorage } from '../../lib/storage/events-storage';
import {
  CLEAR_ALL_CONFIRMATION_PHRASE,
  DataDeletionService,
  type DataDeletionReport,
} from '../../lib/data-deletion';
import { getAIOutboundPreview } from '../../lib/ai/outbound-payload.mts';
import { Button } from '../ui';

export function DataProtectionSettings() {
  const [settings, setSettings] = useState<DataProtectionSettings>({
    ...DEFAULT_DATA_PROTECTION_SETTINGS,
  });
  const [inventory, setInventory] = useState<StorageInventory | null>(null);
  const [managementGranted, setManagementGranted] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deletionReport, setDeletionReport] =
    useState<DataDeletionReport | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const outboundPreview = useMemo(
    () => getAIOutboundPreview(settings.aiOutboundMode),
    [settings.aiOutboundMode]
  );

  useEffect(() => {
    void loadState();
  }, []);

  const loadState = async () => {
    try {
      const [storedSettings, storedInventory, hasManagement] =
        await Promise.all([
          DataProtectionStorage.getSettings(),
          DataDeletionService.getInventory(),
          chrome.permissions
            .contains({ permissions: ['management'] })
            .catch(() => false),
        ]);
      setSettings(storedSettings);
      setInventory(storedInventory);
      setManagementGranted(hasManagement);
    } catch (loadError) {
      console.error('Failed to load data-protection controls:', loadError);
      setError('Data-protection controls could not be loaded.');
    }
  };

  const saveProtectionSettings = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await DataProtectionStorage.saveSettings(settings);
      const result = await EventsStorage.reapplyProtectionPolicy(saved);
      setSettings(saved);
      setInventory(await DataDeletionService.getInventory());
      setStatus(
        `Policy saved. ${result.changedRows} stored row${
          result.changedRows === 1 ? '' : 's'
        } re-sanitized and ${result.removedByRetention} expired row${
          result.removedByRetention === 1 ? '' : 's'
        } removed.`
      );
    } catch (saveError) {
      console.error('Failed to save data-protection policy:', saveError);
      setError('The data-protection policy could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const toggleManagementPermission = async () => {
    setBusy(true);
    setError(null);
    try {
      const changed = managementGranted
        ? await chrome.permissions.remove({ permissions: ['management'] })
        : await chrome.permissions.request({ permissions: ['management'] });
      const granted = await chrome.permissions.contains({
        permissions: ['management'],
      });
      setManagementGranted(granted);
      setStatus(
        changed
          ? granted
            ? 'Optional extension-discovery permission granted.'
            : 'Optional extension-discovery permission revoked.'
          : 'The optional permission state did not change.'
      );
    } catch (permissionError) {
      console.error('Failed to change optional permission:', permissionError);
      setError('The optional permission could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  const clearAllData = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const report = await DataDeletionService.clearAllData(confirmation);
      setDeletionReport(report);
      setSettings({ ...DEFAULT_DATA_PROTECTION_SETTINGS });
      setManagementGranted(false);
      setConfirmation('');
      setInventory(await DataDeletionService.getInventory());
      setStatus(
        report.success
          ? 'All extension-controlled storage areas were cleared.'
          : 'Deletion completed with one or more storage-area failures. Review the report below.'
      );
    } catch (deletionError) {
      console.error('Failed to clear all Phantom Trail data:', deletionError);
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Data deletion failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
        <h3 className="text-sm font-medium text-[var(--warning)] mb-1">
          Data minimization is not anonymity
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          These controls reduce local and outbound data. They do not secure a
          compromised browser profile, recall data already sent to a third
          party, or establish legal compliance.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Local event retention
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            The active policy is applied to new and existing stored rows.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text-primary)]">
            Stored URL detail
          </span>
          <select
            value={settings.urlRetentionMode}
            onChange={event =>
              setSettings({
                ...settings,
                urlRetentionMode: event.target.value as DataProtectionSettings['urlRetentionMode'],
              })
            }
            className="mt-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
          >
            <option value="origin-only">
              Origin only — recommended default
            </option>
            <option value="origin-and-path">
              Origin + redacted path — opt in
            </option>
          </select>
          <span className="block text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Query strings, fragments, URL credentials, and raw API details are
            always removed. Identifier-like path segments are redacted in the
            path-retention mode.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text-primary)]">
            Event retention period
          </span>
          <select
            value={settings.retentionDays}
            onChange={event =>
              setSettings({
                ...settings,
                retentionDays: Number(event.target.value) as DataProtectionSettings['retentionDays'],
              })
            }
            className="mt-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days — default</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days — maximum</option>
          </select>
        </label>
      </section>

      <section className="space-y-3 border-t border-[var(--border-primary)] pt-5">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            OpenRouter outbound fields
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            This preview is generated by the same builder used for requests.
          </p>
        </div>

        <select
          value={settings.aiOutboundMode}
          onChange={event =>
            setSettings({
              ...settings,
              aiOutboundMode: event.target.value as DataProtectionSettings['aiOutboundMode'],
            })
          }
          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)]"
        >
          <option value="counts-only">Counts only — default</option>
          <option value="include-domain-labels">
            Include up to five resource-domain labels
          </option>
        </select>

        <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--accent-primary)]">
            Included
          </p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1">
            {outboundPreview.includedFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
          <p className="text-[10px] uppercase tracking-wide text-[var(--success)] pt-1">
            Excluded
          </p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1">
            {outboundPreview.excludedFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--border-primary)] pt-5">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Optional privacy-tool discovery permission
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            The optional management permission reveals installed extension names
            and enabled state to Phantom Trail. It is not needed for detector,
            scoring, storage, or export behavior.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => void toggleManagementPermission()}
        >
          {managementGranted
            ? 'Revoke extension discovery'
            : 'Allow extension discovery'}
        </Button>
      </section>

      <section className="space-y-3 border-t border-[var(--border-primary)] pt-5">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Storage inventory
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Only area names, key counts, and byte totals are shown—never stored
            values.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {inventory?.areas.map(area => (
            <div
              key={area.area}
              className="rounded bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-2 text-center"
            >
              <div className="text-[10px] uppercase text-[var(--text-secondary)]">
                {area.area}
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {area.keyCount} keys
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">
                {area.bytesInUse === null
                  ? 'size unavailable'
                  : `${area.bytesInUse} bytes`}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Button
        onClick={() => void saveProtectionSettings()}
        disabled={busy}
        className="w-full"
      >
        {busy ? 'Applying policy...' : 'Save and reapply data policy'}
      </Button>

      <section className="space-y-3 border-t border-[var(--error)]/40 pt-5">
        <div className="rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/10 p-4">
          <h3 className="text-sm font-medium text-[var(--error)]">
            Clear All Data
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Clears local, session, and sync storage; alarms; badge state; the
            current peer session; and the optional extension-discovery
            permission. Downloaded exports and data already sent elsewhere are
            not recalled.
          </p>
          <p className="text-xs text-[var(--text-primary)] mt-3">
            Enter <strong>{CLEAR_ALL_CONFIRMATION_PHRASE}</strong>
          </p>
          <input
            value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--error)]/40 rounded-md text-sm text-[var(--text-primary)] font-mono"
          />
          <Button
            variant="danger"
            size="sm"
            className="mt-3 w-full"
            disabled={
              busy || confirmation.trim() !== CLEAR_ALL_CONFIRMATION_PHRASE
            }
            onClick={() => void clearAllData()}
          >
            {busy ? 'Clearing data...' : 'Permanently clear extension data'}
          </Button>
        </div>
      </section>

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

      {deletionReport && (
        <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-3 space-y-2">
          <h4 className="text-xs font-medium text-[var(--text-primary)]">
            Deletion report
          </h4>
          {deletionReport.storage.map(area => (
            <div
              key={area.area}
              className="flex justify-between text-xs text-[var(--text-secondary)]"
            >
              <span>{area.area}</span>
              <span>
                {area.cleared ? 'cleared' : `failed: ${area.error || 'unknown'}`}
              </span>
            </div>
          ))}
          <ul className="text-[10px] text-[var(--text-tertiary)] space-y-1 pt-1">
            {deletionReport.limitations.map(limit => (
              <li key={limit}>• {limit}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
