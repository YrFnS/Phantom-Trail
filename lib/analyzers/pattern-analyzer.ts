import {
  TrackingAnalysis,
  type AnalysisResult,
  type PatternData,
  type TrackerPattern,
} from '../tracking-analysis';

/**
 * Formats frequency groupings from stored detector signals.
 */
export class PatternAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzePatterns(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    let response = `# Recorded Signal-Pattern Summary\n\n`;
    response += `> These groups are derived from stored event labels. They do not prove tracker identity, cross-site behavior, or data transfer.\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatPatternData(result.data as PatternData);

    if (result.recommendations.length > 0) {
      response += `\n## Review Notes\n`;
      result.recommendations.forEach((recommendation: string, index: number) => {
        response += `${index + 1}. ${recommendation}\n`;
      });
    }

    return response;
  }

  private static formatPatternData(data: PatternData): string {
    let output = `## Most Frequent Domain Labels (Last ${data.timeframeDays} Days)\n`;

    if (data.topTrackers.length === 0) {
      output += '- No detector signals were recorded in this window.\n';
    } else {
      data.topTrackers
        .slice(0, 5)
        .forEach((pattern: TrackerPattern, index: number) => {
          output += `${index + 1}. **${pattern.name}** — ${pattern.occurrences} recorded occurrence${
            pattern.occurrences === 1 ? '' : 's'
          } (${pattern.riskLevel} prototype label)\n`;
        });
    }

    if (data.crossSiteTrackers.length > 0) {
      output += `\n## Domain Groups Associated with Multiple URL Hosts\n`;
      data.crossSiteTrackers
        .slice(0, 3)
        .forEach((pattern: TrackerPattern) => {
          output += `- **${pattern.name}** is associated with ${pattern.crossSiteCount} URL-host labels in stored events\n`;
        });
      output += `\nThe current event model can misattribute page and resource domains, so these are not confirmed cross-site trackers.\n`;
    }

    output += `\n## Prototype Severity-Label Distribution\n`;
    output += `- Low label: ${data.riskDistribution.low}%\n`;
    output += `- Medium label: ${data.riskDistribution.medium}%\n`;
    output += `- High label: ${data.riskDistribution.high}%\n`;
    output += `- Critical label: ${data.riskDistribution.critical}%\n`;

    return output;
  }
}
