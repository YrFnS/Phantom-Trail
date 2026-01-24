import {
  PatternAnalyzer,
  RiskAnalyzer,
  TrackerAnalyzer,
  WebsiteAnalyzer,
  TimelineAnalyzer,
} from './analyzers';
import { AIEngine } from './ai-engine';
import { PrivacyCoach } from './ai-coaching';
import { PrivacyInsights } from './privacy-insights';
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
 * AI-powered analysis prompt handler
 */
export class AIAnalysisPrompts {
  /**
   * Process natural language analysis queries
   */
  static async processQuery(query: string): Promise<string> {
    const analysisQuery = this.parseQuery(query);

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
          if (analysisQuery.parameters?.trackerDomain) {
            const result = await TrackerAnalyzer.analyze(
              analysisQuery.parameters.trackerDomain
            );
            return TrackerAnalyzer.formatResponse(result);
          }
          break;
        }

        case 'website': {
          if (analysisQuery.parameters?.websiteUrl) {
            const result = await WebsiteAnalyzer.analyze(
              analysisQuery.parameters.websiteUrl
            );
            return WebsiteAnalyzer.formatResponse(result);
          }
          break;
        }

        case 'timeline': {
          const result = await TimelineAnalyzer.analyze(
            analysisQuery.parameters?.timeframe
          );
          return TimelineAnalyzer.formatResponse(result);
        }

        case 'chat':
          return await this.handleChatQuery(query);
      }

      return "I couldn't analyze that request. Please try asking about tracking patterns, privacy risks, specific trackers, or website audits.";
    } catch (error) {
      console.error('Analysis query failed:', error);
      return 'Sorry, I encountered an error while analyzing your request. Please try again.';
    }
  }

  /**
   * Parse natural language query into structured analysis request
   */
  private static parseQuery(query: string): AnalysisQuery {
    const lowerQuery = query.toLowerCase();

    // Pattern analysis queries
    if (
      this.matchesPatterns(lowerQuery, [
        'tracking patterns',
        'top trackers',
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

    // Risk assessment queries
    if (
      this.matchesPatterns(lowerQuery, [
        'privacy risk',
        'privacy score',
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

    // Specific tracker queries
    const trackerDomain = TrackerAnalyzer.extractTrackerDomain(query);
    if (
      trackerDomain ||
      this.matchesPatterns(lowerQuery, [
        'analyze tracker',
        'tracker behavior',
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

    // Website audit queries
    const websiteUrl = WebsiteAnalyzer.extractWebsiteUrl(query);
    if (
      websiteUrl ||
      this.matchesPatterns(lowerQuery, [
        'audit website',
        'website privacy',
        'site privacy',
        'how private is',
      ])
    ) {
      return {
        type: 'website',
        query,
        parameters: { websiteUrl },
      };
    }

    // Timeline analysis queries
    if (
      this.matchesPatterns(lowerQuery, [
        'timeline',
        'when am i tracked',
        'tracking over time',
        'tracking history',
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

    // Default to chat for everything else
    return { type: 'chat', query };
  }

  /**
   * Handle general chat queries with AI and personalized coaching context
   */
  private static async handleChatQuery(query: string): Promise<string> {
    // Get recent tracking events for context
    const recentEvents = await this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours

    // Get personalized insights for coaching context
    let personalizedPrompt = query;
    try {
      const insights = await PrivacyInsights.getStoredInsights();
      if (insights && this.isCoachingQuery(query)) {
        personalizedPrompt = PrivacyCoach.createPersonalizedPrompt(
          query,
          insights
        );
      }
    } catch (error) {
      console.warn('Failed to load personalized context:', error);
    }

    // Use AI engine for natural language response
    const response = await AIEngine.chatQuery(personalizedPrompt, recentEvents);
    return response;
  }

  /**
   * Check if query is coaching-related and should use personalized context
   */
  private static isCoachingQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const coachingKeywords = [
      'improve',
      'better',
      'help',
      'advice',
      'recommend',
      'suggest',
      'goal',
      'progress',
      'achievement',
      'privacy score',
      'how can i',
      'what should i',
      'tips',
      'guidance',
      'coach',
      'personal',
    ];

    return coachingKeywords.some(keyword => lowerQuery.includes(keyword));
  }



  // Helper methods
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

    for (const [key, value] of Object.entries(timeframes)) {
      if (query.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 7 * 24 * 60 * 60 * 1000; // Default to 1 week
  }



  private static async getRecentEvents(
    timeframe: number
  ): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(1000);
    const cutoff = Date.now() - timeframe;
    return allEvents.filter(
      (event: TrackingEvent) => event.timestamp >= cutoff
    );
  }


}
