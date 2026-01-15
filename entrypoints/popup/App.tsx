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
    <div className="extension-popup p-4 bg-phantom-background">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              👻 Phantom Trail
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Privacy tracking in real-time
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ExportButton 
              events={events} 
              privacyScore={overallScore || EMPTY_PRIVACY_SCORE}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="text-gray-500 hover:text-gray-700"
            >
              ⚙️
            </Button>
          </div>
        </div>
        
        {/* Dual Privacy Score Display */}
        {(currentSiteScore || overallScore) && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {/* Current Site Score */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Current Site
                </div>
                <div className="text-xs text-gray-500 truncate" title={currentDomain}>
                  {currentDomain || 'Unknown'}
                </div>
                {currentSiteScore && (
                  <PrivacyScore score={currentSiteScore} showBreakdown={false} />
                )}
              </div>
              
              {/* Overall Score */}
              <div className="space-y-2 border-l border-gray-200 pl-4">
                <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Recent Activity
                </div>
                <div className="text-xs text-gray-500">
                  Last {events.length} events
                </div>
                {overallScore && (
                  <PrivacyScore score={overallScore} showBreakdown={false} />
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="space-y-4">
        <div className="flex border-b border-gray-200 bg-white rounded-lg shadow-sm">
          <Button
            variant={activeView === 'narrative' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('narrative')}
            className={`flex-1 rounded-none rounded-tl-lg border-0 ${
              activeView === 'narrative'
                ? 'bg-phantom-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            Live Feed
          </Button>
          <Button
            variant={activeView === 'network' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('network')}
            className={`flex-1 rounded-none border-0 ${
              activeView === 'network'
                ? 'bg-phantom-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            Network Graph
          </Button>
          <Button
            variant={activeView === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('dashboard')}
            className={`flex-1 rounded-none border-0 ${
              activeView === 'dashboard'
                ? 'bg-phantom-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Button>
          <Button
            variant={activeView === 'chat' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('chat')}
            className={`flex-1 rounded-none rounded-tr-lg border-0 ${
              activeView === 'chat'
                ? 'bg-phantom-600 text-white'
                : 'bg-transparent text-gray-600 hover:bg-gray-50'
            }`}
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
