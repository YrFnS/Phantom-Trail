import { useState } from 'react';
import { LiveNarrative } from '../../components/LiveNarrative';
import { NetworkGraph } from '../../components/NetworkGraph';
import { Settings } from '../../components/Settings';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<'narrative' | 'network'>('narrative');

  if (showSettings) {
    return (
      <div className="w-96 h-96 bg-gray-50">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="w-96 h-96 p-4 bg-gray-50">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Phantom Trail</h1>
          <p className="text-sm text-gray-600">Privacy tracking in real-time</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-500 hover:text-gray-700 text-lg"
          title="Settings"
        >
          ⚙️
        </button>
      </header>

      <main className="space-y-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveView('narrative')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'narrative'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Live Feed
          </button>
          <button
            onClick={() => setActiveView('network')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'network'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Network Graph
          </button>
        </div>
        
        {activeView === 'narrative' ? <LiveNarrative /> : <NetworkGraph />}
      </main>
    </div>
  );
}

export default App;
