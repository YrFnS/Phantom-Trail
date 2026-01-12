import { useNetworkData } from './NetworkGraph.hooks';
import type { NetworkGraphProps } from './NetworkGraph.types';
import { Card, CardHeader, CardContent, LoadingSpinner } from '../ui';

export function NetworkGraph({ className = '' }: NetworkGraphProps) {
  const { data, loading } = useNetworkData();

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900">Network Graph</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-3" />
                <p className="text-sm text-gray-600">Loading network...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900">Network Graph</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-4xl mb-3">🕸️</div>
                <p className="text-sm text-gray-600 mb-1">No tracking data yet</p>
                <p className="text-xs text-gray-500">Visit websites to see the network</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Network Graph</h3>
            <div className="text-xs text-gray-500">
              {data.nodes.length} domains, {data.edges.length} connections
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64 border border-gray-200 rounded-lg bg-white mb-3 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔗</div>
              <p className="text-lg font-medium text-gray-900 mb-2">Network Visualization</p>
              <p className="text-sm text-gray-600 mb-4">
                Tracking {data.nodes.length} domains with {data.edges.length} connections
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.nodes.slice(0, 6).map((node, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="truncate">{node.label}</span>
                  </div>
                ))}
                {data.nodes.length > 6 && (
                  <div className="col-span-2 text-center text-gray-500 py-2">
                    +{data.nodes.length - 6} more domains
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Low Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Critical Risk</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
