import React, { useState, useEffect } from 'react';
import { TrustLevel } from '../../lib/trusted-sites-manager';
import { TrustedSites } from '../TrustedSites';

interface TrustedSitesSettingsProps {
  className?: string;
}

export const TrustedSitesSettings: React.FC<TrustedSitesSettingsProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState({
    autoSuggestTrust: true,
    verificationInterval: 30,
    defaultTrustLevel: TrustLevel.PARTIAL_TRUST,
    inheritSubdomains: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // This would load from the trusted sites storage
      // For now, using defaults
      setLoading(false);
    } catch (error) {
      console.error('Failed to load trusted sites settings:', error);
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: string, value: string | number | boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      // In a full implementation, we'd save to storage here
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Trusted Sites Management */}
      <TrustedSites />
      
      {/* Settings Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Trust Settings</h3>
        
        <div className="space-y-4">
          {/* Auto Suggest Trust */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto-suggest trusted sites
              </label>
              <p className="text-xs text-gray-500">
                Automatically suggest sites to trust based on your browsing patterns
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSuggestTrust}
                onChange={(e) => handleSettingChange('autoSuggestTrust', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Default Trust Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default trust level for new sites
            </label>
            <select
              value={settings.defaultTrustLevel}
              onChange={(e) => handleSettingChange('defaultTrustLevel', e.target.value as TrustLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={TrustLevel.PARTIAL_TRUST}>Partial Trust</option>
              <option value={TrustLevel.FULL_TRUST}>Full Trust</option>
              <option value={TrustLevel.CONDITIONAL}>Conditional Trust</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This will be the default trust level when you add new trusted sites
            </p>
          </div>

          {/* Verification Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trust verification interval (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.verificationInterval}
              onChange={(e) => handleSettingChange('verificationInterval', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How often to re-evaluate trusted sites for changes in their privacy practices
            </p>
          </div>

          {/* Inherit Subdomains */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Trust subdomains automatically
              </label>
              <p className="text-xs text-gray-500">
                When you trust example.com, also trust subdomain.example.com
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.inheritSubdomains}
                onChange={(e) => handleSettingChange('inheritSubdomains', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Trust Level Explanations */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Trust Level Explanations</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-green-600">🛡️</span>
              <div>
                <span className="font-medium">Full Trust:</span> No monitoring, privacy score boosted to minimum B+ (85)
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">⚡</span>
              <div>
                <span className="font-medium">Partial Trust:</span> Reduced monitoring, privacy score boosted by 15 points
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">⚙️</span>
              <div>
                <span className="font-medium">Conditional Trust:</span> Trust with specific conditions (e.g., max trackers allowed)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
