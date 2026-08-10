import type { AnalysisResult, TrackerPattern } from './types';
import { AnalysisHelpers } from './helpers';

/**
 * Groups recorded event fields into frequency patterns.
 * The current event model does not reliably prove cross-site attribution.
 */
export class PatternAnalyzer {
  static async analyzePatterns(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    const trackerMap = new Map<string, TrackerPattern>();
    const domainHosts = new Map<string, Set<string>>();

    for (const event of events) {
      const domain = event.domain;
      if (!trackerMap.has(domain)) {
        trackerMap.set(domain, {
          domain,
          name: AnalysisHelpers.getTrackerName(domain),
          occurrences: 0,
          riskLevel: event.riskLevel,
          crossSiteCount: 0,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
        });
        domainHosts.set(domain, new Set());
      }

      const pattern = trackerMap.get(domain);
      if (!pattern) continue;

      pattern.occurrences++;
      pattern.lastSeen = Math.max(pattern.lastSeen, event.timestamp);
      pattern.firstSeen = Math.min(pattern.firstSeen, event.timestamp);

      try {
        domainHosts.get(domain)?.add(new URL(event.url).hostname);
      } catch {
        domainHosts.get(domain)?.add(event.url);
      }
    }

    for (const [domain, pattern] of trackerMap.entries()) {
      pattern.crossSiteCount = domainHosts.get(domain)?.size || 0;
    }

    const topTrackers = Array.from(trackerMap.values())
      .sort((first, second) => second.occurrences - first.occurrences)
      .slice(0, 10);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const event of events) riskCounts[event.riskLevel]++;

    const total = events.length;
    const percentage = (count: number) =>
      total > 0 ? Math.round((count / total) * 100) : 0;
    const riskDistribution = {
      low: percentage(riskCounts.low),
      medium: percentage(riskCounts.medium),
      high: percentage(riskCounts.high),
      critical: percentage(riskCounts.critical),
    };

    const crossSiteTrackers = topTrackers.filter(
      pattern => pattern.crossSiteCount > 1
    );
    const mostFrequent = topTrackers[0];

    const summary = `Grouped ${events.length} recorded detector signals. Most frequent domain label: ${
      mostFrequent?.name || 'none'
    } (${mostFrequent?.occurrences || 0} events). ${
      crossSiteTrackers.length
    } domain groups were associated with multiple URL-host labels; attribution is unverified.`;

    return {
      type: 'pattern',
      summary,
      data: {
        topTrackers,
        crossSiteTrackers,
        riskDistribution,
        totalEvents: events.length,
        timeframeDays: Math.round(timeframe / (24 * 60 * 60 * 1000)),
      },
      recommendations: this.generateRecommendations(
        topTrackers,
        crossSiteTrackers,
        riskDistribution
      ),
    };
  }

  private static generateRecommendations(
    topTrackers: TrackerPattern[],
    crossSiteTrackers: TrackerPattern[],
    riskDistribution: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (crossSiteTrackers.length > 0) {
      recommendations.push(
        `${crossSiteTrackers.length} domain groups appeared with more than one URL-host label. Review page/resource attribution before treating this as cross-site tracking.`
      );
    }

    if (riskDistribution.critical > 10) {
      recommendations.push(
        `${riskDistribution.critical}% of recorded events carry the prototype critical label. Inspect the underlying detector evidence and false-positive risk.`
      );
    }

    const mostFrequent = topTrackers[0];
    if (mostFrequent && mostFrequent.occurrences > 50) {
      recommendations.push(
        `${mostFrequent.name} appears in ${mostFrequent.occurrences} recorded events. Check duplicates and request context before changing browser settings.`
      );
    }

    return recommendations;
  }
}
