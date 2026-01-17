import { TrackingAnalysis, type AnalysisResult, type PatternData, type RiskData, type TrackerData, type WebsiteData, type TimelineData, type TrackerPattern } from './tracking-analysis';
import { AIEngine } from './ai-engine';
import { StorageManager } from './storage-manager';
import type { TrackingEvent, PrivacyScore } from './types';

export interface AnalysisQuery {
  type: 'pattern' | 'risk' | 'tracker' | 'website' | 'timeline' | 'chat';
  query: string;
  parameters?: {
    timeframe?: number;
    trackerDomain?: string;
    websiteUrl?: string;
  };
}

/**
 * AI-powered analysis prompt handler
 */
export class AIAnalysisPrompts {
  /**
   * Process natural language analysis queries
   */
  static async processQuery(query: string): Promise<string> {
    const analysisQuery = this.parseQuery(query);
    
    try {
      let result: AnalysisResult | null = null;
      
      switch (analysisQuery.type) {
        case 'pattern':
          result = await TrackingAnalysis.analyzePatterns(
            analysisQuery.parameters?.timeframe
          );
          break;
          
        case 'risk':
          result = await TrackingAnalysis.analyzeRisk(
            analysisQuery.parameters?.timeframe
          );
          break;
          
        case 'tracker':
          if (analysisQuery.parameters?.trackerDomain) {
            result = await TrackingAnalysis.analyzeTracker(
              analysisQuery.parameters.trackerDomain
            );
          }
          break;
          
        case 'website':
          if (analysisQuery.parameters?.websiteUrl) {
            result = await TrackingAnalysis.auditWebsite(
              analysisQuery.parameters.websiteUrl
            );
          }
          break;
          
        case 'timeline':
          result = await TrackingAnalysis.analyzeTimeline(
            analysisQuery.parameters?.timeframe
          );
          break;
          
        case 'chat':
          return await this.handleChatQuery(query);
      }
      
      if (result) {
        return this.formatAnalysisResult(result);
      }
      
      return "I couldn't analyze that request. Please try asking about tracking patterns, privacy risks, specific trackers, or website audits.";
      
    } catch (error) {
      console.error('Analysis query failed:', error);
      return "Sorry, I encountered an error while analyzing your request. Please try again.";
    }
  }

  /**
   * Parse natural language query into structured analysis request
   */
  private static parseQuery(query: string): AnalysisQuery {
    const lowerQuery = query.toLowerCase();
    
    // Pattern analysis queries
    if (this.matchesPatterns(lowerQuery, [
      'tracking patterns', 'top trackers', 'most common trackers',
      'cross-site tracking', 'tracker frequency', 'analyze patterns'
    ])) {
      return {
        type: 'pattern',
        query,
        parameters: { timeframe: this.extractTimeframe(query) }
      };
    }
    
    // Risk assessment queries
    if (this.matchesPatterns(lowerQuery, [
      'privacy risk', 'privacy score', 'how private', 'risk assessment',
      'privacy rating', 'overall risk', 'privacy trend'
    ])) {
      return {
        type: 'risk',
        query,
        parameters: { timeframe: this.extractTimeframe(query) }
      };
    }
    
    // Specific tracker queries
    const trackerDomain = this.extractTrackerDomain(query);
    if (trackerDomain || this.matchesPatterns(lowerQuery, [
      'analyze tracker', 'tracker behavior', 'what does', 'who owns'
    ])) {
      return {
        type: 'tracker',
        query,
        parameters: { trackerDomain }
      };
    }
    
    // Website audit queries
    const websiteUrl = this.extractWebsiteUrl(query);
    if (websiteUrl || this.matchesPatterns(lowerQuery, [
      'audit website', 'website privacy', 'site privacy', 'how private is'
    ])) {
      return {
        type: 'website',
        query,
        parameters: { websiteUrl }
      };
    }
    
    // Timeline analysis queries
    if (this.matchesPatterns(lowerQuery, [
      'timeline', 'when am i tracked', 'tracking over time', 'tracking history',
      'peak tracking', 'tracking trends', 'anomalies'
    ])) {
      return {
        type: 'timeline',
        query,
        parameters: { timeframe: this.extractTimeframe(query) }
      };
    }
    
    // Default to chat for everything else
    return { type: 'chat', query };
  }

  /**
   * Handle general chat queries with AI
   */
  private static async handleChatQuery(query: string): Promise<string> {
    // Get recent tracking events for context
    const recentEvents = await this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours
    
    // Use AI engine for natural language response
    const response = await AIEngine.chatQuery(query, recentEvents);
    return response;
  }

  /**
   * Format analysis result into readable response
   */
  private static formatAnalysisResult(result: AnalysisResult): string {
    let response = `# ${this.getAnalysisTitle(result.type)}\n\n`;
    response += `${result.summary}\n\n`;
    
    switch (result.type) {
      case 'pattern':
        response += this.formatPatternAnalysis(result.data as PatternData);
        break;
      case 'risk':
        response += this.formatRiskAnalysis(result.data as RiskData);
        break;
      case 'tracker':
        response += this.formatTrackerAnalysis(result.data as TrackerData | null);
        break;
      case 'website':
        response += this.formatWebsiteAnalysis(result.data as WebsiteData | null);
        break;
      case 'timeline':
        response += this.formatTimelineAnalysis(result.data as TimelineData);
        break;
    }
    
    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }
    
    return response;
  }

  private static formatPatternAnalysis(data: PatternData): string {
    let output = `## Top Trackers (Last ${data.timeframeDays} Days)\n`;
    data.topTrackers.slice(0, 5).forEach((tracker: TrackerPattern, i: number) => {
      output += `${i + 1}. **${tracker.name}** - ${tracker.occurrences} occurrences (${tracker.riskLevel} risk)\n`;
    });
    
    if (data.crossSiteTrackers.length > 0) {
      output += `\n## Cross-Site Tracking Detected\n`;
      data.crossSiteTrackers.slice(0, 3).forEach((tracker: TrackerPattern) => {
        output += `- **${tracker.name}** appears on ${tracker.crossSiteCount} different sites\n`;
      });
    }
    
    output += `\n## Risk Distribution\n`;
    output += `- Low Risk: ${data.riskDistribution.low}%\n`;
    output += `- Medium Risk: ${data.riskDistribution.medium}%\n`;
    output += `- High Risk: ${data.riskDistribution.high}%\n`;
    output += `- Critical Risk: ${data.riskDistribution.critical}%\n`;
    
    return output;
  }

  private static formatRiskAnalysis(data: RiskData): string {
    let output = `## Overall Privacy Score: ${data.overallScore.score}/100 (${data.overallScore.grade})\n`;
    output += `**Trend:** ${data.trend}\n\n`;
    
    if (data.riskySites.length > 0) {
      output += `## High-Risk Websites\n`;
      data.riskySites.forEach((site: { domain: string; score: PrivacyScore; events: number }, i: number) => {
        output += `${i + 1}. **${site.domain}** - Score: ${site.score.score}/100 (${site.score.grade})\n`;
        output += `   - ${site.events} tracking events\n`;
      });
    }
    
    if (data.criticalEvents.length > 0) {
      output += `\n## Critical Events (Last 24h)\n`;
      const eventCounts = new Map();
      data.criticalEvents.forEach((event: TrackingEvent) => {
        const key = event.inPageTracking?.method || event.trackerType;
        eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      });
      
      Array.from(eventCounts.entries()).forEach(([method, count]) => {
        output += `- ${count as number} ${method as string} attempts\n`;
      });
    }
    
    return output;
  }

  private static formatTrackerAnalysis(data: TrackerData | null): string {
    if (!data) return 'No data available for this tracker.';
    
    let output = `## Tracker Profile\n`;
    output += `- **Owner:** ${data.owner}\n`;
    output += `- **Type:** ${data.type}\n`;
    output += `- **Risk Level:** ${data.riskLevel}\n`;
    output += `- **Prevalence:** ${data.prevalence}\n\n`;
    
    output += `## Data Collection\n`;
    if (data.trackingMethods.length > 0) {
      output += `**Methods detected:**\n`;
      data.trackingMethods.forEach((method: string) => {
        output += `- ${method.replace('-', ' ')}\n`;
      });
    } else {
      output += `- Standard web tracking (cookies, pixels)\n`;
    }
    
    if (data.sites.length > 0) {
      output += `\n## Found on these sites:\n`;
      data.sites.forEach((site: string) => {
        output += `- ${site}\n`;
      });
    }
    
    return output;
  }

  private static formatWebsiteAnalysis(data: WebsiteData | null): string {
    if (!data) return 'No data available for this website.';
    
    let output = `## Privacy Score: ${data.privacyScore.score}/100 (${data.privacyScore.grade})\n\n`;
    
    output += `## Trackers Detected (${data.uniqueTrackers.length} total)\n`;
    
    ['critical', 'high', 'medium', 'low'].forEach(risk => {
      const trackers = data.trackersByRisk[risk];
      if (trackers.length > 0) {
        output += `### ${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk (${trackers.length})\n`;
        const uniqueDomains = [...new Set(trackers.map((t: TrackingEvent) => t.domain))] as string[];
        uniqueDomains.slice(0, 5).forEach((domain: string) => {
          const name = this.getTrackerDisplayName(domain);
          output += `- ${name}\n`;
        });
      }
    });
    
    output += `\n## Privacy Issues\n`;
    output += `- **Third-party tracking:** ${data.thirdPartyPercentage}% of trackers\n`;
    output += `- **Total events:** ${data.totalEvents}\n`;
    
    return output;
  }

  private static formatTimelineAnalysis(data: TimelineData): string {
    let output = `## Tracking Volume\n`;
    output += `- **Total Events:** ${data.totalEvents}\n`;
    output += `- **Daily Average:** ${data.dailyAverage} events\n`;
    output += `- **Peak Day:** ${data.peakDay}\n`;
    output += `- **Lowest Day:** ${data.lowestDay}\n\n`;
    
    const peakHour = data.hourlyPatterns.reduce((max: { hour: number; events: number }, curr: { hour: number; events: number }) => 
      curr.events > max.events ? curr : max
    );
    output += `## Peak Activity\n`;
    output += `- **Peak Hour:** ${peakHour.hour}:00 (${peakHour.events} events)\n\n`;
    
    if (data.anomalies.length > 0) {
      output += `## Anomalies Detected\n`;
      data.anomalies.forEach((anomaly: { timestamp: number; description: string; cause?: string }, i: number) => {
        const date = new Date(anomaly.timestamp).toLocaleDateString();
        output += `${i + 1}. **${date}** - ${anomaly.description}\n`;
        if (anomaly.cause) {
          output += `   - Likely cause: ${anomaly.cause}\n`;
        }
      });
    }
    
    return output;
  }

  // Helper methods
  private static matchesPatterns(query: string, patterns: string[]): boolean {
    return patterns.some(pattern => query.includes(pattern));
  }

  private static extractTimeframe(query: string): number {
    const timeframes: Record<string, number> = {
      'today': 24 * 60 * 60 * 1000,
      'yesterday': 2 * 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000,
      '24 hours': 24 * 60 * 60 * 1000,
      '7 days': 7 * 24 * 60 * 60 * 1000,
      '30 days': 30 * 24 * 60 * 60 * 1000,
    };
    
    for (const [key, value] of Object.entries(timeframes)) {
      if (query.toLowerCase().includes(key)) {
        return value;
      }
    }
    
    return 7 * 24 * 60 * 60 * 1000; // Default to 1 week
  }

  private static extractTrackerDomain(query: string): string | undefined {
    // Look for domain patterns in the query
    const domainMatch = query.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
    if (domainMatch) {
      return domainMatch[0];
    }
    
    // Look for common tracker names
    const trackerNames: Record<string, string> = {
      'google analytics': 'google-analytics.com',
      'doubleclick': 'doubleclick.net',
      'facebook': 'facebook.com',
      'google tag manager': 'googletagmanager.com',
      'google adsense': 'googlesyndication.com',
    };
    
    const lowerQuery = query.toLowerCase();
    for (const [name, domain] of Object.entries(trackerNames)) {
      if (lowerQuery.includes(name)) {
        return domain;
      }
    }
    
    return undefined;
  }

  private static extractWebsiteUrl(query: string): string | undefined {
    // Look for URL patterns
    const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      return urlMatch[0];
    }
    
    // Look for domain patterns and assume https
    const domainMatch = query.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
    if (domainMatch) {
      return `https://${domainMatch[0]}`;
    }
    
    return undefined;
  }

  private static async getRecentEvents(timeframe: number): Promise<TrackingEvent[]> {
    const allEvents = await StorageManager.getRecentEvents(1000);
    const cutoff = Date.now() - timeframe;
    return allEvents.filter((event: TrackingEvent) => event.timestamp >= cutoff);
  }

  private static getAnalysisTitle(type: string): string {
    const titles: Record<string, string> = {
      pattern: 'Tracker Pattern Analysis',
      risk: 'Privacy Risk Assessment',
      tracker: 'Tracker Behavior Analysis',
      website: 'Website Privacy Audit',
      timeline: 'Tracking Timeline Analysis',
    };
    return titles[type] || 'Analysis Results';
  }

  private static getTrackerDisplayName(domain: string): string {
    const names: Record<string, string> = {
      'google-analytics.com': 'Google Analytics',
      'doubleclick.net': 'Google DoubleClick',
      'facebook.com': 'Facebook Pixel',
      'googletagmanager.com': 'Google Tag Manager',
      'googlesyndication.com': 'Google AdSense',
    };
    return names[domain] || domain;
  }
}
