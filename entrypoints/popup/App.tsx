import { LiveNarrative } from '../../components/LiveNarrative';

function App() {
  return (
    <div className="w-96 h-96 p-4 bg-gray-50">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Phantom Trail</h1>
        <p className="text-sm text-gray-600">Privacy tracking in real-time</p>
      </header>

      <main className="space-y-4">
        <LiveNarrative />
      </main>
    </div>
  );
}

export default App;
