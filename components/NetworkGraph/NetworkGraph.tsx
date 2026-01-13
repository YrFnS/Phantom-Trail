import { useRef, useEffect, useCallback } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { useNetworkData } from './NetworkGraph.hooks';
import type { NetworkGraphProps } from './NetworkGraph.types';
import { Card, CardHeader, CardContent, LoadingSpinner } from '../ui';

export function NetworkGraph({ className = '' }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isInitializedRef = useRef(false);
  const lastDataHashRef = useRef<string>('');
  const { data, loading } = useNetworkData();

  // Create a hash of the data to detect significant changes
  const getDataHash = useCallback((networkData: typeof data) => {
    return `${networkData.nodes.length}-${networkData.edges.length}-${JSON.stringify(networkData.nodes.slice(0, 3).map(n => n.id))}`;
  }, []);

  // Convert our data format to Cytoscape format
  const convertToCytoscapeData = useCallback(
    (networkData: typeof data): ElementDefinition[] => {
      const elements: ElementDefinition[] = [];

      // Add nodes
      networkData.nodes.forEach(node => {
        elements.push({
          data: {
            id: node.id,
            label: node.label,
            riskLevel: node.riskLevel,
          },
          style: {
            'background-color': node.color,
            width: node.size,
            height: node.size,
            label: node.label,
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#374151',
            'text-outline-width': 2,
            'text-outline-color': '#ffffff',
          },
        });
      });

      // Add edges
      networkData.edges.forEach(edge => {
        elements.push({
          data: {
            id: edge.id,
            source: edge.from,
            target: edge.to,
          },
          style: {
            'line-color': edge.color,
            width: edge.width,
            'target-arrow-color': edge.color,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        });
      });

      return elements;
    },
    []
  );

  // Initialize or update Cytoscape
  const initializeCytoscape = useCallback(() => {
    if (!containerRef.current || loading || data.nodes.length === 0) return;

    const currentHash = getDataHash(data);

    // Only recreate if data significantly changed or cytoscape doesn't exist
    if (cyRef.current && lastDataHashRef.current === currentHash) {
      return;
    }

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    try {
      const elements = convertToCytoscapeData(data);

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              shape: 'ellipse',
              'border-width': 2,
              'border-color': '#ffffff',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'font-family': 'system-ui, -apple-system, sans-serif',
              'font-weight': 500,
            },
          },
          {
            selector: 'edge',
            style: {
              opacity: 0.8,
              'arrow-scale': 1.2,
            },
          },
          {
            selector: 'node:hover',
            style: {
              'border-width': 3,
              'border-color': '#3b82f6',
            },
          },
          {
            selector: 'edge:hover',
            style: {
              opacity: 1,
              width: 'mapData(width, 1, 10, 3, 8)',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 1000,
          nodeRepulsion: 8000,
          nodeOverlap: 20,
          idealEdgeLength: 100,
          edgeElasticity: 200,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        },
        wheelSensitivity: 0.2,
        minZoom: 0.3,
        maxZoom: 3,
      });

      // Add event listeners for interactivity
      cyRef.current.on('tap', 'node', event => {
        const node = event.target;
        const nodeData = node.data();
        console.log(
          'Node clicked:',
          nodeData.label,
          'Risk:',
          nodeData.riskLevel
        );

        // Highlight connected nodes
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        // Reset all styles
        cyRef.current?.elements().removeClass('highlighted dimmed');

        // Highlight connected elements
        node.addClass('highlighted');
        connectedNodes.addClass('highlighted');
        connectedEdges.addClass('highlighted');

        // Dim non-connected elements
        cyRef.current
          ?.elements()
          .not(node.union(connectedNodes).union(connectedEdges))
          .addClass('dimmed');
      });

      // Reset highlighting on background tap
      cyRef.current.on('tap', event => {
        if (event.target === cyRef.current) {
          cyRef.current?.elements().removeClass('highlighted dimmed');
        }
      });

      // Add custom styles for highlighting
      cyRef.current
        .style()
        .selector('.highlighted')
        .style({
          opacity: 1,
          'z-index': 10,
        })
        .selector('.dimmed')
        .style({
          opacity: 0.3,
        })
        .update();

      lastDataHashRef.current = currentHash;
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize Cytoscape:', error);
    }
  }, [data, loading, getDataHash, convertToCytoscapeData]);

  // Initialize and update network
  useEffect(() => {
    if (!loading && data.nodes.length > 0) {
      initializeCytoscape();
    }
  }, [initializeCytoscape, loading, data]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      isInitializedRef.current = false;
      lastDataHashRef.current = '';
    };
  }, []);

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
                <p className="text-sm text-gray-600 mb-1">
                  No tracking data yet
                </p>
                <p className="text-xs text-gray-500">
                  Visit websites to see the network
                </p>
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
            ref={containerRef}
            className="w-full h-64 border border-gray-200 rounded-lg bg-white mb-3"
            style={{ height: '320px' }}
          />
          <div className="flex items-center justify-between">
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
            <div className="text-xs text-gray-400">
              Click nodes to explore connections
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
