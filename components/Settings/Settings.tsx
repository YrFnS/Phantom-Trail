import { useState, useEffect } from 'react';
import { StorageManager } from '../../lib/storage-manager';
import { AI_MODELS, DEFAULT_MODEL } from '../../lib/ai-models';
import type { ExtensionSettings } from '../../lib/types';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
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
      setApiKey(currentSettings.apiKey || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        apiKey: apiKey.trim() || undefined,
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
    <div className="p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            OpenRouter API Key (Optional)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your free key from{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              openrouter.ai
            </a>
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AI Model
          </label>
          <select
            value={settings.aiModel || DEFAULT_MODEL}
            onChange={(e) =>
              setSettings({ ...settings, aiModel: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AI_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.category === 'free' ? '(Free)' : 
                 model.category === 'fast' ? '(Fast)' : '(Premium)'}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Free models have usage limits
          </p>
        </div>

        {/* AI Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            AI Analysis
          </label>
          <input
            type="checkbox"
            checked={settings.enableAI}
            onChange={(e) =>
              setSettings({ ...settings, enableAI: e.target.checked })
            }
            className="rounded"
          />
        </div>

        {/* Risk Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Risk Alert Threshold
          </label>
          <select
            value={settings.riskThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                riskThreshold: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical Only</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
