import type { AnalysisResult } from './types';
import type { TrackingEvent } from '../types';
import {
  calculatePrivacyScore,
  formatEvidenceScore,
} from '../privacy-score';
import { AnalysisHelpers } from './helpers';
import {
  getEventOccurrenceCount,
  getPageDomain,
} from '../event-attribution.mts';
import { buildRiskRecommendations } from '../risk-recommendation-policy.mts';

/**
 * Groups recorded detector signals by attributed page domain and applies the
 * P2 evidence model. The output is not a website privacy or safety audit.
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

    const pageResults = Array.from(pageEvents.entries())
      .filter(([domain]) => domain !== 'unattributed')
      .map(([domain, groupedEvents]) => ({
        domain,
        score: calculatePrivacyScore(groupedEvents, true, {
          scope: 'page',
          pageDomain: domain,
        }),
        events: groupedEvents.reduce(
          (total, event) => total + getEventOccurrenceCount(event),
          0
        ),
      }));
    const lowIndexPages = pageResults
      .filter(
        page =>
          page.score.status === 'estimated' &&
          page.score.score !== null &&
          page.score.score < 65
      )
      .sort((first, second) => {
        const firstScore = first.score.score ?? Number.POSITIVE_INFINITY;
        const secondScore = second.score.score ?? Number.POSITIVE_INFINITY;
        return firstScore - secondScore;
      })
      .slice(0, 5);
    const insufficientPages = pageResults.filter(
      page => page.score.status === 'insufficient-evidence'
    );
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
        ? 'No detector signals were recorded in the selected window. No evidence index or website conclusion is available.'
        : `Observed-evidence index: ${formatEvidenceScore(overallScore)} with ${overallScore.confidence} coverage confidence. Stored trend label: ${trend}. ${lowIndexPages.length} attributed page groups have an estimated index below 65; ${insufficientPages.length} page groups are N/A; ${unattributedRows} rows lack page attribution. ${occurrenceCount} occurrences were recorded.`;

    return {
      type: 'risk',
      summary,
      data: {
        overallScore,
        trend,
        riskySites: lowIndexPages,
        insufficientPages,
        criticalEvents,
        historicalScores,
      },
      recommendations: buildRiskRecommendations(
        lowIndexPages,
        insufficientPages.length,
        criticalEvents.length,
        events.length,
        unattributedRows
      ),
    };
  }
}
