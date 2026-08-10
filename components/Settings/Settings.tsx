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

interface FeatureNoticeProps {
  title: string;
  children: ReactNode;
}

function FeatureNotice({ title, children }: FeatureNoticeProps) {
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
    saving,
    saveError,
    saveSuccess,
    saveSettings,
  } = useSettings();

  const handleSave = async () => {
    await saveSettings();
  };

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
            <TabButton
              id="general"
              label="General"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="appearance"
              label="Theme"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="badge"
              label="Badge*"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="export"
              label="Export*"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="notifications"
              label="Alerts*"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="trusted-sites"
              label="Sites"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="shortcuts"
              label="Keys"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              id="p2p"
              label="P2P*"
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === 'general' && (
            <div className="space-y-6">
              <FeatureNotice title="Interpret results cautiously">
                Detector events, grades, predictions, and recommendations are
                heuristic prototype output. They can be wrong and are not a
                security verdict, privacy certification, or legal assessment.
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
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  When AI summaries are enabled, sanitized event summaries are
                  sent directly to OpenRouter. Review the data disclosure before
                  enabling this feature. Manage keys at{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-primary)] hover:underline"
                  >
                    openrouter.ai
                  </a>
                  .
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
                  Availability, limits, and cost are controlled by OpenRouter.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    OpenRouter event summaries
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Experimental. Summarizes recorded event counts and domains;
                    it is not a complete or independently verified privacy
                    analysis. Off by default.
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

              <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Link signal estimates
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Experimental and unvalidated. Hover cards use domain-name
                    patterns and prior recorded signals, not a live audit of the
                    destination. Off by default.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enablePrivacyPredictions ?? false}
                  onChange={event =>
                    setSettings({
                      ...settings,
                      enablePrivacyPredictions: event.target.checked,
                    })
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
                onClick={handleSave}
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

          {activeTab === 'appearance' && <ThemeSettings />}

          {activeTab === 'badge' && (
            <div className="space-y-4">
              <FeatureNotice title="Experimental heuristic badge">
                The toolbar value inherits the unvalidated scoring model and is
                disabled by default for new installations. It must not be read
                as a safety or privacy certification.
              </FeatureNotice>
              <BadgeSettingsComponent />
            </div>
          )}

          {activeTab === 'export' && (
            <FeatureNotice title="Scheduled export unavailable in 0.1.0">
              Automatic alarm routing and date-range selection are incomplete.
              Use the manual export button in the popup header for CSV or JSON.
              The current “PDF” path is a plain-text report and is not exposed
              here as a finished PDF feature.
            </FeatureNotice>
          )}

          {activeTab === 'notifications' && (
            <FeatureNotice title="Automatic alerts unavailable in 0.1.0">
              Notification utilities exist, but detector events, daily summaries,
              and trend snapshots are not consistently wired into the extension
              lifecycle. Controls remain hidden until that behavior is completed
              and tested.
            </FeatureNotice>
          )}

          {activeTab === 'trusted-sites' && <TrustedSitesSettings />}
          {activeTab === 'shortcuts' && <ShortcutSettings />}

          {activeTab === 'p2p' && (
            <div className="space-y-4">
              <FeatureNotice title="Unauthenticated experimental peer network">
                Peer identity, sample authenticity, population
                representativeness, and reputation integrity are not established.
                Enabling this feature may expose normal WebRTC and signaling
                metadata to peers and infrastructure providers.
              </FeatureNotice>
              <P2PSettingsComponent />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
