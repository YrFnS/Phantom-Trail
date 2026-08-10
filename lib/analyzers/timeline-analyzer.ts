import {
  TrackingAnalysis,
  type AnalysisResult,
  type TimelineData,
} from '../tracking-analysis';

/**
 * Formats counts from stored detector events over time.
 */
export class TimelineAnalyzer {
  static async analyze(timeframe?: number): Promise<AnalysisResult> {
    return await TrackingAnalysis.analyzeTimeline(timeframe);
  }

  static formatResponse(result: AnalysisResult): string {
    let response = `# Recorded Signal Timeline\n\n`;
    response += `> Counts reflect stored detector events. They do not measure total browsing, confirmed tracking, or user behavior.\n\n`;
    response += `${result.summary}\n\n`;
    response += this.formatTimelineData(result.data as TimelineData);

    if (result.recommendations.length > 0) {
      response += `\n## Review Notes\n`;
      result.recommendations.forEach((recommendation: string, index: number) => {
        response += `${index + 1}. ${recommendation}\n`;
      });
    }

    return response;
  }

  private static formatTimelineData(data: TimelineData): string {
    let output = `## Stored Signal Counts\n`;
    output += `- **Total recorded signals:** ${data.totalEvents}\n`;
    output += `- **Average per represented day:** ${data.dailyAverage}\n`;
    output += `- **Highest-count day:** ${data.peakDay}\n`;
    output += `- **Lowest-count day:** ${data.lowestDay}\n\n`;

    const peakHour = data.hourlyPatterns.reduce(
      (current, entry) =>
        entry.events > current.events ? entry : current,
      { hour: 0, events: 0 }
    );
    output += `## Largest Hourly Bucket\n`;
    output += `- **Hour:** ${peakHour.hour}:00 (${peakHour.events} stored signals)\n\n`;

    if (data.anomalies.length > 0) {
      output += `## Simple Count-Threshold Matches\n`;
      data.anomalies.forEach((deviation, index) => {
        const date = new Date(deviation.timestamp).toLocaleDateString();
        output += `${index + 1}. **${date}** — ${deviation.description}\n`;
      });
      output += `\nThese threshold matches are not verified incidents or behavioral anomalies.\n`;
    }

    return output;
  }
}
