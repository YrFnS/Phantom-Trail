import { useState, useEffect } from 'react';
import { LiveNarrative } from '../../components/LiveNarrative';
import { NetworkGraph } from '../../components/NetworkGraph';
import { ChatInterface } from '../../components/ChatInterface';
import { RiskDashboard } from '../../components/RiskDashboard';
import { Settings } from '../../components/Settings';
import { PrivacyScore } from '../../components/PrivacyScore';
import { ExportButton } from '../../components/ExportButton';
import { Button } from '../../components/ui';
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
    <div className="extension-popup p-4">
      <header className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">👻</div>
            <div>
              <h1 className="text-lg font-bold text-white">Phantom Trail</h1>
              <p className="text-xs text-gray-400">Privacy Guardian</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton 
              events={events} 
              privacyScore={overallScore || EMPTY_PRIVACY_SCORE}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </Button>
          </div>
        </div>
        
        {/* Dual Privacy Score Display */}
        {(currentSiteScore || overallScore) && (
          <div className="bg-dark-800 rounded-lg p-3 border border-dark-600 neon-border">
            <div className="grid grid-cols-2 gap-3">
              {/* Current Site Score */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-neon-cyan uppercase tracking-wide">
                  Current Site
                </div>
                <div className="text-xs text-gray-400 truncate" title={currentDomain}>
                  {currentDomain || 'Unknown'}
                </div>
                {currentSiteScore && (
                  <PrivacyScore score={currentSiteScore} showBreakdown={false} />
                )}
              </div>
              
              {/* Overall Score */}
              <div className="space-y-1 border-l border-dark-600 pl-3">
                <div className="text-xs font-medium text-neon-pink uppercase tracking-wide">
                  Recent Activity
                </div>
                <div className="text-xs text-gray-400">
                  {events.length} events
                </div>
                {overallScore && (
                  <PrivacyScore score={overallScore} showBreakdown={false} />
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="space-y-3">
        <div className="flex gap-1 bg-dark-800 p-1 rounded-lg border border-dark-600">
          <Button
            variant={activeView === 'narrative' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('narrative')}
            className="flex-1"
          >
            Feed
          </Button>
          <Button
            variant={activeView === 'network' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('network')}
            className="flex-1"
          >
            Network
          </Button>
          <Button
            variant={activeView === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('dashboard')}
            className="flex-1"
          >
            Stats
          </Button>
          <Button
            variant={activeView === 'chat' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('chat')}
            className="flex-1"
          >
            Chat
          </Button>
        </div>

        <div className="animate-fade-in">
          {activeView === 'narrative' && <LiveNarrative />}
          {activeView === 'network' && <NetworkGraph />}
          {activeView === 'dashboard' && <RiskDashboard />}
          {activeView === 'chat' && <ChatInterface />}
        </div>
      </main>
    </div>
  );
}

export default App;
