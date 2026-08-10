import { useEffect, useState } from 'react';
import { P2PStorage } from '../../lib/storage/p2p-storage';
import type { P2PSettings } from '../../lib/types';

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
    joinPrivacyNetwork: false,
    shareAnonymousData: false,
    shareRegionalData: false,
    maxConnections: 10,
    autoReconnect: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await P2PStorage.getSettings();
        setSettings(storedSettings);
      } catch (error) {
        console.error('Failed to load P2P settings:', error);
      }
    };

    void loadSettings();
  }, []);

  const updateSetting = async <K extends keyof P2PSettings>(
    key: K,
    value: P2PSettings[K]
  ) => {
    setLoading(true);
    try {
      const nextSettings = { ...settings, [key]: value };
      setSettings(nextSettings);
      await P2PStorage.saveSettings(nextSettings);
      onSettingsChange?.(nextSettings);
    } catch (error) {
      console.error('Failed to update P2P settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Experimental P2P Sample Exchange
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Phantom Trail can use Trystero to exchange self-reported aggregate
          samples with connected browsers. Peers are not authenticated, samples
          are not independently verified, and the resulting network is not a
          representative privacy benchmark.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-3">
        <h4 className="text-sm font-medium text-[var(--error)] mb-1">
          Network metadata disclosure
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          WebRTC and Trystero may use third-party signaling, relay, and NAT
          traversal infrastructure. Connected peers and infrastructure providers
          may observe ordinary connection metadata such as IP addresses. “P2P”
          does not mean that no servers or third parties are involved.
        </p>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Join experimental peer network"
          description="Off by default. Connect to an unauthenticated shared room for prototype peer samples."
          checked={settings.joinPrivacyNetwork}
          disabled={loading}
          onChange={checked => updateSetting('joinPrivacyNetwork', checked)}
        />

        {settings.joinPrivacyNetwork && (
          <div className="ml-4 space-y-5 border-l-2 border-[var(--accent-primary)]/20 pl-4">
            <ToggleRow
              label="Share reduced aggregate sample"
              description="Shares rounded score-related fields, capped event counts, risk distribution, category labels, and a rounded timestamp. This is data minimization—not a guarantee of anonymity."
              checked={settings.shareAnonymousData}
              disabled={loading}
              onChange={checked => updateSetting('shareAnonymousData', checked)}
            />

            <ToggleRow
              label="Include coarse region"
              description="Adds a broad region field when available. Leave disabled unless regional experimentation is specifically required."
              checked={settings.shareRegionalData}
              disabled={loading}
              onChange={checked => updateSetting('shareRegionalData', checked)}
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Requested connection limit: {settings.maxConnections}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.maxConnections}
                onChange={event =>
                  updateSetting(
                    'maxConnections',
                    Number.parseInt(event.target.value, 10)
                  )
                }
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                <span>1 peer</span>
                <span>20 peers</span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                The transport may not always enforce or reach this requested
                number.
              </p>
            </div>

            <ToggleRow
              label="Attempt automatic reconnection"
              description="Ask the experimental transport to reconnect after a dropped session. Successful recovery is not guaranteed."
              checked={settings.autoReconnect}
              disabled={loading}
              onChange={checked => updateSetting('autoReconnect', checked)}
            />
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Current prototype boundaries
        </h4>
        <ul className="text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
          <li>• Peer identity and data authenticity are not established.</li>
          <li>• Samples are self-reported and can be inaccurate or malicious.</li>
          <li>• A small connected group is not a population benchmark.</li>
          <li>• No URLs or domains are intended in the aggregate payload.</li>
          <li>• Normal WebRTC/signaling metadata can still be exposed.</li>
          <li>• Disconnecting clears the current in-memory peer session.</li>
        </ul>
      </div>

      {loading && (
        <div className="text-center text-xs text-[var(--accent-primary)]">
          Updating experimental P2P settings...
        </div>
      )}
    </div>
  );
}
