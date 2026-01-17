import { useState, useEffect } from 'react';
import { LiveNarrative } from '../../components/LiveNarrative';
import { NetworkGraph } from '../../components/NetworkGraph';
import { ChatInterface } from '../../components/ChatInterface';
import { RiskDashboard } from '../../components/RiskDashboard';
import { Settings } from '../../components/Settings';
import { ExportButton } from '../../components/ExportButton';
import { RateLimitStatus } from '../../components/RateLimitStatus';
import { StorageManager } from '../../lib/storage-manager';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import type { TrackingEvent, PrivacyScore as PrivacyScoreType } from '../../lib/types';

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
    'narrative' | 'network' | 'chat' | 'dashboard'
  >('narrative');
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentSiteScore, setCurrentSiteScore] = useState<PrivacyScoreType | null>(null);
  const [overallScore, setOverallScore] = useState<PrivacyScoreType | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');

  // Load recent events and calculate both privacy scores
  useEffect(() => {
    const loadData = async () => {
      try {
        const recentEvents = await StorageManager.getRecentEvents(100);
        setEvents(recentEvents);
        
        // Get current domain from active tab
        let domain = '';
        let isHttps = false;
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const activeTab = tabs[0];
          if (activeTab?.url) {
            domain = new URL(activeTab.url).hostname;
            isHttps = activeTab.url.startsWith('https:');
          }
        } catch (tabError) {
          console.warn('Failed to get active tab:', tabError);
          // Continue with empty domain - extension still works
        }
        setCurrentDomain(domain);
        
        // Calculate privacy score for current domain events
        const domainEvents = recentEvents.filter(event => 
          event.domain === domain || event.url.includes(domain)
        );
        const currentScore = calculatePrivacyScore(domainEvents, isHttps);
        setCurrentSiteScore(currentScore);
        
        // Calculate overall privacy score for all recent events
        const allScore = calculatePrivacyScore(recentEvents, true); // Assume HTTPS for overall
        setOverallScore(allScore);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
    
    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (showSettings) {
    return (
      <div className="extension-popup bg-phantom-background">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="extension-popup relative">
      <div className="relative z-10">
        {/* Compact header */}
        <header className="px-4 pt-3 pb-2 border-b border-dark-600/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-hud border border-plasma/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-plasma" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9v11l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V9c0-3.87-3.13-7-7-7zm-2 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-terminal tracking-tight">Phantom Trail</h1>
                <p className="text-[10px] text-gray-500">Privacy Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ExportButton 
                events={events} 
                privacyScore={overallScore || EMPTY_PRIVACY_SCORE}
              />
              <button
                onClick={() => setShowSettings(true)}
                className="w-7 h-7 rounded-md hover:bg-hud hover:border hover:border-plasma/30 text-gray-400 hover:text-terminal transition-all flex items-center justify-center"
                title="Settings"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Score display */}
          {currentSiteScore && (
            <div className="mb-2">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Current Site</span>
                <span className={`text-xl font-bold ${
                  currentSiteScore.color === 'green' ? 'text-green-400' : 
                  currentSiteScore.color === 'yellow' ? 'text-yellow-400' : 
                  currentSiteScore.color === 'orange' ? 'text-orange-400' : 
                  'text-red-400'
                }`}>
                  {currentSiteScore.grade}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {currentDomain || 'Unknown'} • {currentSiteScore.breakdown.totalTrackers} trackers
              </div>
            </div>
          )}
          
          {overallScore && (
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <div>
                Recent Activity: <span className={`font-medium ${
                  overallScore.color === 'green' ? 'text-green-400' : 
                  overallScore.color === 'yellow' ? 'text-yellow-400' : 
                  overallScore.color === 'orange' ? 'text-orange-400' : 
                  'text-red-400'
                }`}>{overallScore.grade} ({overallScore.score})</span> • {events.length} events
              </div>
              <RateLimitStatus className="ml-2" />
            </div>
          )}
        </header>

        {/* Side tab navigation */}
        <div className="flex h-[calc(100vh-120px)] max-h-[480px]">
          <nav className="w-16 border-r border-dark-600/50 flex flex-col py-2 gap-1">
            <button
              onClick={() => setActiveView('narrative')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'narrative'
                  ? 'bg-hud text-terminal border-l-2 border-plasma shadow-[0_0_15px_rgba(188,19,254,0.4)]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700/50'
              }`}
            >
              <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>Feed</span>
            </button>
            <button
              onClick={() => setActiveView('network')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'network'
                  ? 'bg-hud text-terminal border-l-2 border-plasma shadow-[0_0_15px_rgba(188,19,254,0.4)]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700/50'
              }`}
            >
              <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="5" r="2"/>
                <circle cx="5" cy="19" r="2"/>
                <circle cx="19" cy="19" r="2"/>
                <path d="M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4"/>
              </svg>
              <span>Map</span>
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'dashboard'
                  ? 'bg-hud text-terminal border-l-2 border-plasma shadow-[0_0_15px_rgba(188,19,254,0.4)]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700/50'
              }`}
            >
              <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Stats</span>
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${
                activeView === 'chat'
                  ? 'bg-hud text-terminal border-l-2 border-plasma shadow-[0_0_15px_rgba(188,19,254,0.4)]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-700/50'
              }`}
            >
              <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>AI</span>
            </button>
          </nav>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-3">
            <div className="animate-fade-in">
              {activeView === 'narrative' && <LiveNarrative />}
              {activeView === 'network' && <NetworkGraph />}
              {activeView === 'dashboard' && <RiskDashboard />}
              {activeView === 'chat' && <ChatInterface />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
