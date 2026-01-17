import type { AnalysisResult, TrackerData, TimelineData } from './types';
import { calculatePrivacyScore } from '../privacy-score';
import { AnalysisHelpers } from './helpers';

export class SpecializedAnalyzers {
  static async analyzeTracker(trackerDomain: string): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(30 * 24 * 60 * 60 * 1000);
    const trackerEvents = events.filter(e => e.domain === trackerDomain);
    
    if (trackerEvents.length === 0) {
      return {
        type: 'tracker',
        summary: `No tracking events found for ${trackerDomain}`,
        data: null,
        recommendations: [],
      };
    }
    
    const sites = new Set(trackerEvents.map(e => new URL(e.url).hostname));
    const trackingMethods = new Set(
      trackerEvents
        .filter(e => e.inPageTracking?.method)
        .map(e => e.inPageTracking!.method)
    );
    
    const trackerInfo: TrackerData = {
      domain: trackerDomain,
      name: AnalysisHelpers.getTrackerName(trackerDomain),
      owner: AnalysisHelpers.getTrackerOwner(trackerDomain),
      type: trackerEvents[0]?.trackerType || 'unknown',
      riskLevel: trackerEvents[0]?.riskLevel || 'unknown',
      prevalence: `Found on ${sites.size} websites`,
      occurrences: trackerEvents.length,
      trackingMethods: Array.from(trackingMethods),
      sites: Array.from(sites).slice(0, 10),
    };
    
    const summary = `${trackerInfo.name} (${trackerInfo.owner}) detected ${trackerEvents.length} times across ${sites.size} websites. Risk: ${trackerInfo.riskLevel}.`;
    
    return {
      type: 'tracker',
      summary,
      data: trackerInfo,
      recommendations: this.generateTrackerRecommendations(trackerInfo),
    };
  }

  static async auditWebsite(websiteUrl: string): Promise<AnalysisResult> {
    const domain = new URL(websiteUrl).hostname;
    const events = await AnalysisHelpers.getEventsInTimeframe(7 * 24 * 60 * 60 * 1000);
    const siteEvents = events.filter(e => new URL(e.url).hostname === domain);
    
    if (siteEvents.length === 0) {
      return {
        type: 'website',
        summary: `No tracking data available for ${domain}`,
        data: null,
        recommendations: ['Visit the website to collect tracking data'],
      };
    }
    
    const privacyScore = calculatePrivacyScore(siteEvents, websiteUrl.startsWith('https'));
    
    const trackersByRisk = {
      critical: siteEvents.filter(e => e.riskLevel === 'critical'),
      high: siteEvents.filter(e => e.riskLevel === 'high'),
      medium: siteEvents.filter(e => e.riskLevel === 'medium'),
      low: siteEvents.filter(e => e.riskLevel === 'low'),
    };
    
    const uniqueTrackers = Array.from(
      new Set(siteEvents.map(e => e.domain))
    ).map(domain => ({
      domain,
      name: AnalysisHelpers.getTrackerName(domain),
      count: siteEvents.filter(e => e.domain === domain).length,
      riskLevel: siteEvents.find(e => e.domain === domain)?.riskLevel || 'unknown',
    }));
    
    const thirdPartyCount = uniqueTrackers.filter(t => !t.domain.includes(domain)).length;
    const thirdPartyPercentage = Math.round((thirdPartyCount / uniqueTrackers.length) * 100);
    
    const summary = `${domain} Privacy Score: ${privacyScore.score}/100 (${privacyScore.grade}). ${uniqueTrackers.length} trackers detected (${thirdPartyPercentage}% third-party).`;
    
    const recommendations = [
      ...privacyScore.recommendations,
      ...this.generateWebsiteRecommendations(uniqueTrackers, thirdPartyPercentage),
    ];
    
    return {
      type: 'website',
      summary,
      data: {
        domain,
        privacyScore,
        trackersByRisk,
        uniqueTrackers,
        thirdPartyPercentage,
        totalEvents: siteEvents.length,
      },
      recommendations,
    };
  }

  static async analyzeTimeline(timeframe: number = 7 * 24 * 60 * 60 * 1000): Promise<AnalysisResult> {
    const events = await AnalysisHelpers.getEventsInTimeframe(timeframe);
    
    const dailyEvents = new Map<string, number>();
    const hourlyEvents = new Array(24).fill(0);
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      dailyEvents.set(dayKey, (dailyEvents.get(dayKey) || 0) + 1);
      hourlyEvents[hour]++;
    });
    
    const dailyEntries = Array.from(dailyEvents.entries());
    const peakDay = dailyEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
    const lowestDay = dailyEntries.reduce((min, curr) => curr[1] < min[1] ? curr : min, ['', Infinity]);
    
    const dailyAverage = events.length / Math.max(1, dailyEntries.length);
    const anomalies = dailyEntries
      .filter(([, count]) => count > dailyAverage * 2)
      .map(([date, count]) => ({
        timestamp: new Date(date).getTime(),
        description: `High tracking activity: ${count} events`,
        eventCount: count,
        cause: count > dailyAverage * 3 ? 'Possible news browsing session' : undefined,
      }));
    
    const timelineData: TimelineData = {
      totalEvents: events.length,
      dailyAverage: Math.round(dailyAverage),
      peakDay: peakDay[0],
      lowestDay: lowestDay[0],
      hourlyPatterns: hourlyEvents.map((events, hour) => ({ hour, events })),
      anomalies,
    };
    
    const summary = `${events.length} tracking events over ${Math.round(timeframe / (24 * 60 * 60 * 1000))} days. Peak: ${peakDay[1]} events on ${peakDay[0]}. ${anomalies.length} anomalies detected.`;
    
    return {
      type: 'timeline',
      summary,
      data: timelineData,
      recommendations: this.generateTimelineRecommendations(timelineData),
    };
  }

  private static generateTrackerRecommendations(trackerInfo: TrackerData): string[] {
    const recommendations: string[] = [];
    
    if (trackerInfo.riskLevel === 'critical' || trackerInfo.riskLevel === 'high') {
      recommendations.push(`Block ${trackerInfo.name} using uBlock Origin or similar ad blocker.`);
    }
    
    if (trackerInfo.sites.length > 5) {
      recommendations.push(`This tracker appears on many sites (${trackerInfo.sites.length}). Consider using Privacy Badger for intelligent blocking.`);
    }
    
    if (trackerInfo.trackingMethods.includes('canvas-fingerprint')) {
      recommendations.push('This tracker uses canvas fingerprinting. Use Firefox with privacy.resistFingerprinting enabled.');
    }
    
    return recommendations;
  }

  private static generateWebsiteRecommendations(
    uniqueTrackers: Array<{ domain: string; name: string; count: number; riskLevel: string }>, 
    thirdPartyPercentage: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (thirdPartyPercentage > 80) {
      recommendations.push(`${thirdPartyPercentage}% of trackers are third-party. This site shares data extensively.`);
    }
    
    if (uniqueTrackers.length > 15) {
      recommendations.push(`Excessive tracking detected (${uniqueTrackers.length} trackers). Consider using this site with an ad blocker.`);
    }
    
    const criticalTrackers = uniqueTrackers.filter(t => t.riskLevel === 'critical');
    if (criticalTrackers.length > 0) {
      recommendations.push(`${criticalTrackers.length} critical-risk trackers detected. Use caution on this site.`);
    }
    
    return recommendations;
  }

  private static generateTimelineRecommendations(timelineData: TimelineData): string[] {
    const recommendations: string[] = [];
    
    if (timelineData.anomalies.length > 0) {
      recommendations.push(`${timelineData.anomalies.length} tracking spikes detected. Consider batching similar browsing activities.`);
    }
    
    const peakHour = timelineData.hourlyPatterns.reduce((max, curr) => curr.events > max.events ? curr : max);
    if (peakHour.events > timelineData.dailyAverage * 0.3) {
      recommendations.push(`Peak tracking at ${peakHour.hour}:00. Consider using privacy mode during heavy browsing.`);
    }
    
    return recommendations;
  }
}
