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
      const nodeIds = new Set<string>();

      // Add nodes
      networkData.nodes.forEach(node => {
        nodeIds.add(node.id);
        elements.push({
          data: {
            id: node.id,
            label: node.label,
            riskLevel: node.riskLevel,
            color: node.color,
            size: node.size,
          },
        });
      });

      // Add edges (only if both nodes exist)
      networkData.edges.forEach(edge => {
        if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
          elements.push({
            data: {
              id: edge.id,
              source: edge.from,
              target: edge.to,
              color: edge.color,
              width: edge.width,
            },
          });
        }
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
              'background-color': 'data(color)',
              width: 'data(size)',
              height: 'data(size)',
              label: 'data(label)',
              shape: 'ellipse',
              'border-width': 2,
              'border-color': '#ffffff',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'font-size': '12px',
              'text-valign': 'center',
              'text-halign': 'center',
              color: '#374151',
              'text-outline-width': 2,
              'text-outline-color': '#ffffff',
              'font-family': 'system-ui, -apple-system, sans-serif',
              'font-weight': 500,
            },
          },
          {
            selector: 'edge',
            style: {
              'line-color': 'data(color)',
              width: 'data(width)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.8,
              'arrow-scale': 1.2,
            },
          },
          {
            selector: '.highlighted',
            style: {
              opacity: 1,
              'z-index': 10,
            },
          },
          {
            selector: '.dimmed',
            style: {
              opacity: 0.3,
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Network Graph</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-3" />
                <p className="text-sm text-[var(--text-secondary)]">Loading network...</p>
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Network Graph</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)] opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="5" r="2"/>
                  <circle cx="5" cy="19" r="2"/>
                  <circle cx="19" cy="19" r="2"/>
                  <path d="M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4"/>
                </svg>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  No tracking data yet
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
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
            <h3 className="font-medium text-[var(--text-primary)]">Network Graph</h3>
            <div className="text-xs text-[var(--text-secondary)]">
              {data.nodes.length} domains, {data.edges.length} connections
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="w-full h-64 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-tertiary)] mb-3"
            style={{ height: '320px' }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--success)]"></div>
                <span>Low Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--warning)]"></div>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--warning)]"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--error)]"></div>
                <span>Critical Risk</span>
              </div>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              Click nodes to explore
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
