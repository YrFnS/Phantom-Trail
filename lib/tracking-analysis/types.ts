import type { TrackingEvent, RiskLevel, PrivacyScore } from '../types';

export interface TrackerPattern {
  domain: string;
  name: string;
  occurrences: number;
  riskLevel: RiskLevel;
  crossSiteCount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface AnalysisResult {
  type: 'pattern' | 'risk' | 'tracker' | 'website' | 'timeline';
  summary: string;
  data:
    | PatternData
    | RiskData
    | TrackerData
    | WebsiteData
    | TimelineData
    | null;
  recommendations: string[];
}

export interface PatternData {
  topTrackers: TrackerPattern[];
  crossSiteTrackers: TrackerPattern[];
  riskDistribution: Record<string, number>;
  totalEvents: number;
  timeframeDays: number;
}

export interface RiskData {
  overallScore: PrivacyScore;
  trend: string;
  riskySites: Array<{
    domain: string;
    score: PrivacyScore;
    events: number;
  }>;
  criticalEvents: TrackingEvent[];
  historicalScores: number[];
}

export interface TrackerData {
  domain: string;
  name: string;
  owner: string;
  type: string;
  riskLevel: string;
  prevalence: string;
  occurrences: number;
  trackingMethods: string[];
  sites: string[];
}

export interface WebsiteData {
  domain: string;
  privacyScore: PrivacyScore;
  trackersByRisk: Record<string, TrackingEvent[]>;
  uniqueTrackers: Array<{
    domain: string;
    name: string;
    count: number;
    riskLevel: string;
  }>;
  thirdPartyPercentage: number;
  totalEvents: number;
}

export interface TimelineData {
  totalEvents: number;
  dailyAverage: number;
  peakDay: string;
  lowestDay: string;
  hourlyPatterns: { hour: number; events: number }[];
  anomalies: Array<{
    timestamp: number;
    description: string;
    eventCount: number;
    cause?: string;
  }>;
}
