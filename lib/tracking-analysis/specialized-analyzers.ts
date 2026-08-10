import type { AnalysisResult, TrackerData, TimelineData } from './types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';
import {
  eventMatchesPageDomain,
  getEventOccurrenceCount,
  getPageDomain,
  getResourceDomain,
  normalizeDomain,
  normalizeTrackingEvent,
} from '../event-attribution.mts';

/**
 * Local analyzers for attributed detector data.
 *
 * Historical API names remain for compatibility. These methods do not perform a
 * live website audit, verify ownership, or prove tracking.
 */
export class SpecializedAnalyzers {
  static async analyzeTracker(trackerDomain: string): Promise<AnalysisResult> {
    const normalizedTrackerDomain = normalizeDomain(trackerDomain);
    const events = await AnalysisHelpers.getEventsInTimeframe(
      30 * 24 * 60 * 60 * 1000
    );
    const trackerEvents = events.filter(
      event => getResourceDomain(event) === normalizedTrackerDomain
    );

    if (trackerEvents.length === 0) {
      return {
        type: 'tracker',
        summary: `No recorded detector signals use the resource-domain label ${normalizedTrackerDomain}. No conclusion can be drawn.`,
        data: null,
        recommendations: [],
      };
    }

    const pages = new Set(trackerEvents.map(getPageDomain).filter(Boolean));
    const trackingMethods = new Set(
      trackerEvents
        .map(event => event.inPageTracking?.method)
        .filter((method): method is NonNullable<typeof method> => Boolean(method))
    );
    const occurrences = trackerEvents.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );

    const trackerInfo: TrackerData = {
      domain: normalizedTrackerDomain,
      name: AnalysisHelpers.getTrackerName(normalizedTrackerDomain),
      owner: AnalysisHelpers.getTrackerOwner(normalizedTrackerDomain),
      type: trackerEvents[0]?.trackerType || 'unknown',
      riskLevel: trackerEvents[0]?.riskLevel || 'unknown',
      prevalence: `Attributed to ${pages.size} recorded page domain${
        pages.size === 1 ? '' : 's'
      }`,
      occurrences,
      trackingMethods: Array.from(trackingMethods),
      sites: Array.from(pages).slice(0, 10),
    };

    const summary = `${trackerInfo.name} is a catalog display label for resource domain ${normalizedTrackerDomain}. ${trackerEvents.length} stored rows represent ${occurrences} occurrences across ${pages.size} attributed page domain${
      pages.size === 1 ? '' : 's'
    }. Catalog owner label: ${trackerInfo.owner}. Prototype severity: ${trackerInfo.riskLevel}. Ownership, identity, and data use are not independently verified.`;

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
      pageDomain = normalizeDomain(new URL(websiteUrl).hostname);
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
    const siteEvents = events.filter(event =>
      eventMatchesPageDomain(event, pageDomain)
    );

    if (siteEvents.length === 0) {
      return {
        type: 'website',
        summary: `No recorded detector signals are attributed to page domain ${pageDomain}. This does not show that the website has no tracking.`,
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

    const resourceDomains = Array.from(
      new Set(siteEvents.map(getResourceDomain).filter(Boolean))
    );
    const uniqueTrackers = resourceDomains.map(domain => {
      const matchingEvents = siteEvents.filter(
        event => getResourceDomain(event) === domain
      );
      return {
        domain,
        name: AnalysisHelpers.getTrackerName(domain),
        count: matchingEvents.reduce(
          (total, event) => total + getEventOccurrenceCount(event),
          0
        ),
        riskLevel: matchingEvents[0]?.riskLevel || 'unknown',
      };
    });

    const thirdPartyResources = new Set(
      siteEvents
        .map(normalizeTrackingEvent)
        .filter(event => event.context?.party === 'third-party')
        .map(getResourceDomain)
        .filter(Boolean)
    );
    const thirdPartyPercentage =
      resourceDomains.length === 0
        ? 0
        : Math.round(
            (thirdPartyResources.size / resourceDomains.length) * 100
          );
    const occurrenceCount = siteEvents.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );

    const summary = `${pageDomain}: ${siteEvents.length} stored rows, ${occurrenceCount} occurrences, ${resourceDomains.length} unique resource-domain labels, and experimental heuristic ${privacyScore.score}/100 (${privacyScore.grade}). ${thirdPartyPercentage}% of unique resource domains carry the prototype third-party relationship label. This is not a live privacy audit or proof of data sharing.`;

    return {
      type: 'website',
      summary,
      data: {
        domain: pageDomain,
        privacyScore,
        trackersByRisk,
        uniqueTrackers,
        thirdPartyPercentage,
        totalEvents: occurrenceCount,
      },
      recommendations: this.generateWebsiteRecommendations(
        uniqueTrackers,
        thirdPartyPercentage,
        occurrenceCount
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
      const date = new Date(event.lastSeenAt || event.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      const occurrences = getEventOccurrenceCount(event);
      const dayKey = date.toISOString().split('T')[0];
      dailyEvents.set(dayKey, (dailyEvents.get(dayKey) || 0) + occurrences);
      hourlyEvents[date.getHours()] += occurrences;
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
    const occurrenceCount = events.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );
    const dailyAverage = occurrenceCount / Math.max(1, dailyEntries.length);

    const anomalies = dailyEntries
      .filter(([, count]) => dailyAverage > 0 && count > dailyAverage * 2)
      .map(([date, count]) => ({
        timestamp: new Date(date).getTime(),
        description: `Recorded occurrence count (${count}) exceeded twice the window's daily average`,
        eventCount: count,
      }));

    const timelineData: TimelineData = {
      totalEvents: occurrenceCount,
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
    const summary = `${events.length} stored rows represent ${occurrenceCount} detector occurrences in the selected ${days}-day window. Highest daily count: ${peakDay[1]}${
      peakDay[0] ? ` on ${peakDay[0]}` : ''
    }. ${anomalies.length} days matched the simple deviation rule. These are storage patterns, not total browsing or confirmed tracking activity.`;

    return {
      type: 'timeline',
      summary,
      data: timelineData,
      recommendations: this.generateTimelineRecommendations(timelineData),
    };
  }

  private static generateTrackerRecommendations(
    trackerInfo: TrackerData
  ): string[] {
    const recommendations = [
      `Review the page/resource routes and detector evidence associated with ${trackerInfo.domain}; a catalog match does not prove tracking or ownership.`,
    ];

    if (trackerInfo.sites.length > 5) {
      recommendations.push(
        `The resource-domain label is attributed to ${trackerInfo.sites.length} page domains in stored data. Confirm attribution and rule quality before treating this as cross-site prevalence.`
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
    thirdPartyPercentage: number,
    occurrenceCount: number
  ): string[] {
    const recommendations: string[] = [
      `Review the ${occurrenceCount} underlying occurrences, attribution basis, party basis, and detector confidence before interpreting the heuristic.`,
    ];

    if (thirdPartyPercentage > 80) {
      recommendations.push(
        `${thirdPartyPercentage}% of unique resource-domain labels carry the prototype third-party classification. This does not prove that those parties received or shared personal data.`
      );
    }

    if (uniqueTrackers.length > 15) {
      recommendations.push(
        `${uniqueTrackers.length} unique resource-domain labels were recorded. Check duplicate aggregation, false positives, and catalog breadth before installing or changing software.`
      );
    }

    const criticalLabels = uniqueTrackers.filter(
      item => item.riskLevel === 'critical'
    );
    if (criticalLabels.length > 0) {
      recommendations.push(
        `${criticalLabels.length} resource-domain labels include at least one critical-labeled event. Inspect the detector evidence; this is not a verified incident.`
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
        `${timelineData.anomalies.length} days exceeded the simple count threshold. Review whether page refreshes, duplicate aggregation, or detector changes explain the difference.`
      );
    }

    const peakHour = timelineData.hourlyPatterns.reduce(
      (current, entry) =>
        entry.events > current.events ? entry : current,
      { hour: 0, events: 0 }
    );
    if (peakHour.events > 0) {
      recommendations.push(
        `The largest hourly bucket is ${peakHour.hour}:00 with ${peakHour.events} stored occurrences. This is a storage pattern, not a conclusion about user behavior.`
      );
    }

    return recommendations;
  }
}
