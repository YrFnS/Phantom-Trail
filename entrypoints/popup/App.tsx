import { useState, useEffect, Suspense, lazy } from 'react';
import { useAppData } from '../../lib/hooks';
import { ExportButton } from '../../components/ExportButton';
import { RateLimitStatus } from '../../components/RateLimitStatus';
import { Settings } from '../../components/Settings';
import { QuickTrustButton } from '../../components/TrustedSites';
import {
  ThemeToggle,
  NavButton,
  NAV_ITEMS,
  type ViewType,
} from '../../components/ui';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LogoIcon, SettingsIcon } from '../../components/icons';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import type {
  EvidenceCoverageConfidence,
  EvidenceScoreColor,
} from '../../lib/types';

const REQUESTED_VIEW_KEY = 'phantom_trail_requested_popup_view';

const LiveNarrative = lazy(() =>
  import('../../components/LiveNarrative').then(module => ({
    default: module.LiveNarrative,
  }))
);
const NetworkGraph = lazy(() =>
  import('../../components/NetworkGraph').then(module => ({
    default: module.NetworkGraph,
  }))
);
const ChatInterface = lazy(() =>
  import('../../components/ChatInterface').then(module => ({
    default: module.ChatInterface,
  }))
);
const RiskDashboard = lazy(() =>
  import('../../components/RiskDashboard').then(module => ({
    default: module.RiskDashboard,
  }))
);
const ReportsDashboard = lazy(() =>
  import('../../components/Reports').then(module => ({
    default: module.ReportsDashboard,
  }))
);
const CommunityInsights = lazy(() =>
  import('../../components/CommunityInsights').then(module => ({
    default: module.CommunityInsights,
  }))
);

const ComponentLoader = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-plasma" />
  </div>
);

const EMPTY_EVIDENCE_SCORE = calculatePrivacyScore([]);

function getScoreColorClass(color: EvidenceScoreColor): string {
  switch (color) {
    case 'green':
      return 'text-[var(--success)]';
    case 'yellow':
    case 'orange':
      return 'text-[var(--warning)]';
    case 'red':
      return 'text-[var(--error)]';
    case 'gray':
    default:
      return 'text-[var(--text-secondary)]';
  }
}

function isViewType(value: unknown): value is ViewType {
  return NAV_ITEMS.some(item => item.id === value);
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('narrative');
  const { events, currentSiteScore, overallScore, currentDomain } =
    useAppData();

  useEffect(() => {
    void chrome.storage.session
      .get(REQUESTED_VIEW_KEY)
      .then(result => {
        const requested = result[REQUESTED_VIEW_KEY];
        if (isViewType(requested)) setActiveView(requested);
        return chrome.storage.session.remove(REQUESTED_VIEW_KEY);
      })
      .catch(() => undefined);
  }, []);

  if (showSettings) {
    return (
      <div className="extension-popup bg-[var(--bg-primary)]">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  const currentEstimate =
    currentSiteScore?.status === 'estimated' && currentSiteScore.score !== null
      ? currentSiteScore
      : null;
  const overallEstimate =
    overallScore?.status === 'estimated' && overallScore.score !== null
      ? overallScore
      : null;
  const communitySource = currentEstimate || overallEstimate;
  const communityScore = communitySource?.score ?? null;
  const communityGrade = communitySource?.grade ?? 'N/A';
  const communityConfidence: EvidenceCoverageConfidence =
    communitySource?.confidence ?? 'none';

  return (
    <div className="extension-popup relative bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="relative z-10">
        <header className="px-4 pt-3 pb-2 border-b border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
                <LogoIcon className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  Phantom Trail
                </h1>
                <p className="text-[10px] text-[var(--warning)]">
                  Experimental Signal Monitor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle size="sm" />
              <ExportButton
                events={events}
                privacyScore={overallScore || EMPTY_EVIDENCE_SCORE}
              />
              <button
                onClick={() => setShowSettings(true)}
                className="w-7 h-7 rounded-md hover:bg-[var(--bg-tertiary)] hover:border hover:border-[var(--accent-primary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentSiteScore && (
            <div className="mb-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                  Current-page evidence index
                </span>
                <span
                  className={`text-xl font-bold ${getScoreColorClass(
                    currentSiteScore.color
                  )}`}
                >
                  {currentEstimate
                    ? `${currentEstimate.grade} ${currentEstimate.score}`
                    : 'N/A'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] truncate flex items-center justify-between">
                <span>
                  {currentDomain || 'Unknown page'} •{' '}
                  {currentSiteScore.breakdown.observedRows} observed rows •{' '}
                  {currentSiteScore.breakdown.evidenceUnits} evidence units
                </span>
                {currentDomain && (
                  <QuickTrustButton
                    domain={currentDomain}
                    size="sm"
                    className="ml-2"
                  />
                )}
              </div>
              <div className="text-[9px] text-[var(--text-tertiary)] mt-1">
                {currentEstimate
                  ? `${currentEstimate.confidence} evidence-coverage confidence`
                  : 'Insufficient score-qualified evidence; this is not a favorable result.'}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
            <div>
              {overallScore ? (
                <>
                  Recent evidence index:{' '}
                  <span
                    className={`font-medium ${getScoreColorClass(
                      overallScore.color
                    )}`}
                  >
                    {overallEstimate
                      ? `${overallEstimate.grade} (${overallEstimate.score})`
                      : 'N/A'}
                  </span>{' '}
                  • {events.length} stored rows
                </>
              ) : (
                'Loading recorded evidence'
              )}
            </div>
            <RateLimitStatus className="ml-2" />
          </div>

          <p className="text-[9px] text-[var(--warning)] mt-1">
            Model bands summarize qualifying recorded evidence. They are not
            verified privacy or safety ratings.
          </p>
        </header>

        <div className="flex h-[calc(100vh-120px)] max-h-[480px]">
          <nav className="w-16 border-r border-[var(--border-primary)] flex flex-col py-2 gap-1">
            {NAV_ITEMS.map(item => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeView === item.id}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto p-3">
            <div className="animate-fade-in">
              <ErrorBoundary>
                <Suspense fallback={<ComponentLoader />}>
                  {activeView === 'narrative' && <LiveNarrative />}
                  {activeView === 'network' && <NetworkGraph />}
                  {activeView === 'dashboard' && (
                    <RiskDashboard currentDomain={currentDomain} />
                  )}
                  {activeView === 'explore' && <ChatInterface />}
                  {activeView === 'reports' && <ReportsDashboard />}
                  {activeView === 'community' && (
                    <CommunityInsights
                      userScore={communityScore}
                      userGrade={communityGrade}
                      userConfidence={communityConfidence}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
