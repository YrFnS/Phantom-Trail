import type { AnalysisResult, TrackerPattern } from './types';
import { AnalysisHelpers } from './helpers';

export class PatternAnalyzer {
  static async analyzePatterns(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);

    const trackerMap = new Map<string, TrackerPattern>();
    const domainSites = new Map<string, Set<string>>();

    events.forEach(event => {
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
        domainSites.set(domain, new Set());
      }

      const tracker = trackerMap.get(domain)!;
      tracker.occurrences++;
      tracker.lastSeen = Math.max(tracker.lastSeen, event.timestamp);
      tracker.firstSeen = Math.min(tracker.firstSeen, event.timestamp);

      const siteDomain = new URL(event.url).hostname;
      domainSites.get(domain)!.add(siteDomain);
    });

    trackerMap.forEach((tracker, domain) => {
      tracker.crossSiteCount = domainSites.get(domain)!.size;
    });

    const topTrackers = Array.from(trackerMap.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(event => riskCounts[event.riskLevel]++);

    const total = events.length;
    const riskDistribution = {
      low: Math.round((riskCounts.low / total) * 100),
      medium: Math.round((riskCounts.medium / total) * 100),
      high: Math.round((riskCounts.high / total) * 100),
      critical: Math.round((riskCounts.critical / total) * 100),
    };

    const crossSiteTrackers = topTrackers.filter(t => t.crossSiteCount > 1);

    const summary = `Analyzed ${events.length} tracking events. Top tracker: ${topTrackers[0]?.name || 'None'} (${topTrackers[0]?.occurrences || 0} occurrences). ${crossSiteTrackers.length} trackers detected across multiple sites.`;

    const recommendations = this.generateRecommendations(
      topTrackers,
      crossSiteTrackers,
      riskDistribution
    );

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
      recommendations,
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
        `${crossSiteTrackers.length} trackers follow you across sites. Consider using Privacy Badger or uBlock Origin.`
      );
    }

    if (riskDistribution.critical > 10) {
      recommendations.push(
        `${riskDistribution.critical}% of tracking is critical risk. Review your browsing habits and use stronger privacy tools.`
      );
    }

    if (topTrackers.length > 0 && topTrackers[0].occurrences > 50) {
      recommendations.push(
        `${topTrackers[0].name} is very active (${topTrackers[0].occurrences} events). Consider blocking this tracker.`
      );
    }

    return recommendations;
  }
}
