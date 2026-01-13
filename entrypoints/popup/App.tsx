import { useState } from 'react';
import { LiveNarrative } from '../../components/LiveNarrative';
import { NetworkGraph } from '../../components/NetworkGraph';
import { ChatInterface } from '../../components/ChatInterface';
import { Settings } from '../../components/Settings';
import { Button } from '../../components/ui';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<
    'narrative' | 'network' | 'chat'
  >('narrative');

  if (showSettings) {
    return (
      <div className="extension-popup bg-phantom-background">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="extension-popup p-4 bg-phantom-background">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            👻 Phantom Trail
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Privacy tracking in real-time
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="text-gray-500 hover:text-gray-700"
        >
          ⚙️
        </Button>
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
          {activeView === 'chat' && <ChatInterface />}
        </div>
      </main>
    </div>
  );
}

export default App;
