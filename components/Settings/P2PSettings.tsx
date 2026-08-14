import { useEffect, useMemo, useState } from 'react';
import { P2PStorage } from '../../lib/storage/p2p-storage';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import type { P2PSettings } from '../../lib/types';
import {
  acknowledgeP2PConsent,
  DEFAULT_P2P_SETTINGS,
  getP2POutboundPreview,
  hasCurrentP2PConsent,
} from '../../lib/p2p-consent.mts';

interface P2PSettingsComponentProps {
  onSettingsChange?: (settings: P2PSettings) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
      </label>
    </div>
  );
}

export function P2PSettingsComponent({
  onSettingsChange,
}: P2PSettingsComponentProps) {
  const [settings, setSettings] = useState<P2PSettings>({
    ...DEFAULT_P2P_SETTINGS,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const preview = useMemo(() => getP2POutboundPreview(), []);
  const consentCurrent = hasCurrentP2PConsent(settings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettings(await P2PStorage.getSettings());
      } catch (error) {
        console.error('Failed to load P2P settings:', error);
      }
    };
    void loadSettings();
  }, []);

  const persistSettings = async (nextSettings: P2PSettings) => {
    const saved = await P2PStorage.saveSettings(nextSettings);
    setSettings(saved);
    onSettingsChange?.(saved);
    return saved;
  };

  const updateSetting = async <K extends keyof P2PSettings>(
    key: K,
    value: P2PSettings[K]
  ) => {
    setLoading(true);
    setStatus(null);
    try {
      if (
        (key === 'joinPrivacyNetwork' || key === 'shareAnonymousData') &&
        value === true &&
        !consentCurrent
      ) {
        setStatus('Review and acknowledge the current disclosure first.');
        return;
      }

      const saved = await persistSettings({ ...settings, [key]: value });
      const network = P2PPrivacyNetwork.getInstance();
      if (key === 'joinPrivacyNetwork') {
        if (saved.joinPrivacyNetwork) {
          await network.initializeNetwork();
        } else {
          await network.disconnectFromNetwork();
        }
      }
    } catch (error) {
      console.error('Failed to update P2P settings:', error);
      setStatus('The peer setting could not be changed.');
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (acknowledged: boolean) => {
    setLoading(true);
    setStatus(null);
    try {
      const next = acknowledgeP2PConsent(settings, acknowledged);
      const saved = await persistSettings(next);
      if (!acknowledged) {
        await P2PPrivacyNetwork.getInstance().disconnectFromNetwork();
      }
      setStatus(
        acknowledged
          ? 'Current P2P disclosure acknowledged. Connection and sharing remain separately disabled until selected.'
          : 'P2P consent revoked; connection and sharing were disabled.'
      );
      setSettings(saved);
    } catch (error) {
      console.error('Failed to update P2P consent:', error);
      setStatus('P2P consent could not be changed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Experimental P2P Aggregate Exchange
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Phantom Trail can use Trystero to exchange a minimized aggregate
          sample with connected browsers. Peers are unauthenticated, samples are
          self-reported, and no representative benchmark or reputation service
          is created.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-3">
        <h4 className="text-sm font-medium text-[var(--error)] mb-1">
          Connection metadata disclosure
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {preview.connectionMetadataWarning} “P2P” does not mean that servers,
          relays, or third-party infrastructure are absent.
        </p>
      </div>

      <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-3 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--accent-primary)]">
            Aggregate fields that may be shared
          </p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1 mt-1">
            {preview.includedFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--success)]">
            Fields excluded by the canonical payload builder
          </p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1 mt-1">
            {preview.excludedFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3">
        <input
          type="checkbox"
          checked={consentCurrent}
          onChange={event => void updateConsent(event.target.checked)}
          disabled={loading}
          className="mt-0.5 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
        />
        <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
          I reviewed the current aggregate payload and understand that peers are
          unauthenticated and WebRTC/signalling metadata can be exposed. This
          acknowledgement is versioned and can be revoked at any time.
        </span>
      </label>

      <div className="space-y-4">
        <ToggleRow
          label="Join experimental peer network"
          description="Connect to the aggregate-only P3 room. Off by default and disabled until the current disclosure is acknowledged."
          checked={settings.joinPrivacyNetwork}
          disabled={loading || !consentCurrent}
          onChange={checked =>
            void updateSetting('joinPrivacyNetwork', checked)
          }
        />

        {settings.joinPrivacyNetwork && consentCurrent && (
          <div className="ml-4 space-y-5 border-l-2 border-[var(--accent-primary)]/20 pl-4">
            <ToggleRow
              label="Share minimized aggregate sample"
              description="Connection alone does not share the local sample. Enable this separately to send the exact aggregate field set shown above."
              checked={settings.shareAnonymousData}
              disabled={loading}
              onChange={checked =>
                void updateSetting('shareAnonymousData', checked)
              }
            />

            <ToggleRow
              label="Include coarse region"
              description="No geolocation lookup is currently implemented, so enabling this does not add a region today. It remains a separate future-facing consent flag."
              checked={settings.shareRegionalData}
              disabled={loading || !settings.shareAnonymousData}
              onChange={checked =>
                void updateSetting('shareRegionalData', checked)
              }
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Accepted peer limit: {settings.maxConnections}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.maxConnections}
                onChange={event =>
                  void updateSetting(
                    'maxConnections',
                    Number.parseInt(event.target.value, 10)
                  )
                }
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Only this many peers can contribute samples or receive local
                broadcasts.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Current boundaries
        </h4>
        <ul className="text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
          <li>• Peer identity and sample authenticity are not established.</li>
          <li>
            • No domain-reputation request or domain exchange exists in P3.
          </li>
          <li>• A connected group is not a population benchmark.</li>
          <li>• Disconnecting clears the current in-memory peer session.</li>
          <li>• Clear All Data also revokes stored P2P consent.</li>
        </ul>
      </div>

      {status && (
        <div className="text-center text-xs text-[var(--accent-primary)]">
          {status}
        </div>
      )}
      {loading && (
        <div className="text-center text-xs text-[var(--accent-primary)]">
          Updating experimental P2P controls...
        </div>
      )}
    </div>
  );
}
