import {
  TrackingAnalysis,
  type AnalysisResult,
  type TimelineData,
} from '../tracking-analysis';

/**
 * Specialized analyzer for tracking timeline and temporal patterns
 */
export class TimelineAnalyzer {
  /**
   * Analyze tracking activity over time
   */
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeTimeline(timeframe);
  }

  /**
   * Format timeline analysis results into readable text
   */
  static formatResponse(result: AnalysisResult): string {
    let response = `# Tracking Timeline Analysis\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatTimelineData(result.data as TimelineData);

    if (result.recommendations.length > 0) {
      response += `\n## Recommendations\n`;
      result.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Format timeline data into readable sections
   */
  private static formatTimelineData(data: TimelineData): string {
    let output = `## Tracking Volume\n`;
    output += `- **Total Events:** ${data.totalEvents}\n`;
    output += `- **Daily Average:** ${data.dailyAverage} events\n`;
    output += `- **Peak Day:** ${data.peakDay}\n`;
    output += `- **Lowest Day:** ${data.lowestDay}\n\n`;

    const peakHour = data.hourlyPatterns.reduce(
      (
        max: { hour: number; events: number },
        curr: { hour: number; events: number }
      ) => (curr.events > max.events ? curr : max)
    );
    output += `## Peak Activity\n`;
    output += `- **Peak Hour:** ${peakHour.hour}:00 (${peakHour.events} events)\n\n`;

    if (data.anomalies.length > 0) {
      output += `## Anomalies Detected\n`;
      data.anomalies.forEach(
        (
          anomaly: { timestamp: number; description: string; cause?: string },
          i: number
        ) => {
          const date = new Date(anomaly.timestamp).toLocaleDateString();
          output += `${i + 1}. **${date}** - ${anomaly.description}\n`;
          if (anomaly.cause) {
            output += `   - Likely cause: ${anomaly.cause}\n`;
          }
        }
      );
    }

    return output;
  }
}
