export * from './types';
export { PatternAnalyzer } from './pattern-analyzer';
export { RiskAnalyzer } from './risk-analyzer';
export { SpecializedAnalyzers } from './specialized-analyzers';
export { AnalysisHelpers } from './helpers';

import { PatternAnalyzer } from './pattern-analyzer';
import { RiskAnalyzer } from './risk-analyzer';
import { SpecializedAnalyzers } from './specialized-analyzers';

/**
 * Comprehensive tracking analysis engine
 */
export class TrackingAnalysis {
  static async analyzePatterns(timeframe?: number) {
    return PatternAnalyzer.analyzePatterns(timeframe);
  }

  static async analyzeRisk(timeframe?: number) {
    return RiskAnalyzer.analyzeRisk(timeframe);
  }

  static async analyzeTracker(trackerDomain: string) {
    return SpecializedAnalyzers.analyzeTracker(trackerDomain);
  }

  static async auditWebsite(websiteUrl: string) {
    return SpecializedAnalyzers.auditWebsite(websiteUrl);
  }

  static async analyzeTimeline(timeframe?: number) {
    return SpecializedAnalyzers.analyzeTimeline(timeframe);
  }
}
