import { RiskAnalysis } from './risk-analysis';
import type {
  PrivacyPrediction,
  RiskFactor,
  LinkAnalysis,
  PageContext,
} from './types';
import type {
  EvidenceCoverageConfidence,
  TrackingEvent,
} from '../types';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';
import {
  eventMatchesPageDomain,
  getEventOccurrenceCount,
} from '../event-attribution.mts';

export class PredictionEngine {
  /**
   * Return recent numeric evidence history explicitly attributed to a
   * destination page. N/A history is not converted into a prediction.
   */
  private static async getHistoricalData(
    domain: string
  ): Promise<{
    score: number;
    confidence: EvidenceCoverageConfidence;
    evidenceUnits: number;
    events: TrackingEvent[];
    occurrenceCount: number;
    lastVisit: number;
  } | null> {
    try {
      const allEvents = await EventsStorage.getTrackingEvents();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const normalizedDomain = domain.toLowerCase();
      const domainEvents = allEvents.filter(
        event =>
          eventMatchesPageDomain(event, normalizedDomain) &&
          (event.lastSeenAt || event.timestamp) > sevenDaysAgo
      );
      if (domainEvents.length === 0) return null;

      const evidenceScore = calculatePrivacyScore(domainEvents, true, {
        scope: 'page',
        pageDomain: normalizedDomain,
      });
      if (
        evidenceScore.status !== 'estimated' ||
        evidenceScore.score === null
      ) {
        return null;
      }

      return {
        score: evidenceScore.score,
        confidence: evidenceScore.confidence,
        evidenceUnits: evidenceScore.breakdown.evidenceUnits,
        events: domainEvents,
        occurrenceCount: domainEvents.reduce(
          (total, event) => total + getEventOccurrenceCount(event),
          0
        ),
        lastVisit: Math.max(
          ...domainEvents.map(event => event.lastSeenAt || event.timestamp)
        ),
      };
    } catch (error) {
      console.error(
        '[Privacy Predictor] Failed to get attributed evidence history:',
        error
      );
      return null;
    }
  }

  static async predictPrivacyScore(url: string): Promise<PrivacyPrediction> {
    try {
      const urlObject = new URL(url);
      const domain = urlObject.hostname;
      const historical = await this.getHistoricalData(domain);

      if (historical) {
        const daysSinceVisit = Math.floor(
          (Date.now() - historical.lastVisit) / (24 * 60 * 60 * 1000)
        );
        const modelConfidence = this.toNumericConfidence(historical.confidence);

        return {
          url,
          predictedScore: historical.score,
          predictedGrade: this.scoreToGrade(historical.score),
          confidence: modelConfidence,
          riskFactors: [
            {
              type: 'historical-data',
              impact: 0,
              description: `Based on ${historical.evidenceUnits} score-qualified evidence units, ${historical.events.length} stored rows, and ${historical.occurrenceCount} occurrences ${
                daysSinceVisit === 0 ? 'today' : `${daysSinceVisit} days ago`
              }. Coverage confidence: ${historical.confidence}.`,
              confidence: modelConfidence,
            },
          ],
          expectedTrackers: [],
          recommendations: this.generateHistoricalRecommendations(
            historical.score,
            historical.occurrenceCount,
            historical.confidence
          ),
          comparisonToAverage: 0,
          timestamp: Date.now(),
          isHistorical: true,
          historicalData: {
            trackerCount: historical.occurrenceCount,
            lastVisit: historical.lastVisit,
          },
        };
      }

      const cached = await this.getCachedPrediction();
      if (cached) return cached;

      const factors: RiskFactor[] = [];
      factors.push(...(await RiskAnalysis.analyzeDomainReputation(domain)));
      factors.push(...RiskAnalysis.predictByCategory(url));
      factors.push(...RiskAnalysis.analyzeTrackerPatterns(domain));

      const { score, confidence } =
        RiskAnalysis.calculateWeightedPrediction(factors);
      const prediction: PrivacyPrediction = {
        url,
        predictedScore: score,
        predictedGrade: this.scoreToGrade(score),
        confidence,
        riskFactors: factors,
        expectedTrackers: [],
        recommendations: this.generateRecommendations(score, factors),
        comparisonToAverage: 0,
        timestamp: Date.now(),
        isHistorical: false,
      };

      await this.cachePrediction(url, prediction);
      return prediction;
    } catch (error) {
      console.error('[Privacy Predictor] Link heuristic failed:', error);
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
      prediction.riskFactors.some(factor => factor.impact < -20);

    return {
      url,
      prediction,
      context,
      shouldWarn,
      displayText: this.generateDisplayText(prediction, context),
    };
  }

  private static generateHistoricalRecommendations(
    score: number,
    occurrenceCount: number,
    confidence: EvidenceCoverageConfidence
  ): string[] {
    const recommendations = [
      `Historical evidence coverage confidence is ${confidence}; this is not detector-accuracy confidence.`,
      `${occurrenceCount} attributed occurrences were summarized with bounded recurrence rather than linear row penalties.`,
    ];

    if (score < 65) {
      recommendations.push(
        'Review the attributed page/resource contributions before deciding how to proceed.'
      );
    } else {
      recommendations.push(
        'A higher historical index does not establish that the destination is privacy-friendly or safe.'
      );
    }
    return recommendations;
  }

  private static generateRecommendations(
    score: number,
    factors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 40) {
      recommendations.push('Review the destination before sharing sensitive data');
      recommendations.push('Use browser privacy controls appropriate to your needs');
    } else if (score < 70) {
      recommendations.push('Treat this URL-pattern estimate as uncertain');
      recommendations.push('Review the destination privacy policy and permissions');
    } else {
      recommendations.push('URL patterns did not produce a strong warning');
      recommendations.push('No destination audit has been performed');
    }

    if (
      factors.some(
        factor => factor.type === 'tracker-patterns' && factor.impact < -10
      )
    ) {
      recommendations.push('The hostname matched a maintained tracker string');
    }

    return recommendations.slice(0, 3);
  }

  private static generateDisplayText(
    prediction: PrivacyPrediction,
    context: PageContext
  ): string {
    const { predictedScore, predictedGrade, isHistorical, historicalData } =
      prediction;

    if (isHistorical && historicalData) {
      const daysSince = Math.floor(
        (Date.now() - historicalData.lastVisit) / (24 * 60 * 60 * 1000)
      );
      const timeText = daysSince === 0 ? 'today' : `${daysSince}d ago`;

      return `Attributed estimated history (${timeText}): ${historicalData.trackerCount} detector occurrences; model band ${predictedGrade} (${predictedScore}/100). Unknown history is omitted, and this is not a destination audit.`;
    }

    return `Experimental ${context.isExternal ? 'external ' : ''}link estimate: model label ${predictedGrade} (${predictedScore}/100), based only on URL and domain patterns—not the P2 evidence index.`;
  }

  private static scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private static toNumericConfidence(
    confidence: EvidenceCoverageConfidence
  ): number {
    switch (confidence) {
      case 'high':
        return 0.7;
      case 'medium':
        return 0.55;
      case 'low':
        return 0.35;
      case 'none':
      default:
        return 0;
    }
  }

  private static async getCachedPrediction(): Promise<PrivacyPrediction | null> {
    return null;
  }

  private static async cachePrediction(
    _url: string,
    prediction: PrivacyPrediction
  ): Promise<void> {
    try {
      console.log('Caching experimental link estimate:', prediction);
    } catch (error) {
      console.warn('[Privacy Predictor] Cache write failed:', error);
    }
  }

  private static getDefaultPrediction(url: string): PrivacyPrediction {
    return {
      url,
      predictedScore: 50,
      predictedGrade: 'D',
      confidence: 0,
      riskFactors: [],
      expectedTrackers: [],
      recommendations: [
        'URL-pattern estimate unavailable; this fallback is not evidence and no conclusion can be drawn',
      ],
      comparisonToAverage: 0,
      timestamp: Date.now(),
      isHistorical: false,
    };
  }
}
