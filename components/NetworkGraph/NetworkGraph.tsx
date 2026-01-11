import { useRef, useEffect } from 'react';
import { Network } from 'vis-network';
import { useNetworkData } from './NetworkGraph.hooks';
import type { NetworkGraphProps } from './NetworkGraph.types';

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

    // Create new network
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
          iterations: 100,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
      },
    };

    networkRef.current = new Network(visJsRef.current, data, options);

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
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading network...</p>
        </div>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">🕸️</div>
          <p className="text-sm text-gray-600">No tracking data yet</p>
          <p className="text-xs text-gray-500 mt-1">Visit websites to see the network</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Network Graph</h3>
        <div className="text-xs text-gray-500">
          {data.nodes.length} domains, {data.edges.length} connections
        </div>
      </div>
      <div 
        ref={visJsRef} 
        className="w-full h-64 border border-gray-200 rounded-lg bg-white"
        style={{ height: '256px' }}
      />
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
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
    </div>
  );
}
