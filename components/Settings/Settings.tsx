import { useState, useEffect } from 'react';
import { StorageManager } from '../../lib/storage-manager';
import { AI_MODELS, DEFAULT_MODEL } from '../../lib/ai-models';
import type { ExtensionSettings } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';

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
    <div className="p-4 bg-phantom-background min-h-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenRouter API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your free key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-phantom-600 hover:underline"
                >
                  openrouter.ai
                </a>
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                value={settings.aiModel || DEFAULT_MODEL}
                onChange={(e) =>
                  setSettings({ ...settings, aiModel: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
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
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  AI Analysis
                </label>
                <p className="text-xs text-gray-500">
                  Enable AI-powered tracking analysis
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAI}
                onChange={(e) =>
                  setSettings({ ...settings, enableAI: e.target.checked })
                }
                className="rounded border-gray-300 text-phantom-600 focus:ring-phantom-500"
              />
            </div>

            {/* Risk Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
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
        </CardContent>
      </Card>
    </div>
  );
}
