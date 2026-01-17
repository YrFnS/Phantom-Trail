import type { TrackingEvent, RiskLevel, PrivacyScore } from './types';
import { calculatePrivacyScore } from './privacy-score';
import { StorageManager } from './storage-manager';

export interface TrackerPattern {
  domain: string;
  name: string;
  occurrences: number;
  riskLevel: RiskLevel;
  crossSiteCount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface AnalysisResult {
  type: 'pattern' | 'risk' | 'tracker' | 'website' | 'timeline';
  summary: string;
  data: PatternData | RiskData | TrackerData | WebsiteData | TimelineData | null;
  recommendations: string[];
}

export interface PatternData {
  topTrackers: TrackerPattern[];
  crossSiteTrackers: TrackerPattern[];
  riskDistribution: Record<string, number>;
  totalEvents: number;
  timeframeDays: number;
}

export interface RiskData {
  overallScore: PrivacyScore;
  trend: string;
  riskySites: Array<{
    domain: string;
    score: PrivacyScore;
    events: number;
  }>;
  criticalEvents: TrackingEvent[];
  historicalScores: number[];
}

export interface TrackerData {
  domain: string;
  name: string;
  owner: string;
  type: string;
  riskLevel: string;
  prevalence: string;
  occurrences: number;
  trackingMethods: string[];
  sites: string[];
}

export interface WebsiteData {
  domain: string;
  privacyScore: PrivacyScore;
  trackersByRisk: Record<string, TrackingEvent[]>;
  uniqueTrackers: Array<{
    domain: string;
    name: string;
    count: number;
    riskLevel: string;
  }>;
  thirdPartyPercentage: number;
  totalEvents: number;
}

export interface TimelineData {
  totalEvents: number;
  dailyAverage: number;
  peakDay: string;
  lowestDay: string;
  hourlyPatterns: { hour: number; events: number }[];
  anomalies: Array<{
    timestamp: number;
    description: string;
    eventCount: number;
    cause?: string;
  }>;
}

/**
 * Comprehensive tracking analysis engine
 */
export class TrackingAnalysis {
  /**
   * Analyze tracker patterns from historical data
   */
  static async analyzePatterns(timeframe: number = 7 * 24 * 60 * 60 * 1000): Promise<AnalysisResult> {
    const events = await this.getEventsInTimeframe(timeframe);
    
    // Group by tracker domain
    const trackerMap = new Map<string, TrackerPattern>();
    const domainSites = new Map<string, Set<string>>();
    
    events.forEach(event => {
      const domain = event.domain;
      
      if (!trackerMap.has(domain)) {
        trackerMap.set(domain, {
          domain,
          name: this.getTrackerName(domain),
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
      
      // Track cross-site presence
      const siteDomain = new URL(event.url).hostname;
      domainSites.get(domain)!.add(siteDomain);
    });
    
    // Calculate cross-site counts
    trackerMap.forEach((tracker, domain) => {
      tracker.crossSiteCount = domainSites.get(domain)!.size;
    });
    
    // Sort by occurrences
    const topTrackers = Array.from(trackerMap.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);
    
    // Calculate risk distribution
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(event => riskCounts[event.riskLevel]++);
    
    const total = events.length;
    const riskDistribution = {
      low: Math.round((riskCounts.low / total) * 100),
      medium: Math.round((riskCounts.medium / total) * 100),
      high: Math.round((riskCounts.high / total) * 100),
      critical: Math.round((riskCounts.critical / total) * 100),
    };
    
    // Detect cross-site tracking
    const crossSiteTrackers = topTrackers.filter(t => t.crossSiteCount > 1);
    
    const summary = `Analyzed ${events.length} tracking events. Top tracker: ${topTrackers[0]?.name || 'None'} (${topTrackers[0]?.occurrences || 0} occurrences). ${crossSiteTrackers.length} trackers detected across multiple sites.`;
    
    const recommendations = this.generatePatternRecommendations(topTrackers, crossSiteTrackers, riskDistribution);
    
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

  /**
   * Perform privacy risk assessment
   */
  static async analyzeRisk(timeframe: number = 7 * 24 * 60 * 60 * 1000): Promise<AnalysisResult> {
    const events = await this.getEventsInTimeframe(timeframe);
    
    // Calculate overall privacy score
    const overallScore = calculatePrivacyScore(events, true);
    
    // Get historical scores for trend
    const historicalScores = await this.getHistoricalScores(7);
    const trend = this.calculateTrend(historicalScores);
    
    // Identify high-risk websites
    const siteEvents = new Map<string, TrackingEvent[]>();
    events.forEach(event => {
      const domain = new URL(event.url).hostname;
      if (!siteEvents.has(domain)) {
        siteEvents.set(domain, []);
      }
      siteEvents.get(domain)!.push(event);
    });
    
    const riskySites = Array.from(siteEvents.entries())
      .map(([domain, siteEvts]) => ({
        domain,
        score: calculatePrivacyScore(siteEvts, true),
        events: siteEvts.length,
      }))
      .filter(site => site.score.score < 70)
      .sort((a, b) => a.score.score - b.score.score)
      .slice(0, 5);
    
    // Find critical events
    const criticalEvents = events
      .filter(e => e.riskLevel === 'critical')
      .slice(0, 10);
    
    const summary = `Privacy Score: ${overallScore.score}/100 (${overallScore.grade}). Trend: ${trend}. ${riskySites.length} high-risk websites detected.`;
    
    const recommendations = [
      ...overallScore.recommendations,
      ...this.generateRiskRecommendations(riskySites, criticalEvents),
    ];
    
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
      recommendations,
    };
  }

  /**
   * Analyze specific tracker behavior
   */
  static async analyzeTracker(trackerDomain: string): Promise<AnalysisResult> {
    const events = await this.getEventsInTimeframe(30 * 24 * 60 * 60 * 1000); // 30 days
    const trackerEvents = events.filter(e => e.domain === trackerDomain);
    
    if (trackerEvents.length === 0) {
      return {
        type: 'tracker',
        summary: `No tracking events found for ${trackerDomain}`,
        data: null,
        recommendations: [],
      };
    }
    
    // Analyze tracker behavior
    const sites = new Set(trackerEvents.map(e => new URL(e.url).hostname));
    const trackingMethods = new Set(
      trackerEvents
        .filter(e => e.inPageTracking?.method)
        .map(e => e.inPageTracking!.method)
    );
    
    const trackerInfo = {
      domain: trackerDomain,
      name: this.getTrackerName(trackerDomain),
      owner: this.getTrackerOwner(trackerDomain),
      type: trackerEvents[0]?.trackerType || 'unknown',
      riskLevel: trackerEvents[0]?.riskLevel || 'unknown',
      prevalence: `Found on ${sites.size} websites`,
      occurrences: trackerEvents.length,
      trackingMethods: Array.from(trackingMethods),
      sites: Array.from(sites).slice(0, 10),
    };
    
    const summary = `${trackerInfo.name} (${trackerInfo.owner}) detected ${trackerEvents.length} times across ${sites.size} websites. Risk: ${trackerInfo.riskLevel}.`;
    
    const recommendations = this.generateTrackerRecommendations(trackerInfo);
    
    return {
      type: 'tracker',
      summary,
      data: trackerInfo,
      recommendations,
    };
  }

  /**
   * Audit specific website privacy
   */
  static async auditWebsite(websiteUrl: string): Promise<AnalysisResult> {
    const domain = new URL(websiteUrl).hostname;
    const events = await this.getEventsInTimeframe(7 * 24 * 60 * 60 * 1000);
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
    
    // Group trackers by risk level
    const trackersByRisk = {
      critical: siteEvents.filter(e => e.riskLevel === 'critical'),
      high: siteEvents.filter(e => e.riskLevel === 'high'),
      medium: siteEvents.filter(e => e.riskLevel === 'medium'),
      low: siteEvents.filter(e => e.riskLevel === 'low'),
    };
    
    // Get unique trackers
    const uniqueTrackers = Array.from(
      new Set(siteEvents.map(e => e.domain))
    ).map(domain => ({
      domain,
      name: this.getTrackerName(domain),
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

  /**
   * Analyze tracking timeline
   */
  static async analyzeTimeline(timeframe: number = 7 * 24 * 60 * 60 * 1000): Promise<AnalysisResult> {
    const events = await this.getEventsInTimeframe(timeframe);
    
    // Group by day
    const dailyEvents = new Map<string, number>();
    const hourlyEvents = new Array(24).fill(0);
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      dailyEvents.set(dayKey, (dailyEvents.get(dayKey) || 0) + 1);
      hourlyEvents[hour]++;
    });
    
    // Find peak and lowest days
    const dailyEntries = Array.from(dailyEvents.entries());
    const peakDay = dailyEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
    const lowestDay = dailyEntries.reduce((min, curr) => curr[1] < min[1] ? curr : min, ['', Infinity]);
    
    // Detect anomalies (days with >2x average activity)
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
    
    const recommendations = this.generateTimelineRecommendations(timelineData);
    
    return {
      type: 'timeline',
      summary,
      data: timelineData,
      recommendations,
    };
  }

  // Helper methods
  private static async getEventsInTimeframe(timeframe: number): Promise<TrackingEvent[]> {
    const cutoff = Date.now() - timeframe;
    const allEvents = await StorageManager.getRecentEvents(1000); // Get more events for analysis
    return allEvents.filter((event: TrackingEvent) => event.timestamp >= cutoff);
  }

  private static async getHistoricalScores(days: number): Promise<number[]> {
    // This would ideally be stored separately, for now calculate from events
    const scores: number[] = [];
    for (let i = 0; i < days; i++) {
      const dayStart = Date.now() - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = Date.now() - i * 24 * 60 * 60 * 1000;
      const dayEvents = await this.getEventsInTimeframe(dayEnd - dayStart);
      const dayScore = calculatePrivacyScore(dayEvents.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd), true);
      scores.unshift(dayScore.score);
    }
    return scores;
  }

  private static calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'stable';
    const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const diff = recent - older;
    
    if (diff > 5) return '⬆️ Improving';
    if (diff < -5) return '⬇️ Declining';
    return '➡️ Stable';
  }

  private static getTrackerName(domain: string): string {
    const names: Record<string, string> = {
      'google-analytics.com': 'Google Analytics',
      'doubleclick.net': 'Google DoubleClick',
      'facebook.com': 'Facebook Pixel',
      'googletagmanager.com': 'Google Tag Manager',
      'googlesyndication.com': 'Google AdSense',
    };
    return names[domain] || domain;
  }

  private static getTrackerOwner(domain: string): string {
    const owners: Record<string, string> = {
      'google-analytics.com': 'Google LLC',
      'doubleclick.net': 'Google LLC',
      'facebook.com': 'Meta Platforms',
      'googletagmanager.com': 'Google LLC',
      'googlesyndication.com': 'Google LLC',
    };
    return owners[domain] || 'Unknown';
  }

  private static generatePatternRecommendations(
    topTrackers: TrackerPattern[],
    crossSiteTrackers: TrackerPattern[],
    riskDistribution: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];
    
    if (crossSiteTrackers.length > 0) {
      recommendations.push(`${crossSiteTrackers.length} trackers follow you across sites. Consider using Privacy Badger or uBlock Origin.`);
    }
    
    if (riskDistribution.critical > 10) {
      recommendations.push(`${riskDistribution.critical}% of tracking is critical risk. Review your browsing habits and use stronger privacy tools.`);
    }
    
    if (topTrackers.length > 0 && topTrackers[0].occurrences > 50) {
      recommendations.push(`${topTrackers[0].name} is very active (${topTrackers[0].occurrences} events). Consider blocking this tracker.`);
    }
    
    return recommendations;
  }

  private static generateRiskRecommendations(riskySites: Array<{ domain: string; score: PrivacyScore; events: number }>, criticalEvents: TrackingEvent[]): string[] {
    const recommendations: string[] = [];
    
    if (riskySites.length > 0) {
      recommendations.push(`Avoid ${riskySites[0].domain} or use with strong privacy protection (score: ${riskySites[0].score.score}/100).`);
    }
    
    if (criticalEvents.length > 0) {
      recommendations.push(`${criticalEvents.length} critical tracking events detected. Review your privacy settings.`);
    }
    
    return recommendations;
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

  private static generateWebsiteRecommendations(uniqueTrackers: Array<{ domain: string; name: string; count: number; riskLevel: string }>, thirdPartyPercentage: number): string[] {
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
