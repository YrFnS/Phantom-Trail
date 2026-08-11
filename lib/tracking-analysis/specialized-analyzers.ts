import type { AnalysisResult, TrackerData, TimelineData } from './types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';
import type { TrackingEvent } from '../types';

/**
 * Local analyzers for recorded detector data.
 *
 * These methods retain their historical API names for compatibility. They do
 * not perform a live website audit, verify ownership, or prove tracking.
 */
export class SpecializedAnalyzers {
  static async analyzeTracker(trackerDomain: string): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(
      30 * 24 * 60 * 60 * 1000
    );
    const trackerEvents = events.filter(event => event.domain === trackerDomain);

    if (trackerEvents.length === 0) {
      return {
        type: 'tracker',
        summary: `No recorded detector signals use the domain label ${trackerDomain}. No conclusion can be drawn.`,
        data: null,
        recommendations: [],
      };
    }

    const sites = new Set(
      trackerEvents.map(event => this.getUrlHost(event)).filter(Boolean)
    );
    const trackingMethods = new Set(
      trackerEvents
        .map(event => event.inPageTracking?.method)
        .filter((method): method is NonNullable<typeof method> => Boolean(method))
    );

    const trackerInfo: TrackerData = {
      domain: trackerDomain,
      name: AnalysisHelpers.getTrackerName(trackerDomain),
      owner: AnalysisHelpers.getTrackerOwner(trackerDomain),
      type: trackerEvents[0]?.trackerType || 'unknown',
      riskLevel: trackerEvents[0]?.riskLevel || 'unknown',
      prevalence: `Associated with ${sites.size} recorded URL-host label${
        sites.size === 1 ? '' : 's'
      }`,
      occurrences: trackerEvents.length,
      trackingMethods: Array.from(trackingMethods),
      sites: Array.from(sites).slice(0, 10),
    };

    const summary = `${trackerInfo.name} is a catalog display label for ${trackerDomain}. ${trackerEvents.length} recorded signals use this domain label and are associated with ${sites.size} URL-host label${
      sites.size === 1 ? '' : 's'
    }. Catalog owner label: ${trackerInfo.owner}. Prototype severity: ${trackerInfo.riskLevel}. Attribution and ownership have not been independently verified.`;

    return {
      type: 'tracker',
      summary,
      data: trackerInfo,
      recommendations: this.generateTrackerRecommendations(trackerInfo),
    };
  }

  static async auditWebsite(websiteUrl: string): Promise<AnalysisResult> {
    let pageDomain: string;
    try {
      pageDomain = new URL(websiteUrl).hostname;
    } catch {
      return {
        type: 'website',
        summary: 'The supplied website value is not a valid URL.',
        data: null,
        recommendations: ['Enter a complete hostname or URL and try again.'],
      };
    }

    const events = await AnalysisHelpers.getEventsInTimeframe(
      7 * 24 * 60 * 60 * 1000
    );
    const siteEvents = events.filter(
      event => this.getUrlHost(event) === pageDomain
    );

    if (siteEvents.length === 0) {
      return {
        type: 'website',
        summary: `No recorded detector signals are associated with the URL-host label ${pageDomain}. This does not show that the website has no tracking.`,
        data: null,
        recommendations: [
          'A live audit was not performed. Review detector coverage and attribution before drawing conclusions.',
        ],
      };
    }

    const privacyScore = calculatePrivacyScore(
      siteEvents,
      websiteUrl.startsWith('https://')
    );

    const trackersByRisk = {
      critical: siteEvents.filter(event => event.riskLevel === 'critical'),
      high: siteEvents.filter(event => event.riskLevel === 'high'),
      medium: siteEvents.filter(event => event.riskLevel === 'medium'),
      low: siteEvents.filter(event => event.riskLevel === 'low'),
    };

    const uniqueDomains = Array.from(
      new Set(siteEvents.map(event => event.domain || 'unknown'))
    );
    const uniqueTrackers = uniqueDomains.map(domain => ({
      domain,
      name: AnalysisHelpers.getTrackerName(domain),
      count: siteEvents.filter(event => event.domain === domain).length,
      riskLevel:
        siteEvents.find(event => event.domain === domain)?.riskLevel ||
        'unknown',
    }));

    const differentDomainCount = uniqueTrackers.filter(
      item => !this.isSameSiteLabel(item.domain, pageDomain)
    ).length;
    const thirdPartyPercentage =
      uniqueTrackers.length === 0
        ? 0
        : Math.round((differentDomainCount / uniqueTrackers.length) * 100);

    const summary = `${pageDomain}: ${siteEvents.length} recorded detector signals, ${uniqueTrackers.length} unique event-domain labels, and experimental heuristic ${privacyScore.score}/100 (${privacyScore.grade}). ${thirdPartyPercentage}% of the event-domain labels differ from the page host under a simple hostname comparison. This is not a live privacy audit or proof of third-party data sharing.`;

    return {
      type: 'website',
      summary,
      data: {
        domain: pageDomain,
        privacyScore,
        trackersByRisk,
        uniqueTrackers,
        thirdPartyPercentage,
        totalEvents: siteEvents.length,
      },
      recommendations: this.generateWebsiteRecommendations(
        uniqueTrackers,
        thirdPartyPercentage,
        siteEvents.length
      ),
    };
  }

  static async analyzeTimeline(
    timeframe: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    const dailyEvents = new Map<string, number>();
    const hourlyEvents = new Array<number>(24).fill(0);

    for (const event of events) {
      const date = new Date(event.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      const dayKey = date.toISOString().split('T')[0];
      dailyEvents.set(dayKey, (dailyEvents.get(dayKey) || 0) + 1);
      hourlyEvents[date.getHours()]++;
    }

    const dailyEntries = Array.from(dailyEvents.entries());
    const peakDay = dailyEntries.reduce<[string, number]>(
      (current, entry) => (entry[1] > current[1] ? entry : current),
      ['', 0]
    );
    const lowestDay = dailyEntries.reduce<[string, number]>(
      (current, entry) => (entry[1] < current[1] ? entry : current),
      ['', Number.POSITIVE_INFINITY]
    );
    const dailyAverage = events.length / Math.max(1, dailyEntries.length);

    const anomalies = dailyEntries
      .filter(([, count]) => dailyAverage > 0 && count > dailyAverage * 2)
      .map(([date, count]) => ({
        timestamp: new Date(date).getTime(),
        description: `Recorded signal count (${count}) exceeded twice the window's daily average`,
        eventCount: count,
      }));

    const timelineData: TimelineData = {
      totalEvents: events.length,
      dailyAverage: Math.round(dailyAverage),
      peakDay: peakDay[0] || 'none',
      lowestDay:
        Number.isFinite(lowestDay[1]) && lowestDay[0]
          ? lowestDay[0]
          : 'none',
      hourlyPatterns: hourlyEvents.map((count, hour) => ({
        hour,
        events: count,
      })),
      anomalies,
    };

    const days = Math.round(timeframe / (24 * 60 * 60 * 1000));
    const summary = `${events.length} recorded detector signals in the selected ${days}-day window. Highest daily count: ${peakDay[1]}${
      peakDay[0] ? ` on ${peakDay[0]}` : ''
    }. ${anomalies.length} days matched the simple deviation rule. The counts reflect stored events, not total browsing or confirmed tracking activity.`;

    return {
      type: 'timeline',
      summary,
      data: timelineData,
      recommendations: this.generateTimelineRecommendations(timelineData),
    };
  }

  private static getUrlHost(event: TrackingEvent): string {
    try {
      return new URL(event.url).hostname;
    } catch {
      return '';
    }
  }

  private static isSameSiteLabel(
    candidateDomain: string,
    pageDomain: string
  ): boolean {
    const candidate = candidateDomain.toLowerCase().replace(/^www\./, '');
    const page = pageDomain.toLowerCase().replace(/^www\./, '');
    return (
      candidate === page ||
      candidate.endsWith(`.${page}`) ||
      page.endsWith(`.${candidate}`)
    );
  }

  private static generateTrackerRecommendations(
    trackerInfo: TrackerData
  ): string[] {
    const recommendations = [
      `Review the recorded URLs and detector evidence associated with ${trackerInfo.domain}; a catalog match does not prove tracking or ownership.`,
    ];

    if (trackerInfo.sites.length > 5) {
      recommendations.push(
        `The domain label is associated with ${trackerInfo.sites.length} URL-host labels in stored data. Check page/resource attribution before treating this as cross-site prevalence.`
      );
    }

    if (trackerInfo.trackingMethods.includes('canvas-fingerprint')) {
      recommendations.push(
        'A canvas-related instrumentation signal was recorded. Normal rendering can trigger the rule, so inspect the operation sequence before concluding that fingerprinting occurred.'
      );
    }

    return recommendations;
  }

  private static generateWebsiteRecommendations(
    uniqueTrackers: Array<{
      domain: string;
      name: string;
      count: number;
      riskLevel: string;
    }>,
    differentDomainPercentage: number,
    eventCount: number
  ): string[] {
    const recommendations: string[] = [
      `Review the ${eventCount} underlying events and separate page-host labels from requested resource domains before interpreting the heuristic.`,
    ];

    if (differentDomainPercentage > 80) {
      recommendations.push(
        `${differentDomainPercentage}% of unique event-domain labels differ from the page host under a simple comparison. This does not prove that those parties received or shared personal data.`
      );
    }

    if (uniqueTrackers.length > 15) {
      recommendations.push(
        `${uniqueTrackers.length} unique event-domain labels were recorded. Check duplicate requests, false positives, and catalog breadth before installing or changing software.`
      );
    }

    const criticalLabels = uniqueTrackers.filter(
      item => item.riskLevel === 'critical'
    );
    if (criticalLabels.length > 0) {
      recommendations.push(
        `${criticalLabels.length} domain labels include at least one critical-labeled event. Inspect the detector evidence; this is not a verified incident.`
      );
    }

    return recommendations;
  }

  private static generateTimelineRecommendations(
    timelineData: TimelineData
  ): string[] {
    const recommendations: string[] = [];

    if (timelineData.anomalies.length > 0) {
      recommendations.push(
        `${timelineData.anomalies.length} days exceeded the simple count threshold. Review whether page refreshes, duplicate requests, or detector changes explain the difference.`
      );
    }

    const peakHour = timelineData.hourlyPatterns.reduce(
      (current, entry) =>
        entry.events > current.events ? entry : current,
      { hour: 0, events: 0 }
    );
    if (peakHour.events > 0) {
      recommendations.push(
        `The largest hourly bucket is ${peakHour.hour}:00 with ${peakHour.events} stored signals. This is a storage pattern, not a conclusion about user behavior.`
      );
    }

    return recommendations;
  }
}
