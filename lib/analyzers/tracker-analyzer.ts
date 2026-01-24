import {
  TrackingAnalysis,
  type AnalysisResult,
  type TrackerData,
} from '../tracking-analysis';

/**
 * Specialized analyzer for individual tracker behavior
 */
export class TrackerAnalyzer {
  /**
   * Analyze a specific tracker's behavior
   */
  static async analyze(trackerDomain: string): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeTracker(trackerDomain);
  }

  /**
   * Format tracker analysis results into readable text
   */
  static formatResponse(result: AnalysisResult): string {
    let response = `# Tracker Behavior Analysis\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatTrackerData(result.data as TrackerData | null);

    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Format tracker data into readable sections
   */
  private static formatTrackerData(data: TrackerData | null): string {
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

  /**
   * Extract tracker domain from natural language query
   */
  static extractTrackerDomain(query: string): string | undefined {
    // Look for domain patterns in the query
    const domainMatch = query.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
    if (domainMatch) {
      return domainMatch[0];
    }

    // Look for common tracker names
    const trackerNames: Record<string, string> = {
      'google analytics': 'google-analytics.com',
      doubleclick: 'doubleclick.net',
      facebook: 'facebook.com',
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
}
