export interface PrivacyPrediction {
  url: string;
  predictedScore: number;
  predictedGrade: string;
  confidence: number; // 0-1
  riskFactors: RiskFactor[];
  expectedTrackers: PredictedTracker[];
  recommendations: string[];
  comparisonToAverage: number;
  timestamp: number;
}

export interface RiskFactor {
  type: 'domain-reputation' | 'category-risk' | 'tracker-patterns' | 'user-history';
  impact: number; // -50 to +50 points
  description: string;
  confidence: number;
}

export interface PredictedTracker {
  domain: string;
  type: TrackerType;
  probability: number; // 0-1
  riskLevel: RiskLevel;
}

export interface LinkAnalysis {
  url: string;
  prediction: PrivacyPrediction;
  context: PageContext;
  shouldWarn: boolean;
  displayText: string;
}

export interface PageContext {
  referrer: string;
  currentDomain: string;
  linkText: string;
  linkPosition: 'header' | 'content' | 'footer' | 'sidebar';
  isExternal: boolean;
}

export interface DomainPattern {
  domain: string;
  averageScore: number;
  commonTrackers: string[];
  riskFactors: string[];
  lastUpdated: number;
}

import type { RiskLevel, TrackerType } from '../types';
