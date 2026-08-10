import {
  TrackingAnalysis,
  type AnalysisResult,
  type RiskData,
} from '../tracking-analysis';
import type { TrackingEvent, PrivacyScore } from '../types';

/**
 * Formats the experimental score and recorded detector signals.
 */
export class RiskAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeRisk(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    let response = `# Experimental Signal-Risk Summary\n\n`;
    response += `> This output applies prototype labels to recorded detector events. It is not a website safety, security, or privacy assessment.\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatRiskData(result.data as RiskData);

    if (result.recommendations.length > 0) {
      response += `\n## Review Notes\n`;
      result.recommendations.forEach((recommendation: string, index: number) => {
        response += `${index + 1}. ${recommendation}\n`;
      });
    }

    return response;
  }

  private static formatRiskData(data: RiskData): string {
    let output = `## Experimental Heuristic: ${data.overallScore.score}/100 (${data.overallScore.grade})\n`;
    output += `**Stored trend label:** ${data.trend}\n\n`;

    if (data.riskySites.length > 0) {
      output += `## URL-Host Groups Below the Prototype Threshold\n`;
      data.riskySites.forEach(
        (
          site: { domain: string; score: PrivacyScore; events: number },
          index: number
        ) => {
          output += `${index + 1}. **${site.domain}** — heuristic ${site.score.score}/100 (${site.score.grade})\n`;
          output += `   - ${site.events} recorded detector signals\n`;
        }
      );
      output += `\nThese groups can contain attribution errors, repeated requests, and false positives.\n`;
    }

    if (data.criticalEvents.length > 0) {
      output += `\n## Signals Carrying the Critical Prototype Label\n`;
      const eventCounts = new Map<string, number>();
      data.criticalEvents.forEach((event: TrackingEvent) => {
        const key = event.inPageTracking?.method || event.trackerType;
        eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      });

      for (const [method, count] of eventCounts.entries()) {
        output += `- ${count} recorded ${method.replace(/-/g, ' ')} signal${
          count === 1 ? '' : 's'
        }\n`;
      }
    }

    return output;
  }
}
