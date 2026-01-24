import {
  TrackingAnalysis,
  type AnalysisResult,
  type PatternData,
  type TrackerPattern,
} from '../tracking-analysis';

/**
 * Specialized analyzer for tracking pattern analysis
 */
export class PatternAnalyzer {
  /**
   * Analyze tracking patterns over a given timeframe
   */
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzePatterns(timeframe);
  }

  /**
   * Format pattern analysis results into readable text
   */
  static formatResponse(result: AnalysisResult): string {
    let response = `# Tracker Pattern Analysis\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatPatternData(result.data as PatternData);

    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Format pattern data into readable sections
   */
  private static formatPatternData(data: PatternData): string {
    let output = `## Top Trackers (Last ${data.timeframeDays} Days)\n`;
    data.topTrackers
      .slice(0, 5)
      .forEach((tracker: TrackerPattern, i: number) => {
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
}
