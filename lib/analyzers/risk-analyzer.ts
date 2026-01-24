import {
  TrackingAnalysis,
  type AnalysisResult,
  type RiskData,
} from '../tracking-analysis';
import type { TrackingEvent, PrivacyScore } from '../types';

/**
 * Specialized analyzer for privacy risk assessment
 */
export class RiskAnalyzer {
  /**
   * Analyze privacy risks over a given timeframe
   */
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeRisk(timeframe);
  }

  /**
   * Format risk analysis results into readable text
   */
  static formatResponse(result: AnalysisResult): string {
    let response = `# Privacy Risk Assessment\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatRiskData(result.data as RiskData);

    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Format risk data into readable sections
   */
  private static formatRiskData(data: RiskData): string {
    let output = `## Overall Privacy Score: ${data.overallScore.score}/100 (${data.overallScore.grade})\n`;
    output += `**Trend:** ${data.trend}\n\n`;

    if (data.riskySites.length > 0) {
      output += `## High-Risk Websites\n`;
      data.riskySites.forEach(
        (
          site: { domain: string; score: PrivacyScore; events: number },
          i: number
        ) => {
          output += `${i + 1}. **${site.domain}** - Score: ${site.score.score}/100 (${site.score.grade})\n`;
          output += `   - ${site.events} tracking events\n`;
        }
      );
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
}
