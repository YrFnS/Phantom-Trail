import {
  TrackingAnalysis,
  type AnalysisResult,
  type WebsiteData,
} from '../tracking-analysis';
import type { TrackingEvent } from '../types';

/**
 * Formats recorded detector signals associated with a supplied URL-host label.
 * The historical analyzer API name is retained for compatibility.
 */
export class WebsiteAnalyzer {
  static async analyze(websiteUrl: string): Promise<AnalysisResult> {
    return await TrackingAnalysis.auditWebsite(websiteUrl);
  }

  static formatResponse(result: AnalysisResult): string {
    let response = `# Recorded Website-Signal Summary\n\n`;
    response += `> This is a summary of stored heuristic events, not a live website audit, safety verdict, or verified account of data sharing.\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatWebsiteData(result.data as WebsiteData | null);

    if (result.recommendations.length > 0) {
      response += `\n## Review Notes\n`;
      result.recommendations.forEach((recommendation: string, index: number) => {
        response += `${index + 1}. ${recommendation}\n`;
      });
    }

    return response;
  }

  private static formatWebsiteData(data: WebsiteData | null): string {
    if (!data) {
      return 'No stored detector signals were available for this URL-host label. No privacy conclusion can be drawn.\n';
    }

    let output = `## Experimental Heuristic: ${data.privacyScore.score}/100 (${data.privacyScore.grade})\n\n`;
    output += `## Recorded Event-Domain Labels (${data.uniqueTrackers.length})\n`;

    const labels = ['critical', 'high', 'medium', 'low'] as const;
    labels.forEach(label => {
      const events = data.trackersByRisk[label];
      if (events.length === 0) return;

      output += `### ${label.charAt(0).toUpperCase() + label.slice(1)} Prototype Label (${events.length} signals)\n`;
      const uniqueDomains = Array.from(
        new Set(events.map((event: TrackingEvent) => event.domain))
      );
      uniqueDomains.slice(0, 5).forEach(domain => {
        output += `- ${this.getCatalogDisplayName(domain)}\n`;
      });
    });

    output += `\n## Attribution-Limited Counts\n`;
    output += `- **Event-domain labels differing from the page host:** ${data.thirdPartyPercentage}%\n`;
    output += `- **Total recorded detector signals:** ${data.totalEvents}\n`;
    output += `\nThe different-domain percentage uses a simple hostname comparison and does not prove third-party tracking, ownership, or data transfer.\n`;

    return output;
  }

  static extractWebsiteUrl(query: string): string | undefined {
    const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) return urlMatch[0];

    const domainMatch = query.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
    return domainMatch ? `https://${domainMatch[0]}` : undefined;
  }

  private static getCatalogDisplayName(domain: string): string {
    const names: Record<string, string> = {
      'google-analytics.com': 'Google Analytics catalog label',
      'doubleclick.net': 'Google DoubleClick catalog label',
      'facebook.com': 'Facebook catalog label',
      'googletagmanager.com': 'Google Tag Manager catalog label',
      'googlesyndication.com': 'Google AdSense catalog label',
    };
    return names[domain] || domain;
  }
}
