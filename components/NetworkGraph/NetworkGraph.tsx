import { useRef, useEffect } from 'react';
import { Network } from 'vis-network';
import { useNetworkData } from './NetworkGraph.hooks';
import type { NetworkGraphProps } from './NetworkGraph.types';
import { Card, CardHeader, CardContent, LoadingSpinner } from '../ui';

export function NetworkGraph({ className = '' }: NetworkGraphProps) {
  const visJsRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const { data, loading } = useNetworkData();

  useEffect(() => {
    if (!visJsRef.current || loading) return;

    // Destroy existing network
    if (networkRef.current) {
      networkRef.current.destroy();
    }

    // Create new network with stabilized physics
    const options = {
      nodes: {
        font: {
          size: 12,
          color: '#374151',
        },
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        font: {
          size: 10,
          color: '#6b7280',
        },
        shadow: true,
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        dragNodes: true,
        dragView: true,
        zoomView: true,
      },
    };

    networkRef.current = new Network(visJsRef.current, data, options);

    // Stop physics after stabilization to prevent constant movement
    networkRef.current.on('stabilizationIterationsDone', () => {
      if (networkRef.current) {
        networkRef.current.setOptions({ physics: { enabled: false } });
      }
    });

    // Cleanup on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, loading]);

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
          <div 
            ref={visJsRef} 
            className="w-full h-64 border border-gray-200 rounded-lg bg-white mb-3"
            style={{ height: '256px' }}
          />
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
