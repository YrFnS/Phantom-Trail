import { useState } from 'react';
import { useSettings } from '../../lib/hooks';
import { AI_MODELS, DEFAULT_MODEL } from '../../lib/ai-models';
import type { RiskLevel } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';
import { TrustedSitesSettings } from './TrustedSitesSettings';
import { NotificationSettings } from './NotificationSettings';
import { ShortcutSettings } from './ShortcutSettings';
import { ThemeSettings } from './ThemeSettings';
import { ExportScheduling } from './ExportScheduling';
import { BadgeSettingsComponent } from './BadgeSettings';
import { P2PSettingsComponent } from './P2PSettings';

type SettingsTab =
  | 'general'
  | 'appearance'
  | 'badge'
  | 'export'
  | 'notifications'
  | 'trusted-sites'
  | 'shortcuts'
  | 'p2p';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Use custom hook for settings management
  const {
    settings,
    setSettings,
    apiKey,
    setApiKey,
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  } = useSettings();

  const handleSave = async () => {
    await saveSettings();
    if (saveSuccess) {
      // Brief delay to show success, then close
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  return (
    <div className="p-4 min-h-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Settings
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 border-b border-[var(--border-primary)] overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'appearance'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab('badge')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'badge'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Badge
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'export'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Export
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('trusted-sites')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'trusted-sites'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sites
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'shortcuts'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Keys
            </button>
            <button
              onClick={() => setActiveTab('p2p')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'p2p'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              P2P
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  OpenRouter API Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] font-mono"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {apiKey && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-500">
                      ✓
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Get your free key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-primary)] hover:underline"
                  >
                    openrouter.ai
                  </a>
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  AI Model
                </label>
                <select
                  value={settings.aiModel || DEFAULT_MODEL}
                  onChange={e =>
                    setSettings({ ...settings, aiModel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
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
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Free models have usage limits
                </p>
              </div>

              {/* AI Toggle */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    AI Analysis
                  </label>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Enable AI-powered tracking analysis
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAI}
                  onChange={e =>
                    setSettings({ ...settings, enableAI: e.target.checked })
                  }
                  className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Privacy Predictions Toggle */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Link Privacy Predictions
                  </label>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Show privacy warnings when hovering over links
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enablePrivacyPredictions ?? true}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      enablePrivacyPredictions: e.target.checked,
                    })
                  }
                  className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Risk Threshold */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical Only</option>
                </select>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Only show alerts for risks at or above this level
                </p>
              </div>

              {/* Save Button */}
              {saveError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                  ✓ Settings saved successfully!
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || saveSuccess}
                className="w-full"
                size="md"
              >
                {saving
                  ? 'Saving...'
                  : saveSuccess
                    ? '✓ Saved!'
                    : 'Save Settings'}
              </Button>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && <ThemeSettings />}

          {/* Badge Tab */}
          {activeTab === 'badge' && <BadgeSettingsComponent />}

          {/* Export Tab */}
          {activeTab === 'export' && <ExportScheduling />}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && <NotificationSettings />}

          {/* Trusted Sites Tab */}
          {activeTab === 'trusted-sites' && <TrustedSitesSettings />}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && <ShortcutSettings />}

          {/* P2P Network Tab */}
          {activeTab === 'p2p' && <P2PSettingsComponent />}
        </CardContent>
      </Card>
    </div>
  );
}
