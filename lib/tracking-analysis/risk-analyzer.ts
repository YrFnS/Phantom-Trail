import type { AnalysisResult } from './types';
import type { TrackingEvent, PrivacyScore } from '../types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';

export class RiskAnalyzer {
  static async analyzeRisk(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);

    const overallScore = calculatePrivacyScore(events, true);
    const historicalScores = await AnalysisHelpers.getHistoricalScores(7);
    const trend = AnalysisHelpers.calculateTrend(historicalScores);

    const siteEvents = new Map<string, TrackingEvent[]>();
    events.forEach(event => {
      const domain = new URL(event.url).hostname;
      if (!siteEvents.has(domain)) {
        siteEvents.set(domain, []);
      }
      siteEvents.get(domain)!.push(event);
    });

    const riskySites = Array.from(siteEvents.entries())
      .map(([domain, siteEvts]) => ({
        domain,
        score: calculatePrivacyScore(siteEvts, true),
        events: siteEvts.length,
      }))
      .filter(site => site.score.score < 70)
      .sort((a, b) => a.score.score - b.score.score)
      .slice(0, 5);

    const criticalEvents = events
      .filter(e => e.riskLevel === 'critical')
      .slice(0, 10);

    const summary = `Privacy Score: ${overallScore.score}/100 (${overallScore.grade}). Trend: ${trend}. ${riskySites.length} high-risk websites detected.`;

    const recommendations = [
      ...overallScore.recommendations,
      ...this.generateRecommendations(riskySites, criticalEvents),
    ];

    return {
      type: 'risk',
      summary,
      data: {
        overallScore,
        trend,
        riskySites,
        criticalEvents,
        historicalScores,
      },
      recommendations,
    };
  }

  private static generateRecommendations(
    riskySites: Array<{ domain: string; score: PrivacyScore; events: number }>,
    criticalEvents: TrackingEvent[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskySites.length > 0) {
      recommendations.push(
        `Avoid ${riskySites[0].domain} or use with strong privacy protection (score: ${riskySites[0].score.score}/100).`
      );
    }

    if (criticalEvents.length > 0) {
      recommendations.push(
        `${criticalEvents.length} critical tracking events detected. Review your privacy settings.`
      );
    }

    return recommendations;
  }
}
