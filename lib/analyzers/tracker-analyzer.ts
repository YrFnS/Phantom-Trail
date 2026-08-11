import {
  TrackingAnalysis,
  type AnalysisResult,
  type TrackerData,
} from '../tracking-analysis';

/**
 * Formats stored signals associated with an event-domain label.
 */
export class TrackerAnalyzer {
  static async analyze(trackerDomain: string): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeTracker(trackerDomain);
  }

  static formatResponse(result: AnalysisResult): string {
    let response = `# Event-Domain Signal Profile\n\n`;
    response += `> This profile summarizes stored labels. It does not verify ownership, tracking behavior, data collection, or prevalence.\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatTrackerData(result.data as TrackerData | null);

    if (result.recommendations.length > 0) {
      response += `\n## Review Notes\n`;
      result.recommendations.forEach((recommendation: string, index: number) => {
        response += `${index + 1}. ${recommendation}\n`;
      });
    }

    return response;
  }

  private static formatTrackerData(data: TrackerData | null): string {
    if (!data) {
      return 'No stored detector signals were available for this domain label.\n';
    }

    let output = `## Catalog and Event Labels\n`;
    output += `- **Catalog owner label:** ${data.owner}\n`;
    output += `- **Prototype category:** ${data.type}\n`;
    output += `- **Prototype severity:** ${data.riskLevel}\n`;
    output += `- **Stored association summary:** ${data.prevalence}\n`;
    output += `- **Recorded occurrences:** ${data.occurrences}\n\n`;

    output += `## In-Page Instrumentation Labels\n`;
    if (data.trackingMethods.length > 0) {
      data.trackingMethods.forEach(method => {
        output += `- ${method.replace(/-/g, ' ')} signal\n`;
      });
    } else {
      output += '- No in-page instrumentation method is attached to these stored events.\n';
    }

    if (data.sites.length > 0) {
      output += `\n## Associated URL-Host Labels\n`;
      data.sites.forEach(site => {
        output += `- ${site}\n`;
      });
      output += `\nThese associations can reflect page/resource attribution errors and do not prove cross-site tracking.\n`;
    }

    return output;
  }

  static extractTrackerDomain(query: string): string | undefined {
    const domainMatch = query.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
    if (domainMatch) return domainMatch[0];

    const trackerNames: Record<string, string> = {
      'google analytics': 'google-analytics.com',
      doubleclick: 'doubleclick.net',
      facebook: 'facebook.com',
      'google tag manager': 'googletagmanager.com',
      'google adsense': 'googlesyndication.com',
    };

    const lowerQuery = query.toLowerCase();
    for (const [name, domain] of Object.entries(trackerNames)) {
      if (lowerQuery.includes(name)) return domain;
    }

    return undefined;
  }
}
