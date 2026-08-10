import { useCallback, useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useNetworkData } from './NetworkGraph.hooks';
import type { NetworkGraphProps } from './NetworkGraph.types';
import { Card, CardHeader, CardContent, LoadingSpinner } from '../ui';

export function NetworkGraph({ className = '' }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const lastDataHashRef = useRef('');
  const { data, loading } = useNetworkData();

  const getDataHash = useCallback((networkData: typeof data) => {
    return `${networkData.nodes.length}-${networkData.edges.length}-${JSON.stringify(
      networkData.nodes.slice(0, 3).map(node => node.id)
    )}`;
  }, []);

  const convertToCytoscapeData = useCallback(
    (networkData: typeof data): ElementDefinition[] => {
      const elements: ElementDefinition[] = [];
      const nodeIds = new Set<string>();

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

  const initializeCytoscape = useCallback(() => {
    if (!containerRef.current || loading || data.nodes.length === 0) return;

    const currentHash = getDataHash(data);
    if (cyRef.current && lastDataHashRef.current === currentHash) return;

    cyRef.current?.destroy();
    cyRef.current = null;

    try {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: convertToCytoscapeData(data),
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
            style: { opacity: 1, 'z-index': 10 },
          },
          {
            selector: '.dimmed',
            style: { opacity: 0.3 },
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
          minTemp: 1,
        },
        minZoom: 0.3,
        maxZoom: 3,
      });

      cyRef.current.on('tap', 'node', event => {
        const node = event.target;
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        cyRef.current?.elements().removeClass('highlighted dimmed');
        node.addClass('highlighted');
        connectedNodes.addClass('highlighted');
        connectedEdges.addClass('highlighted');
        cyRef.current
          ?.elements()
          .not(node.union(connectedNodes).union(connectedEdges))
          .addClass('dimmed');
      });

      cyRef.current.on('tap', event => {
        if (event.target === cyRef.current) {
          cyRef.current?.elements().removeClass('highlighted dimmed');
        }
      });

      lastDataHashRef.current = currentHash;
    } catch (error) {
      console.error('Failed to initialize recorded signal graph:', error);
    }
  }, [convertToCytoscapeData, data, getDataHash, loading]);

  useEffect(() => {
    if (!loading && data.nodes.length > 0) initializeCytoscape();
  }, [data.nodes.length, initializeCytoscape, loading]);

  useEffect(() => {
    const handleResize = () => {
      cyRef.current?.resize();
      cyRef.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
      lastDataHashRef.current = '';
    };
  }, []);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Recorded Signal Graph
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-3" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Loading recorded signal graph...
                </p>
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Recorded Signal Graph
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)] opacity-30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="5" r="2" />
                  <circle cx="5" cy="19" r="2" />
                  <circle cx="19" cy="19" r="2" />
                  <path d="M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  No recorded signals yet
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Browse to collect detector output for this graph
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-[var(--text-primary)]">
              Recorded Signal Graph
            </h3>
            <div className="text-xs text-[var(--text-secondary)] text-right">
              {data.nodes.length} recorded domains, {data.edges.length} inferred
              links
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-2 mb-3 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
            Nodes come from stored detector events. Edges are inferred from event
            URLs and are not verified data flows or proof that domains exchanged
            information.
          </div>

          <div
            ref={containerRef}
            className="w-full h-64 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-tertiary)] mb-3"
            style={{ height: '320px' }}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span>Low label</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                <span>Medium label</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                <span>High label</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                <span>Critical label</span>
              </div>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] shrink-0">
              Inspect recorded nodes
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
