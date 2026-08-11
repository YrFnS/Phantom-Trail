import type { PrivacyScore, RiskLevel } from '../../lib/types';

export interface RiskDashboardProps {
  className?: string;
  currentDomain?: string;
}

export interface RiskMetrics {
  evidenceScore: PrivacyScore;
  totalRows: number;
  totalOccurrences: number;
  riskDistribution: RiskDistribution;
  topTrackers: TrackerSummary[];
  riskTrend: RiskTrendPoint[];
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface TrackerSummary {
  domain: string;
  count: number;
  riskLevel: RiskLevel;
  category: string;
}

export interface RiskTrendPoint {
  timestamp: number;
  evidenceIndex: number | null;
  confidence: PrivacyScore['confidence'];
  eventCount: number;
}

export interface DashboardState {
  metrics: RiskMetrics | null;
  loading: boolean;
  error: string | null;
  recommendations: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: Array<number | null>;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}
