import type { RiskLevel } from '../../lib/types';

/**
 * Component-specific interfaces for RiskDashboard
 */

export interface RiskDashboardProps {
  className?: string;
}

export interface RiskMetrics {
  overallRiskScore: number;
  totalEvents: number;
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
  riskScore: number;
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
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}
