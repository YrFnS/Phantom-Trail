import {
  PatternAnalyzer,
  RiskAnalyzer,
  TrackerAnalyzer,
  WebsiteAnalyzer,
  TimelineAnalyzer,
} from './analyzers';
import { aiEngine } from './ai-engine';
import type { TrackingEvent } from './types';
import { EventsStorage } from './storage/events-storage';

export interface AnalysisQuery {
  type: 'pattern' | 'risk' | 'tracker' | 'website' | 'timeline' | 'chat';
  query: string;
  parameters?: {
    timeframe?: number;
    trackerDomain?: string;
    websiteUrl?: string;
  };
}

/**
 * Routes a limited set of English phrases to local recorded-signal summaries.
 * Unmatched text can request an optional OpenRouter event summary when the user
 * explicitly enabled that feature.
 */
export class AIAnalysisPrompts {
  static async processQuery(query: string): Promise<string> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return this.getSupportedQueriesMessage();
    }

    const analysisQuery = this.parseQuery(trimmedQuery);

    try {
      switch (analysisQuery.type) {
        case 'pattern': {
          const result = await PatternAnalyzer.analyze(
            analysisQuery.parameters?.timeframe
          );
          return PatternAnalyzer.formatResponse(result);
        }
        case 'risk': {
          const result = await RiskAnalyzer.analyze(
            analysisQuery.parameters?.timeframe
          );
          return RiskAnalyzer.formatResponse(result);
        }
        case 'tracker': {
          const domain = analysisQuery.parameters?.trackerDomain;
          if (!domain) return this.getSupportedQueriesMessage();
          return TrackerAnalyzer.formatResponse(
            await TrackerAnalyzer.analyze(domain)
          );
        }
        case 'website': {
          const websiteUrl = analysisQuery.parameters?.websiteUrl;
          if (!websiteUrl) return this.getSupportedQueriesMessage();
          return WebsiteAnalyzer.formatResponse(
            await WebsiteAnalyzer.analyze(websiteUrl)
          );
        }
        case 'timeline': {
          const result = await TimelineAnalyzer.analyze(
            analysisQuery.parameters?.timeframe
          );
          return TimelineAnalyzer.formatResponse(result);
        }
        case 'chat':
          return await this.handleChatQuery(trimmedQuery);
      }
    } catch (error) {
      console.error('Recorded-signal query failed:', error);
      return 'The prototype could not generate this recorded-signal summary. No conclusion was produced.';
    }
  }

  private static parseQuery(query: string): AnalysisQuery {
    const lowerQuery = query.toLowerCase();

    if (
      this.matchesPatterns(lowerQuery, [
        'tracking patterns',
        'signal patterns',
        'top trackers',
        'top domains',
        'most common trackers',
        'cross-site tracking',
        'tracker frequency',
        'analyze patterns',
      ])
    ) {
      return {
        type: 'pattern',
        query,
        parameters: { timeframe: this.extractTimeframe(query) },
      };
    }

    if (
      this.matchesPatterns(lowerQuery, [
        'privacy risk',
        'privacy score',
        'heuristic score',
        'how private',
        'risk assessment',
        'privacy rating',
        'overall risk',
        'privacy trend',
      ])
    ) {
      return {
        type: 'risk',
        query,
        parameters: { timeframe: this.extractTimeframe(query) },
      };
    }

    const trackerDomain = TrackerAnalyzer.extractTrackerDomain(query);
    if (
      trackerDomain ||
      this.matchesPatterns(lowerQuery, [
        'analyze tracker',
        'tracker behavior',
        'domain profile',
        'what does',
        'who owns',
      ])
    ) {
      return {
        type: 'tracker',
        query,
        parameters: { trackerDomain },
      };
    }

    const websiteUrl = WebsiteAnalyzer.extractWebsiteUrl(query);
    if (
      websiteUrl ||
      this.matchesPatterns(lowerQuery, [
        'audit website',
        'website privacy',
        'site privacy',
        'website signals',
        'how private is',
      ])
    ) {
      return {
        type: 'website',
        query,
        parameters: { websiteUrl },
      };
    }

    if (
      this.matchesPatterns(lowerQuery, [
        'timeline',
        'when am i tracked',
        'tracking over time',
        'tracking history',
        'signal history',
        'peak tracking',
        'tracking trends',
        'anomalies',
      ])
    ) {
      return {
        type: 'timeline',
        query,
        parameters: { timeframe: this.extractTimeframe(query) },
      };
    }

    return { type: 'chat', query };
  }

  private static async handleChatQuery(query: string): Promise<string> {
    const recentEvents = await this.getRecentEvents(24 * 60 * 60 * 1000);
    return await aiEngine.chatQuery(query, recentEvents);
  }

  private static matchesPatterns(query: string, patterns: string[]): boolean {
    return patterns.some(pattern => query.includes(pattern));
  }

  private static extractTimeframe(query: string): number {
    const timeframes: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      yesterday: 2 * 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      '24 hours': 24 * 60 * 60 * 1000,
      '7 days': 7 * 24 * 60 * 60 * 1000,
      '30 days': 30 * 24 * 60 * 60 * 1000,
    };

    const lowerQuery = query.toLowerCase();
    for (const [key, value] of Object.entries(timeframes)) {
      if (lowerQuery.includes(key)) return value;
    }

    return 7 * 24 * 60 * 60 * 1000;
  }

  private static async getRecentEvents(
    timeframe: number
  ): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(1000);
    const cutoff = Date.now() - timeframe;
    return allEvents.filter(event => event.timestamp >= cutoff);
  }

  private static getSupportedQueriesMessage(): string {
    return `Phantom Trail 0.1.0 supports a limited set of English recorded-signal summaries:\n\n- "Analyze signal patterns this week"\n- "Show my heuristic score"\n- "Show the signal timeline"\n- "Summarize signals for example.com"\n- "Show the domain profile for google-analytics.com"\n\nThese outputs summarize stored heuristic events. They are not live audits or verified privacy conclusions. Unmatched questions require the optional OpenRouter event-summary feature, which must be explicitly enabled.`;
  }
}
