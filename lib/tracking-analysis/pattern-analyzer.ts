import type { AnalysisResult, TrackerPattern } from './types';
import { AnalysisHelpers } from './helpers';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getResourceDomain,
  normalizeTrackingEvent,
} from '../event-attribution.mts';

/**
 * Groups attributed resource domains into frequency patterns.
 * A repeated domain across pages is still not proof of user correlation or data
 * sharing.
 */
export class PatternAnalyzer {
  static async analyzePatterns(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    const trackerMap = new Map<string, TrackerPattern>();
    const resourcePages = new Map<string, Set<string>>();

    for (const rawEvent of events) {
      const event = normalizeTrackingEvent(rawEvent);
      const resourceDomain = getResourceDomain(event);
      if (!resourceDomain) continue;

      if (!trackerMap.has(resourceDomain)) {
        trackerMap.set(resourceDomain, {
          domain: resourceDomain,
          name: AnalysisHelpers.getTrackerName(resourceDomain),
          occurrences: 0,
          riskLevel: event.riskLevel,
          crossSiteCount: 0,
          firstSeen: event.firstSeenAt || event.timestamp,
          lastSeen: event.lastSeenAt || event.timestamp,
        });
        resourcePages.set(resourceDomain, new Set());
      }

      const pattern = trackerMap.get(resourceDomain);
      if (!pattern) continue;

      pattern.occurrences += getEventOccurrenceCount(event);
      pattern.lastSeen = Math.max(
        pattern.lastSeen,
        event.lastSeenAt || event.timestamp
      );
      pattern.firstSeen = Math.min(
        pattern.firstSeen,
        event.firstSeenAt || event.timestamp
      );

      const pageDomain = getPageDomain(event);
      if (pageDomain && event.context?.party === 'third-party') {
        resourcePages.get(resourceDomain)?.add(pageDomain);
      }
    }

    for (const [domain, pattern] of trackerMap.entries()) {
      pattern.crossSiteCount = resourcePages.get(domain)?.size || 0;
    }

    const topTrackers = Array.from(trackerMap.values())
      .sort((first, second) => second.occurrences - first.occurrences)
      .slice(0, 10);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const event of events) {
      riskCounts[event.riskLevel] += getEventOccurrenceCount(event);
    }

    const totalOccurrences = events.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );
    const percentage = (count: number) =>
      totalOccurrences > 0
        ? Math.round((count / totalOccurrences) * 100)
        : 0;
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

    const summary = `Grouped ${events.length} stored rows into ${trackerMap.size} resource-domain labels and ${totalOccurrences} occurrences. Most frequent resource label: ${
      mostFrequent?.name || 'none'
    } (${mostFrequent?.occurrences || 0} occurrences). ${
      crossSiteTrackers.length
    } attributed third-party resource groups appeared on multiple page domains; identity, correlation, and data sharing are not established.`;

    return {
      type: 'pattern',
      summary,
      data: {
        topTrackers,
        crossSiteTrackers,
        riskDistribution,
        totalEvents: totalOccurrences,
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
        `${crossSiteTrackers.length} attributed third-party resource groups appeared on more than one page domain. Review attribution basis, CNAME limitations, ownership, and rule evidence before interpreting this as cross-site tracking.`
      );
    }

    if (riskDistribution.critical > 10) {
      recommendations.push(
        `${riskDistribution.critical}% of recorded occurrences carry the prototype critical label. Inspect the underlying detector evidence and false-positive risk.`
      );
    }

    const mostFrequent = topTrackers[0];
    if (mostFrequent && mostFrequent.occurrences > 50) {
      recommendations.push(
        `${mostFrequent.name} appears in ${mostFrequent.occurrences} recorded occurrences. Check duplicate aggregation and request context before changing browser settings.`
      );
    }

    return recommendations;
  }
}
