import type {
  NetworkData,
  NetworkNode,
  NetworkEdge,
} from './NetworkGraph.types';
import type { RiskLevel } from '../../lib/types';

/**
 * Generate test data for NetworkGraph component
 * Used for development and testing purposes
 */
export function generateTestNetworkData(): NetworkData {
  const testNodes: NetworkNode[] = [
    {
      id: 'google-analytics.com',
      label: 'Google Analytics',
      color: '#ef4444', // red-500 - critical
      shape: 'dot',
      size: 35,
      riskLevel: 'critical' as RiskLevel,
    },
    {
      id: 'facebook.com',
      label: 'Facebook',
      color: '#f97316', // orange-500 - high
      shape: 'dot',
      size: 30,
      riskLevel: 'high' as RiskLevel,
    },
    {
      id: 'doubleclick.net',
      label: 'DoubleClick',
      color: '#f59e0b', // yellow-500 - medium
      shape: 'dot',
      size: 25,
      riskLevel: 'medium' as RiskLevel,
    },
    {
      id: 'amazon.com',
      label: 'Amazon',
      color: '#10b981', // green-500 - low
      shape: 'dot',
      size: 20,
      riskLevel: 'low' as RiskLevel,
    },
    {
      id: 'example.com',
      label: 'Example Site',
      color: '#6b7280', // gray-500 - low
      shape: 'dot',
      size: 20,
      riskLevel: 'low' as RiskLevel,
    },
  ];

  const testEdges: NetworkEdge[] = [
    {
      id: 'edge-1',
      from: 'example.com',
      to: 'google-analytics.com',
      color: '#ef4444',
      width: 4,
      arrows: 'to',
    },
    {
      id: 'edge-2',
      from: 'example.com',
      to: 'facebook.com',
      color: '#f97316',
      width: 3,
      arrows: 'to',
    },
    {
      id: 'edge-3',
      from: 'example.com',
      to: 'doubleclick.net',
      color: '#f59e0b',
      width: 2,
      arrows: 'to',
    },
    {
      id: 'edge-4',
      from: 'amazon.com',
      to: 'doubleclick.net',
      color: '#f59e0b',
      width: 2,
      arrows: 'to',
    },
  ];

  return {
    nodes: testNodes,
    edges: testEdges,
  };
}
