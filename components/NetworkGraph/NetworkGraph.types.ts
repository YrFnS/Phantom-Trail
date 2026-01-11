import type { RiskLevel } from '../../lib/types';

export interface NetworkNode {
  id: string;
  label: string;
  color: string;
  shape: string;
  size: number;
  riskLevel: RiskLevel;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  color: string;
  width: number;
  arrows: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface NetworkGraphProps {
  className?: string;
}

export interface ProcessedTrackingData {
  domains: Set<string>;
  connections: Map<string, Set<string>>;
  riskLevels: Map<string, RiskLevel>;
}
