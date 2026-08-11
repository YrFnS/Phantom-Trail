import { useState, type ReactNode } from 'react';
import { useSettings } from '../../lib/hooks';
import { AI_MODELS, DEFAULT_MODEL } from '../../lib/ai-models';
import type { RiskLevel } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';
import { TrustedSitesSettings } from './TrustedSitesSettings';
import { ShortcutSettings } from './ShortcutSettings';
import { ThemeSettings } from './ThemeSettings';
import { BadgeSettingsComponent } from './BadgeSettings';
import { P2PSettingsComponent } from './P2PSettings';
import { DataProtectionSettings } from './DataProtectionSettings';
import { NotificationSettings } from './NotificationSettings';

type SettingsTab =
  | 'general'
  | 'data'
  | 'appearance'
  | 'badge'
  | 'notifications'
  | 'trusted-sites'
  | 'shortcuts'
  | 'p2p';

interface SettingsProps {
  onClose: () => void;
}

interface TabButtonProps {
  id: SettingsTab;
  label: string;
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}

function TabButton({ id, label, activeTab, onSelect }: TabButtonProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === id
          ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );
}

function FeatureNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
      <h3 className="text-sm font-medium text-[var(--warning)] mb-1">
        {title}
      </h3>
      <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const {
    settings,
    setSettings,
    apiKey,
    setApiKey,
    rememberApiKey,
    setRememberApiKey,
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  } = useSettings();

  return (
    <div className="p-4 min-h-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Settings
              </h2>
              <p className="text-[10px] text-[var(--warning)] mt-1">
                Version 0.1.0 experimental prototype
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="flex gap-1 mt-4 border-b border-[var(--border-primary)] overflow-x-auto pb-1">
            <TabButton id="general" label="General" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="data" label="Data" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="appearance" label="Theme" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="badge" label="Badge" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="notifications" label="Alerts" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="trusted-sites" label="Sites" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="shortcuts" label="Keys" activeTab={activeTab} onSelect={setActiveTab} />
            <TabButton id="p2p" label="P2P" activeTab={activeTab} onSelect={setActiveTab} />
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === 'general' && (
            <div className="space-y-6">
              <FeatureNotice title="Interpret results cautiously">
                Detector events, model bands, reports, and generated summaries
                can be wrong. They are not a security verdict, privacy
                certification, or legal assessment.
              </FeatureNotice>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  OpenRouter API Key (Experimental, Optional)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] font-mono"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {apiKey && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--success)]">
                      ✓
                    </div>
                  )}
                </div>
                <label className="mt-3 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={rememberApiKey}
                    onChange={event =>
                      setRememberApiKey(event.target.checked)
                    }
                    className="mt-0.5 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                  />
                  <span>
                    Remember this key across browser restarts. Off by default;
                    otherwise it remains in extension session storage or memory.
                  </span>
                </label>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  The Evidence Explorer never sends unsupported questions. Only
                  its separate aggregate-summary button can use OpenRouter, and
                  it sends the field set previewed in the Data tab.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  OpenRouter Model
                </label>
                <select
                  value={settings.aiModel || DEFAULT_MODEL}
                  onChange={event =>
                    setSettings({ ...settings, aiModel: event.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                >
                  {AI_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}{' '}
                      {model.category === 'free'
                        ? '(Free tier)'
                        : model.category === 'fast'
                          ? '(Fast)'
                          : '(Paid/Premium)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Availability, limits, cost, and provider retention are
                  controlled by OpenRouter.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    OpenRouter aggregate summaries
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Off by default. Enables only the explicit aggregate-summary
                    action; local Evidence Explorer queries do not use it.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAI}
                  onChange={event =>
                    setSettings({ ...settings, enableAI: event.target.checked })
                  }
                  className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Signal Severity Threshold
                </label>
                <select
                  value={settings.riskThreshold}
                  onChange={event =>
                    setSettings({
                      ...settings,
                      riskThreshold: event.target.value as RiskLevel,
                    })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                >
                  <option value="low">Low heuristic severity</option>
                  <option value="medium">Medium heuristic severity</option>
                  <option value="high">High heuristic severity</option>
                  <option value="critical">Critical label only</option>
                </select>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  These labels are assigned by prototype rules, not a verified
                  threat assessment.
                </p>
              </div>

              {saveError && (
                <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg text-sm text-[var(--error)]">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg text-sm text-[var(--success)]">
                  ✓ Settings saved
                </div>
              )}

              <Button
                onClick={() => void saveSettings()}
                disabled={saving || saveSuccess}
                className="w-full"
                size="md"
              >
                {saving
                  ? 'Saving...'
                  : saveSuccess
                    ? '✓ Saved'
                    : 'Save Settings'}
              </Button>
            </div>
          )}

          {activeTab === 'data' && <DataProtectionSettings />}
          {activeTab === 'appearance' && <ThemeSettings />}

          {activeTab === 'badge' && (
            <div className="space-y-4">
              <FeatureNotice title="Experimental evidence badge">
                Disabled by default. It displays the same unvalidated evidence
                model as the popup and is not a safety or privacy certification.
              </FeatureNotice>
              <BadgeSettingsComponent />
            </div>
          )}

          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'trusted-sites' && <TrustedSitesSettings />}
          {activeTab === 'shortcuts' && <ShortcutSettings />}

          {activeTab === 'p2p' && (
            <div className="space-y-4">
              <FeatureNotice title="Unauthenticated experimental peer network">
                Current versioned consent is required. Peer identity, sample
                authenticity, and population representativeness are not
                established. Domain-reputation exchange is not part of P4.
              </FeatureNotice>
              <P2PSettingsComponent />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
