import type { AnalysisResult } from './types';
import type { TrackingEvent, PrivacyScore } from '../types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';
import {
  getEventOccurrenceCount,
  getPageDomain,
} from '../event-attribution.mts';

/**
 * Groups recorded detector signals by explicitly attributed page domain and
 * applies the experimental score formula. The output is not a website audit.
 */
export class RiskAnalyzer {
  static async analyzeRisk(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    const overallScore = calculatePrivacyScore(events, true);
    const historicalScores = await AnalysisHelpers.getHistoricalScores(7);
    const trend = AnalysisHelpers.calculateTrend(historicalScores);

    const pageEvents = new Map<string, TrackingEvent[]>();
    for (const event of events) {
      const pageDomain = getPageDomain(event) || 'unattributed';
      const groupedEvents = pageEvents.get(pageDomain) || [];
      groupedEvents.push(event);
      pageEvents.set(pageDomain, groupedEvents);
    }

    const riskySites = Array.from(pageEvents.entries())
      .filter(([domain]) => domain !== 'unattributed')
      .map(([domain, groupedEvents]) => ({
        domain,
        score: calculatePrivacyScore(groupedEvents, true),
        events: groupedEvents.reduce(
          (total, event) => total + getEventOccurrenceCount(event),
          0
        ),
      }))
      .filter(site => site.score.score < 70)
      .sort((first, second) => first.score.score - second.score.score)
      .slice(0, 5);

    const criticalEvents = events
      .filter(event => event.riskLevel === 'critical')
      .slice(0, 10);
    const occurrenceCount = events.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );
    const unattributedRows = pageEvents.get('unattributed')?.length || 0;

    const summary =
      events.length === 0
        ? 'No detector signals were recorded in the selected window. No website privacy conclusion can be drawn.'
        : `Experimental heuristic: ${overallScore.score}/100 (${overallScore.grade}). Stored trend label: ${trend}. ${riskySites.length} attributed page groups fell below the prototype threshold across ${occurrenceCount} occurrences; ${unattributedRows} rows lack page attribution.`;

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
        events.length,
        unattributedRows
      ),
    };
  }

  private static generateRecommendations(
    riskySites: Array<{ domain: string; score: PrivacyScore; events: number }>,
    criticalEvents: TrackingEvent[],
    rowCount: number,
    unattributedRows: number
  ): string[] {
    const recommendations: string[] = [];

    if (rowCount === 0) {
      recommendations.push(
        'Collect and inspect evidence before assigning any score or conclusion.'
      );
      return recommendations;
    }

    const lowestGroup = riskySites[0];
    if (lowestGroup) {
      recommendations.push(
        `${lowestGroup.domain} has the lowest experimental page-group score (${lowestGroup.score.score}/100) in this window. Review its ${lowestGroup.events} recorded occurrences, detector evidence, and party classifications before changing behavior.`
      );
    }

    if (criticalEvents.length > 0) {
      recommendations.push(
        `${criticalEvents.length} stored rows carry the prototype critical label. Inspect their detector method and evidence; the label is not proof of an attack or data collection.`
      );
    }

    if (unattributedRows > 0) {
      recommendations.push(
        `${unattributedRows} stored rows lack a visited-page domain and are excluded from page-group conclusions.`
      );
    }

    recommendations.push(
      'Treat score changes as changes in recorded signal mix, not measured changes in real-world privacy.'
    );

    return recommendations;
  }
}
