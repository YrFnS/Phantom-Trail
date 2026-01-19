import React, { useState, useEffect } from 'react';
import { P2PSettings } from '../../lib/types';

interface P2PSettingsComponentProps {
  onSettingsChange?: (settings: P2PSettings) => void;
}

export const P2PSettingsComponent: React.FC<P2PSettingsComponentProps> = ({ 
  onSettingsChange 
}) => {
  const [settings, setSettings] = useState<P2PSettings>({
    joinPrivacyNetwork: false,
    shareAnonymousData: false,
    shareRegionalData: false,
    maxConnections: 10,
    autoReconnect: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['p2pSettings']);
      if (result.p2pSettings) {
        setSettings(result.p2pSettings);
      }
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  };

  const updateSetting = async <K extends keyof P2PSettings>(
    key: K, 
    value: P2PSettings[K]
  ) => {
    setLoading(true);
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      await chrome.storage.local.set({ p2pSettings: newSettings });
      onSettingsChange?.(newSettings);
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
          Peer-to-Peer Privacy Network
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Connect with other privacy-conscious users to compare practices and get recommendations. 
          All data is anonymized and shared directly between browsers - no servers involved.
        </p>
      </div>

      {/* Network Participation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Join Privacy Network
            </label>
            <p className="text-xs text-[var(--text-secondary)]">
              Connect with other Phantom Trail users for peer insights
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.joinPrivacyNetwork}
              onChange={(e) => updateSetting('joinPrivacyNetwork', e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.joinPrivacyNetwork && (
          <div className="ml-4 space-y-4 border-l-2 border-[var(--accent-primary)]/20 pl-4">
            {/* Data Sharing */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Share Anonymous Data
                </label>
                <p className="text-xs text-[var(--text-secondary)]">
                  Share privacy scores and tracker counts (no URLs or personal data)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.shareAnonymousData}
                  onChange={(e) => updateSetting('shareAnonymousData', e.target.checked)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Regional Data */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Share Regional Data
                </label>
                <p className="text-xs text-[var(--text-secondary)]">
                  Include broad geographic region for regional privacy insights
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.shareRegionalData}
                  onChange={(e) => updateSetting('shareRegionalData', e.target.checked)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Max Connections */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Maximum Connections: {settings.maxConnections}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.maxConnections}
                onChange={(e) => updateSetting('maxConnections', parseInt(e.target.value))}
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                <span>1 peer</span>
                <span>20 peers</span>
              </div>
            </div>

            {/* Auto Reconnect */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Auto Reconnect
                </label>
                <p className="text-xs text-[var(--text-secondary)]">
                  Automatically reconnect to peers when connections drop
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReconnect}
                  onChange={(e) => updateSetting('autoReconnect', e.target.checked)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Information */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-[var(--accent-primary)] mb-2">
          Privacy Protection
        </h4>
        <ul className="text-xs text-[var(--text-secondary)] space-y-1">
          <li>• No servers - direct peer-to-peer connections only</li>
          <li>• Privacy scores rounded to nearest 5 points</li>
          <li>• Tracker counts capped at 50 for anonymization</li>
          <li>• No URLs, domains, or personal data shared</li>
          <li>• Data exists only while browsers are connected</li>
          <li>• Connections automatically encrypted via WebRTC</li>
        </ul>
      </div>

      {loading && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-[var(--text-primary)] bg-[var(--bg-secondary)] transition ease-in-out duration-150">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[var(--accent-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Updating settings...
          </div>
        </div>
      )}
    </div>
  );
};
