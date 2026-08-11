import {
  PatternAnalyzer,
  RiskAnalyzer,
  TrackerAnalyzer,
  WebsiteAnalyzer,
  TimelineAnalyzer,
} from './analyzers';
import { aiEngine } from './ai-engine';
import { routeEvidenceQuery } from './evidence-query-router.mts';
import type { TrackingEvent } from './types';
import { EventsStorage } from './storage/events-storage';

/**
 * Deterministic local Evidence Explorer plus a separate, explicit optional
 * OpenRouter aggregate-summary action.
 */
export class AIAnalysisPrompts {
  static async processQuery(query: string): Promise<string> {
    const route = routeEvidenceQuery(query);

    try {
      switch (route.type) {
        case 'pattern':
          return PatternAnalyzer.formatResponse(
            await PatternAnalyzer.analyze(route.timeframe)
          );
        case 'risk':
          return RiskAnalyzer.formatResponse(
            await RiskAnalyzer.analyze(route.timeframe)
          );
        case 'tracker':
          return route.domain
            ? TrackerAnalyzer.formatResponse(
                await TrackerAnalyzer.analyze(route.domain)
              )
            : this.getSupportedQueriesMessage();
        case 'website':
          return route.domain
            ? WebsiteAnalyzer.formatResponse(
                await WebsiteAnalyzer.analyze(`https://${route.domain}`)
              )
            : this.getSupportedQueriesMessage();
        case 'timeline':
          return TimelineAnalyzer.formatResponse(
            await TimelineAnalyzer.analyze(route.timeframe)
          );
        case 'unsupported':
        default:
          return this.getSupportedQueriesMessage();
      }
    } catch (error) {
      console.error('Recorded-evidence query failed:', error);
      return 'The local Evidence Explorer could not generate this summary. No external request was made and no conclusion was produced.';
    }
  }

  static async generateOptionalAggregateSummary(
    timeframe = 24 * 60 * 60 * 1000
  ): Promise<string> {
    const recentEvents = await this.getRecentEvents(timeframe);
    return aiEngine.generateAggregateSummary(recentEvents);
  }

  static getSupportedQueriesMessage(): string {
    return `Evidence Explorer supports these local query forms:\n\n- “Analyze signal patterns this week”\n- “Show the evidence index”\n- “Show the signal timeline”\n- “Show signals for example.com”\n- “Show the domain profile for google-analytics.com”\n\nUnsupported text does not trigger OpenRouter. The separate optional aggregate-summary button sends only the field set disclosed in Settings when that feature is explicitly enabled.`;
  }

  private static async getRecentEvents(
    timeframe: number
  ): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(1000);
    const cutoff = Date.now() - timeframe;
    return allEvents.filter(
      event => (event.lastSeenAt || event.timestamp) >= cutoff
    );
  }
}
