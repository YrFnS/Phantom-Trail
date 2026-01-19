export * from './types';
export * from './prediction-engine';
export * from './risk-analysis';

import type { PrivacyPrediction } from './types';

// Main API class for backward compatibility
export class PrivacyPredictor {
  static async predictPrivacyScore(url: string) {
    const { PredictionEngine } = await import('./prediction-engine');
    return PredictionEngine.predictPrivacyScore(url);
  }

  static async analyzeLink(url: string, context: import('./types').PageContext) {
    const { PredictionEngine } = await import('./prediction-engine');
    return PredictionEngine.analyzeLinkHover(url, context);
  }

  static async analyzeLinkHover(url: string, context: import('./types').PageContext) {
    const { PredictionEngine } = await import('./prediction-engine');
    return PredictionEngine.analyzeLinkHover(url, context);
  }

  static async predictPrivacyImpact(url: string): Promise<PrivacyPrediction> {
    // Get full prediction instead of simplified stub
    const prediction = await this.predictPrivacyScore(url);
    return prediction;
  }
}
