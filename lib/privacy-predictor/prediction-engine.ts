import { RiskAnalysis } from './risk-analysis';
import type {
  PrivacyPrediction,
  RiskFactor,
  LinkAnalysis,
  PageContext,
} from './types';
import type { TrackingEvent } from '../types';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';

export class PredictionEngine {
  /**
   * Return recent recorded detector events associated with a destination.
   *
   * The current event model has known attribution limitations, so this data is
   * historical heuristic context rather than a verified destination audit.
   */
  private static async getHistoricalData(
    domain: string
  ): Promise<{
    score: number;
    events: TrackingEvent[];
    lastVisit: number;
  } | null> {
    try {
      const allEvents = await EventsStorage.getTrackingEvents();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const domainEvents = allEvents.filter(event => {
        try {
          const eventDomain = new URL(event.url).hostname;
          return (
            (eventDomain === domain ||
              eventDomain.endsWith(`.${domain}`) ||
              domain.endsWith(`.${eventDomain}`)) &&
            event.timestamp > sevenDaysAgo
          );
        } catch {
          return false;
        }
      });

      if (domainEvents.length === 0) return null;

      const isHttps = domainEvents.some(event => event.url.startsWith('https://'));
      const heuristicScore = calculatePrivacyScore(domainEvents, isHttps);

      return {
        score: heuristicScore.score,
        events: domainEvents,
        lastVisit: Math.max(...domainEvents.map(event => event.timestamp)),
      };
    } catch (error) {
      console.error(
        '[Privacy Predictor] Failed to get recorded heuristic data:',
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

        return {
          url,
          predictedScore: historical.score,
          predictedGrade: this.scoreToGrade(historical.score),
          confidence: 0.6,
          riskFactors: [
            {
              type: 'historical-data',
              impact: 0,
              description: `Based on ${historical.events.length} recorded heuristic events ${
                daysSinceVisit === 0 ? 'today' : `${daysSinceVisit} days ago`
              }`,
              confidence: 0.6,
            },
          ],
          expectedTrackers: [],
          recommendations: this.generateHistoricalRecommendations(
            historical.score,
            historical.events.length
          ),
          comparisonToAverage: 0,
          timestamp: Date.now(),
          isHistorical: true,
          historicalData: {
            trackerCount: historical.events.length,
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
    eventCount: number
  ): string[] {
    if (score < 40) {
      return [
        'Prior visits produced many high-severity heuristic signals',
        'Review the recorded evidence before deciding how to proceed',
      ];
    }

    if (score < 70) {
      return [
        `${eventCount} detector events were associated with prior visits`,
        'The event attribution may include false positives',
      ];
    }

    return [
      'Prior visits produced fewer heuristic penalties',
      'This does not establish that the destination is privacy-friendly',
    ];
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

      return `Recorded history (${timeText}): ${historicalData.trackerCount} heuristic events; model label ${predictedGrade} (${predictedScore}/100). Attribution is unverified.`;
    }

    return `Experimental ${context.isExternal ? 'external ' : ''}link estimate: model label ${predictedGrade} (${predictedScore}/100), based only on URL and domain patterns.`;
  }

  private static scoreToGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
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
      recommendations: ['Heuristic unavailable; no conclusion can be drawn'],
      comparisonToAverage: 0,
      timestamp: Date.now(),
      isHistorical: false,
    };
  }
}
