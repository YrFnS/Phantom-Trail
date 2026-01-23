import { RiskAnalysis } from './risk-analysis';
import type {
  PrivacyPrediction,
  RiskFactor,
  PredictedTracker,
  LinkAnalysis,
  PageContext,
} from './types';
import type { RiskLevel, TrackerType, TrackingEvent } from '../types';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';

export class PredictionEngine {
  /**
   * Get historical privacy data for a domain
   */
  private static async getHistoricalData(
    domain: string
  ): Promise<{ score: number; events: TrackingEvent[]; lastVisit: number } | null> {
    try {
      const allEvents = await EventsStorage.getTrackingEvents();

      // Filter events for this domain (last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const domainEvents = allEvents.filter(event => {
        const eventDomain = new URL(event.url).hostname;
        return (
          eventDomain === domain ||
          eventDomain.endsWith(`.${domain}`) ||
          domain.endsWith(`.${eventDomain}`)
        ) && event.timestamp > sevenDaysAgo;
      });

      if (domainEvents.length === 0) {
        return null;
      }

      // Calculate real privacy score from actual events
      const isHttps = domainEvents.some(e => e.url.startsWith('https://'));
      const privacyScore = calculatePrivacyScore(domainEvents, isHttps);

      return {
        score: privacyScore.score,
        events: domainEvents,
        lastVisit: Math.max(...domainEvents.map(e => e.timestamp)),
      };
    } catch (error) {
      console.error('[Privacy Predictor] Failed to get historical data:', error);
      return null;
    }
  }

  static async predictPrivacyScore(url: string): Promise<PrivacyPrediction> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Check for historical data first
      const historical = await this.getHistoricalData(domain);

      if (historical) {
        // Use real data from tracking history
        const daysSinceVisit = Math.floor(
          (Date.now() - historical.lastVisit) / (24 * 60 * 60 * 1000)
        );

        return {
          url,
          predictedScore: historical.score,
          predictedGrade: this.scoreToGrade(historical.score),
          confidence: 1.0, // High confidence - real data
          riskFactors: [
            {
              type: 'historical-data',
              impact: 0,
              description: `Based on ${historical.events.length} trackers detected ${daysSinceVisit === 0 ? 'today' : `${daysSinceVisit} days ago`}`,
              confidence: 1.0,
            },
          ],
          expectedTrackers: [],
          recommendations: this.generateHistoricalRecommendations(
            historical.score,
            historical.events.length
          ),
          comparisonToAverage: historical.score - 65,
          timestamp: Date.now(),
          isHistorical: true,
          historicalData: {
            trackerCount: historical.events.length,
            lastVisit: historical.lastVisit,
          },
        };
      }

      // Fall back to prediction for never-visited sites
      // Check cache first
      const cached = await this.getCachedPrediction();
      if (cached) return cached;

      // Gather risk factors
      const factors: RiskFactor[] = [];

      // Domain reputation analysis
      const reputationFactors =
        await RiskAnalysis.analyzeDomainReputation(domain);
      factors.push(...reputationFactors);

      // Category-based prediction
      const categoryFactors = RiskAnalysis.predictByCategory(url);
      factors.push(...categoryFactors);

      // Tracker pattern analysis
      const trackerFactors = RiskAnalysis.analyzeTrackerPatterns(domain);
      factors.push(...trackerFactors);

      // Calculate weighted prediction
      const { score, confidence } =
        RiskAnalysis.calculateWeightedPrediction(factors);

      // Generate expected trackers
      const expectedTrackers = await this.predictTrackers(domain, score);

      // Generate recommendations
      const recommendations = this.generateRecommendations(score, factors);

      // Create prediction
      const prediction: PrivacyPrediction = {
        url,
        predictedScore: score,
        predictedGrade: this.scoreToGrade(score),
        confidence,
        riskFactors: factors,
        expectedTrackers,
        recommendations,
        comparisonToAverage: score - 65, // Assume 65 is average
        timestamp: Date.now(),
        isHistorical: false,
      };

      // Cache the prediction
      await this.cachePrediction(url, prediction);

      return prediction;
    } catch (error) {
      console.error('[Privacy Predictor] Prediction failed:', error);
      return this.getDefaultPrediction(url);
    }
  }

  static async analyzeLinkHover(
    url: string,
    context: PageContext
  ): Promise<LinkAnalysis> {
    const prediction = await this.predictPrivacyScore(url);

    const shouldWarn =
      prediction.predictedScore < 60 ||
      prediction.riskFactors.some(f => f.impact < -20);

    const displayText = this.generateDisplayText(prediction, context);

    return {
      url,
      prediction,
      context,
      shouldWarn,
      displayText,
    };
  }

  private static async predictTrackers(
    domain: string,
    privacyScore: number
  ): Promise<PredictedTracker[]> {
    const trackers: PredictedTracker[] = [];

    // Higher probability of trackers for lower privacy scores
    const baseProb = Math.max(0.1, (100 - privacyScore) / 100);

    // Common tracker types based on domain patterns
    const commonTrackers = [
      { type: 'analytics' as TrackerType, baseProbability: 0.8 },
      { type: 'advertising' as TrackerType, baseProbability: 0.6 },
      { type: 'social-media' as TrackerType, baseProbability: 0.4 },
      { type: 'fingerprinting' as TrackerType, baseProbability: 0.3 },
    ];

    for (const tracker of commonTrackers) {
      const probability = Math.min(1, tracker.baseProbability * baseProb);

      if (probability > 0.2) {
        // Only include likely trackers
        trackers.push({
          domain: `${tracker.type}.${domain}`,
          type: tracker.type,
          probability,
          riskLevel: this.probabilityToRisk(probability),
        });
      }
    }

    return trackers;
  }

  private static generateHistoricalRecommendations(
    score: number,
    trackerCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 40) {
      recommendations.push('High tracking detected on previous visits');
      recommendations.push('Consider using privacy tools or avoiding this site');
    } else if (score < 70) {
      recommendations.push(`${trackerCount} trackers detected previously`);
      recommendations.push('Moderate privacy risks observed');
    } else {
      recommendations.push('Previously visited with good privacy score');
    }

    return recommendations;
  }

  private static generateRecommendations(
    score: number,
    factors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 40) {
      recommendations.push('Consider using a VPN or privacy-focused browser');
      recommendations.push('Enable strict tracking protection');
    } else if (score < 70) {
      recommendations.push('Review site privacy policy before sharing data');
      recommendations.push('Consider using ad blocker');
    } else {
      recommendations.push('Site appears privacy-friendly');
    }

    // Factor-specific recommendations
    const hasTrackingFactors = factors.some(
      f => f.type === 'tracker-patterns' && f.impact < -10
    );
    if (hasTrackingFactors) {
      recommendations.push('Multiple trackers detected - use privacy tools');
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  private static generateDisplayText(
    prediction: PrivacyPrediction,
    context: PageContext
  ): string {
    const { predictedScore, predictedGrade, isHistorical, historicalData } = prediction;

    // Show different messages for historical vs predicted data
    if (isHistorical && historicalData) {
      const daysSince = Math.floor(
        (Date.now() - historicalData.lastVisit) / (24 * 60 * 60 * 1000)
      );
      const timeText = daysSince === 0 ? 'today' : `${daysSince}d ago`;

      if (predictedScore >= 80) {
        return `✓ Previously visited (${timeText}): ${historicalData.trackerCount} trackers detected (${predictedGrade})`;
      } else if (predictedScore >= 60) {
        return `⚠️ Previously visited (${timeText}): ${historicalData.trackerCount} trackers detected (${predictedGrade})`;
      } else {
        return `⚠️ High tracking detected on previous visit (${timeText}): ${historicalData.trackerCount} trackers (${predictedGrade})`;
      }
    }

    // Prediction-based messages (never visited)
    if (predictedScore >= 80) {
      return `Prediction: This ${context.isExternal ? 'external ' : ''}link appears privacy-friendly (${predictedGrade})`;
    } else if (predictedScore >= 60) {
      return `Prediction: This ${context.isExternal ? 'external ' : ''}link has moderate privacy risks (${predictedGrade})`;
    } else {
      return `⚠️ Prediction: This ${context.isExternal ? 'external ' : ''}link may have significant privacy risks (${predictedGrade})`;
    }
  }

  private static scoreToGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private static probabilityToRisk(probability: number): RiskLevel {
    if (probability >= 0.8) return 'high';
    if (probability >= 0.5) return 'medium';
    return 'low';
  }

  private static async getCachedPrediction(): Promise<PrivacyPrediction | null> {
    // Simple cache implementation - would use BaseStorage in full version
    return null;
  }

  private static async cachePrediction(
    _url: string,
    prediction: PrivacyPrediction
  ): Promise<void> {
    try {
      // Simple cache implementation - would use BaseStorage in full version
      console.log('Caching prediction:', prediction);
    } catch (error) {
      console.warn('[Privacy Predictor] Cache write failed:', error);
    }
  }

  private static getDefaultPrediction(url: string): PrivacyPrediction {
    return {
      url,
      predictedScore: 50,
      predictedGrade: 'D',
      confidence: 0.1,
      riskFactors: [],
      expectedTrackers: [],
      recommendations: ['Unable to analyze - proceed with caution'],
      comparisonToAverage: -15,
      timestamp: Date.now(),
    };
  }
}
