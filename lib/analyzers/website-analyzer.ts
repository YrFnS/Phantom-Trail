import {
  TrackingAnalysis,
  type AnalysisResult,
  type WebsiteData,
} from '../tracking-analysis';
import type { TrackingEvent } from '../types';

/**
 * Specialized analyzer for website privacy audits
 */
export class WebsiteAnalyzer {
  /**
   * Audit a specific website's privacy practices
   */
  static async analyze(websiteUrl: string): Promise<AnalysisResult> {
    return await TrackingAnalysis.auditWebsite(websiteUrl);
  }

  /**
   * Format website analysis results into readable text
   */
  static formatResponse(result: AnalysisResult): string {
    let response = `# Website Privacy Audit\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatWebsiteData(result.data as WebsiteData | null);

    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Format website data into readable sections
   */
  private static formatWebsiteData(data: WebsiteData | null): string {
    if (!data) return 'No data available for this website.';

    let output = `## Privacy Score: ${data.privacyScore.score}/100 (${data.privacyScore.grade})\n\n`;

    output += `## Trackers Detected (${data.uniqueTrackers.length} total)\n`;

    ['critical', 'high', 'medium', 'low'].forEach(risk => {
      const trackers = data.trackersByRisk[risk];
      if (trackers.length > 0) {
        output += `### ${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk (${trackers.length})\n`;
        const uniqueDomains = [
          ...new Set(trackers.map((t: TrackingEvent) => t.domain)),
        ] as string[];
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

  /**
   * Extract website URL from natural language query
   */
  static extractWebsiteUrl(query: string): string | undefined {
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

  /**
   * Get display name for common trackers
   */
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
