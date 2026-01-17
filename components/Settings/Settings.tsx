import { useState, useEffect } from 'react';
import { StorageManager } from '../../lib/storage-manager';
import { AI_MODELS, DEFAULT_MODEL } from '../../lib/ai-models';
import type { ExtensionSettings, RiskLevel } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';
import { TrustedSitesSettings } from './TrustedSitesSettings';

type SettingsTab = 'general' | 'trusted-sites';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<ExtensionSettings>({
    enableAI: true,
    enableNotifications: true,
    riskThreshold: 'medium',
  });
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await StorageManager.getSettings();
      setSettings(currentSettings);
      setApiKey(currentSettings.openRouterApiKey || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        openRouterApiKey: apiKey.trim() || undefined,
      };
      await StorageManager.saveSettings(newSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 min-h-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-terminal">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 border-b border-dark-600">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('trusted-sites')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trusted-sites'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Trusted Sites
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OpenRouter API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your free key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-teal hover:underline"
                >
                  openrouter.ai
                </a>
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AI Model
              </label>
              <select
                value={settings.aiModel || DEFAULT_MODEL}
                onChange={e =>
                  setSettings({ ...settings, aiModel: e.target.value })
                }
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {AI_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}{' '}
                    {model.category === 'free'
                      ? '(Free)'
                      : model.category === 'fast'
                        ? '(Fast)'
                        : '(Premium)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Free models have usage limits
              </p>
            </div>

            {/* AI Toggle */}
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg border border-dark-600">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  AI Analysis
                </label>
                <p className="text-xs text-gray-400">
                  Enable AI-powered tracking analysis
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAI}
                onChange={e =>
                  setSettings({ ...settings, enableAI: e.target.checked })
                }
                className="rounded border-dark-600 text-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* Risk Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Risk Alert Threshold
              </label>
              <select
                value={settings.riskThreshold}
                onChange={e =>
                  setSettings({
                    ...settings,
                    riskThreshold: e.target.value as RiskLevel,
                  })
                }
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical Only</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Only show alerts for risks at or above this level
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="md"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
          )}

          {/* Trusted Sites Tab */}
          {activeTab === 'trusted-sites' && <TrustedSitesSettings />}
        </CardContent>
      </Card>
    </div>
  );
}
