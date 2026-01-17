import type { AIAnalysis, TrackingEvent } from './types';
import { DataSanitizer, RateLimiter, AICache, AIClient } from './ai';

/**
 * Main AI engine orchestrating all AI functionality
 */
export class AIEngine {
  /**
   * Analyze tracking events with AI
   */
  static async analyzeEvents(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    try {
      // Check rate limiting
      if (!(await RateLimiter.canMakeRequest())) {
        console.warn('AI request rate limited');
        return null;
      }

      // Sanitize events before processing
      const sanitizedEvents = DataSanitizer.sanitizeEvents(events);

      // Check cache first
      const cached = await AICache.getCached(sanitizedEvents);
      if (cached) {
        return cached;
      }

      // Make AI request
      await RateLimiter.recordRequest();
      const analysis = await AIClient.makeRequest(sanitizedEvents);

      // Cache the result
      await AICache.store(sanitizedEvents, analysis);

      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Quick analysis for single event
   */
  static async analyzeEvent(event: TrackingEvent): Promise<AIAnalysis | null> {
    return this.analyzeEvents([event]);
  }

  /**
   * Generate event analysis (compatibility method)
   */
  static async generateEventAnalysis(event: TrackingEvent): Promise<AIAnalysis | null> {
    return this.analyzeEvent(event);
  }

  /**
   * Generate narrative from events (compatibility method)
   */
  static async generateNarrative(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    return this.analyzeEvents(events);
  }

  /**
   * Chat query handler (compatibility method)
   */
  static async chatQuery(_query: string, events?: TrackingEvent[]): Promise<string> {
    try {
      // If no events provided, get recent events
      const eventsToAnalyze = events || [];
      
      const analysis = await this.analyzeEvents(eventsToAnalyze);
      if (analysis) {
        return `${analysis.narrative}\n\nRecommendations: ${analysis.recommendations.join(', ')}`;
      }
      return 'Unable to analyze tracking data at this time.';
    } catch (error) {
      console.error('Chat query failed:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  /**
   * Check if AI is available (has API key)
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get('phantom_trail_settings');
      const settings = result.phantom_trail_settings || {};
      return !!settings.openRouterApiKey;
    } catch {
      return false;
    }
  }
}
