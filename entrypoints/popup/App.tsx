import { useState, useEffect, Suspense, lazy } from 'react';
import { useAppData } from '../../lib/hooks';
import { ExportButton } from '../../components/ExportButton';
import { RateLimitStatus } from '../../components/RateLimitStatus';
import { Settings } from '../../components/Settings';
import { QuickTrustButton } from '../../components/TrustedSites';
import { ThemeToggle, NavButton, NAV_ITEMS, type ViewType } from '../../components/ui';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LogoIcon, SettingsIcon } from '../../components/icons';
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
  const [activeView, setActiveView] = useState<ViewType>('narrative');

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
                <LogoIcon className="w-5 h-5 text-[var(--accent-primary)]" />
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
                <SettingsIcon className="w-4 h-4" />
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
                  className={`text-xl font-bold ${currentSiteScore.color === 'green'
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
                  className={`font-medium ${overallScore.color === 'green'
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
            {NAV_ITEMS.map(item => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeView === item.id}
                onClick={() => setActiveView(item.id)}
              />
            ))}
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
