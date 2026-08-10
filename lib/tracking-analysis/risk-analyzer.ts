import type { AnalysisResult } from './types';
import type { TrackingEvent, PrivacyScore } from '../types';
import {
  calculatePrivacyScore,
  formatEvidenceScore,
} from '../privacy-score';
import { AnalysisHelpers } from './helpers';
import {
  getEventOccurrenceCount,
  getPageDomain,
} from '../event-attribution.mts';

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
      recommendations: this.generateRecommendations(
        lowIndexPages,
        insufficientPages.length,
        criticalEvents,
        events.length,
        unattributedRows
      ),
    };
  }

  private static generateRecommendations(
    lowIndexPages: Array<{
      domain: string;
      score: PrivacyScore;
      events: number;
    }>,
    insufficientPageCount: number,
    criticalEvents: TrackingEvent[],
    rowCount: number,
    unattributedRows: number
  ): string[] {
    const recommendations: string[] = [];

    if (rowCount === 0) {
      return [
        'Collect and inspect evidence before assigning any numeric index or conclusion.',
      ];
    }

    const lowestGroup = lowIndexPages[0];
    if (lowestGroup?.score.score !== null) {
      recommendations.push(
        `${lowestGroup.domain} has the largest estimated evidence penalty in this window (${lowestGroup.score.score}/100, ${lowestGroup.score.confidence} coverage confidence). Review its ${lowestGroup.events} occurrences and contribution routes before acting.`
      );
    }

    if (insufficientPageCount > 0) {
      recommendations.push(
        `${insufficientPageCount} attributed page group${
          insufficientPageCount === 1 ? ' is' : 's are'
        } N/A. Do not interpret missing score-qualified evidence as favorable privacy.`
      );
    }

    if (criticalEvents.length > 0) {
      recommendations.push(
        `${criticalEvents.length} stored rows carry the prototype critical label. Some may be excluded from scoring; inspect detector evidence and attribution rather than treating the label as a verified incident.`
      );
    }

    if (unattributedRows > 0) {
      recommendations.push(
        `${unattributedRows} stored rows lack a visited-page domain and are excluded from page-scoped scoring.`
      );
    }

    recommendations.push(
      'Treat index changes as changes in qualifying recorded evidence, not measured changes in real-world privacy.'
    );
    return recommendations;
  }
}
