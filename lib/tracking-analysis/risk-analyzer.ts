import type { AnalysisResult } from './types';
import type { TrackingEvent, PrivacyScore } from '../types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';

/**
 * Groups recorded detector signals by URL host and applies the experimental
 * score formula. The output is not a website safety or privacy assessment.
 */
export class RiskAnalyzer {
  static async analyzeRisk(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    const overallScore = calculatePrivacyScore(events, true);
    const historicalScores = await AnalysisHelpers.getHistoricalScores(7);
    const trend = AnalysisHelpers.calculateTrend(historicalScores);

    const siteEvents = new Map<string, TrackingEvent[]>();
    for (const event of events) {
      const domain = this.getHostLabel(event);
      const groupedEvents = siteEvents.get(domain) || [];
      groupedEvents.push(event);
      siteEvents.set(domain, groupedEvents);
    }

    const riskySites = Array.from(siteEvents.entries())
      .map(([domain, groupedEvents]) => ({
        domain,
        score: calculatePrivacyScore(groupedEvents, true),
        events: groupedEvents.length,
      }))
      .filter(site => site.score.score < 70)
      .sort((first, second) => first.score.score - second.score.score)
      .slice(0, 5);

    const criticalEvents = events
      .filter(event => event.riskLevel === 'critical')
      .slice(0, 10);

    const summary =
      events.length === 0
        ? 'No detector signals were recorded in the selected window. No website privacy conclusion can be drawn.'
        : `Experimental heuristic: ${overallScore.score}/100 (${overallScore.grade}). Stored trend label: ${trend}. ${riskySites.length} URL-host groups fell below the prototype threshold; attribution and score accuracy are unverified.`;

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
      recommendations: this.generateRecommendations(
        riskySites,
        criticalEvents,
        events.length
      ),
    };
  }

  private static getHostLabel(event: TrackingEvent): string {
    try {
      return new URL(event.url).hostname || event.domain;
    } catch {
      return event.domain || 'unknown';
    }
  }

  private static generateRecommendations(
    riskySites: Array<{ domain: string; score: PrivacyScore; events: number }>,
    criticalEvents: TrackingEvent[],
    eventCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (eventCount === 0) {
      recommendations.push(
        'Collect and inspect evidence before assigning any score or conclusion.'
      );
      return recommendations;
    }

    const lowestGroup = riskySites[0];
    if (lowestGroup) {
      recommendations.push(
        `${lowestGroup.domain} has the lowest experimental group score (${lowestGroup.score.score}/100) in this window. Review the ${lowestGroup.events} underlying events, duplicates, and page/resource attribution before changing behavior.`
      );
    }

    if (criticalEvents.length > 0) {
      recommendations.push(
        `${criticalEvents.length} recorded signals carry the prototype critical label. Inspect their detector method and evidence; the label is not proof of an attack or data collection.`
      );
    }

    recommendations.push(
      'Treat score changes as changes in recorded signal mix, not measured changes in real-world privacy.'
    );

    return recommendations;
  }
}
