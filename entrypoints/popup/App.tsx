import { useState } from 'react';
import { LiveNarrative } from '../../components/LiveNarrative';
import { Settings } from '../../components/Settings';

function App() {
  const [showSettings, setShowSettings] = useState(false);

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
        <LiveNarrative />
      </main>
    </div>
  );
}

export default App;
