function App() {
  return (
    <div className="w-96 h-96 p-4 bg-gray-50">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Phantom Trail</h1>
        <p className="text-sm text-gray-600">Privacy tracking in real-time</p>
      </header>
      
      <main className="space-y-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Live Activity</h2>
          <p className="text-sm text-gray-500">No tracking detected yet...</p>
        </div>
        
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Risk Level</h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Low Risk</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;