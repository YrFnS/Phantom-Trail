import { useState, useEffect, Suspense, lazy } from 'react';
import { useAppData } from '../../lib/hooks';
import { ExportButton } from '../../components/ExportButton';
import { RateLimitStatus } from '../../components/RateLimitStatus';
import { Settings } from '../../components/Settings';
import { QuickTrustButton } from '../../components/TrustedSites';
import { ThemeToggle } from '../../components/ui';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import type { PrivacyScore as PrivacyScoreType } from '../../lib/types';

// Lazy load heavy components to reduce initial bundle size
const LiveNarrative = lazy(() =>
  import('../../components/LiveNarrative').then(m => ({
    default: m.LiveNarrative,
  }))
);
const NetworkGraph = lazy(() =>
  import('../../components/NetworkGraph').then(m => ({
    default: m.NetworkGraph,
  }))
);
const ChatInterface = lazy(() =>
  import('../../components/ChatInterface').then(m => ({
    default: m.ChatInterface,
  }))
);
const RiskDashboard = lazy(() =>
  import('../../components/RiskDashboard').then(m => ({
    default: m.RiskDashboard,
  }))
);
const PrivacyCoachDashboard = lazy(() =>
  import('../../components/PrivacyCoach').then(m => ({
    default: m.PrivacyCoachDashboard,
  }))
);
const CommunityInsights = lazy(() =>
  import('../../components/CommunityInsights').then(m => ({
    default: m.CommunityInsights,
  }))
);

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-plasma"></div>
  </div>
);

const EMPTY_PRIVACY_SCORE: PrivacyScoreType = {
  score: 100,
  grade: 'A',
  color: 'green',
  breakdown: {
    totalTrackers: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    criticalRisk: 0,
    httpsBonus: true,
    excessiveTrackingPenalty: false,
  },
  recommendations: [],
};

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<
    'narrative' | 'network' | 'chat' | 'dashboard' | 'coach' | 'community'
  >('narrative');

  // Use custom hook for data management
  const { events, currentSiteScore, overallScore, currentDomain } =
    useAppData();

  // Listen for tab switch events from child components
  useEffect(() => {
    const handleTabSwitch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail === 'actions') {
        setActiveView('dashboard'); // Dashboard contains Privacy Actions
      }
    };

    window.addEventListener('switchTab', handleTabSwitch);
    return () => window.removeEventListener('switchTab', handleTabSwitch);
  }, []);

  if (showSettings) {
    return (
      <div className="extension-popup bg-[var(--bg-primary)]">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="extension-popup relative bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="relative z-10">
        {/* Compact header */}
        <header className="px-4 pt-3 pb-2 border-b border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[var(--accent-primary)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9v11l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V9c0-3.87-3.13-7-7-7zm-2 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  Phantom Trail
                </h1>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Privacy Monitor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle size="sm" />
              <ExportButton
                events={events}
                privacyScore={overallScore || EMPTY_PRIVACY_SCORE}
              />
              <button
                onClick={() => setShowSettings(true)}
                className="w-7 h-7 rounded-md hover:bg-[var(--bg-tertiary)] hover:border hover:border-[var(--accent-primary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                title="Settings"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                </svg>
              </button>
            </div>
          </div>

          {/* Score display */}
          {currentSiteScore && (
            <div className="mb-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                  Current Site
                </span>
                <span
                  className={`text-xl font-bold ${
                    currentSiteScore.color === 'green'
                      ? 'text-[var(--success)]'
                      : currentSiteScore.color === 'yellow'
                        ? 'text-[var(--warning)]'
                        : currentSiteScore.color === 'orange'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--error)]'
                  }`}
                >
                  {currentSiteScore.grade}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] truncate flex items-center justify-between">
                <span>
                  {currentDomain || 'Unknown'} •{' '}
                  {currentSiteScore.breakdown.totalTrackers} trackers
                </span>
                {currentDomain && (
                  <QuickTrustButton
                    domain={currentDomain}
                    size="sm"
                    className="ml-2"
                  />
                )}
              </div>
            </div>
          )}

          {overallScore && (
            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <div>
                Recent Activity:{' '}
                <span
                  className={`font-medium ${
                    overallScore.color === 'green'
                      ? 'text-[var(--success)]'
                      : overallScore.color === 'yellow'
                        ? 'text-[var(--warning)]'
                        : overallScore.color === 'orange'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--error)]'
                  }`}
                >
                  {overallScore.grade} ({overallScore.score})
                </span>{' '}
                • {events.length} events
              </div>
              <RateLimitStatus className="ml-2" />
            </div>
          )}
        </header>

        {/* Side tab navigation */}
        <div className="flex h-[calc(100vh-120px)] max-h-[480px]">
          <nav className="w-16 border-r border-[var(--border-primary)] flex flex-col py-2 gap-1">
            <button
              onClick={() => setActiveView('narrative')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'narrative'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>Feed</span>
            </button>
            <button
              onClick={() => setActiveView('network')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'network'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
                <path d="M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4" />
              </svg>
              <span>Map</span>
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'dashboard'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Stats</span>
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'chat'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>AI</span>
            </button>
            <button
              onClick={() => setActiveView('coach')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'coach'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Coach</span>
            </button>
            <button
              onClick={() => setActiveView('community')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'community'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <svg
                className="w-4 h-4 mb-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Peers</span>
            </button>
          </nav>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-3">
            <div className="animate-fade-in">
              <ErrorBoundary>
                <Suspense fallback={<ComponentLoader />}>
                  {activeView === 'narrative' && <LiveNarrative />}
                  {activeView === 'network' && <NetworkGraph />}
                  {activeView === 'dashboard' && (
                    <RiskDashboard currentDomain={currentDomain} />
                  )}
                  {activeView === 'chat' && <ChatInterface />}
                  {activeView === 'coach' && <PrivacyCoachDashboard />}
                  {activeView === 'community' && (
                    <CommunityInsights
                      userScore={
                        currentSiteScore?.score || overallScore?.score || 100
                      }
                      userGrade={
                        currentSiteScore?.grade || overallScore?.grade || 'A'
                      }
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
