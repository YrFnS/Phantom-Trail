import type { AIAnalysis, TrackingEvent } from './types';
import { DataSanitizer, RateLimiter, AICache, AIClient, type APIError } from './ai';
import { ErrorRecovery, type ErrorContext } from './error-recovery';
import { CircuitBreaker } from './circuit-breaker';
import { OfflineMode } from './offline-mode';

/**
 * Main AI engine orchestrating all AI functionality with enhanced error handling
 */
export class AIEngine {
  private static circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    halfOpenMaxCalls: 2
  });

  private static offlineMode = OfflineMode.getInstance();

  /**
   * Analyze tracking events with AI and proper error handling
   */
  static async analyzeEvents(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    const context: ErrorContext = {
      operation: 'analyzeEvents',
      timestamp: Date.now(),
      systemState: { eventsCount: events.length },
      retryCount: 0
    };

    try {
      // Check if AI is available
      if (!(await this.isAvailable())) {
        console.warn('AI not available - no API key configured');
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Check rate limiting with detailed status
      const rateLimitStatus = await RateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const waitTime = rateLimitStatus.retryAfter || (rateLimitStatus.resetTime - Date.now());
        console.warn(`AI request rate limited. Wait ${Math.ceil(waitTime / 1000)}s`);
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Sanitize events before processing
      const sanitizedEvents = DataSanitizer.sanitizeEvents(events);

      // Check cache first
      const cached = await AICache.getCached(sanitizedEvents);
      if (cached) {
        return cached;
      }

      // Make AI request with circuit breaker protection
      const analysis = await this.circuitBreaker.execute(async () => {
        return await AIClient.makeRequest(sanitizedEvents);
      });

      // Cache the result
      await AICache.store(sanitizedEvents, analysis);
      
      // Cache for offline mode
      await this.offlineMode.cacheAnalysis(sanitizedEvents, analysis);

      return analysis;
    } catch (error) {
      const apiError = error as APIError;
      
      if (apiError.isRateLimit) {
        console.warn('AI request rate limited by API');
        await RateLimiter.recordRateLimit();
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Handle error with recovery system
      const recoveryResult = await ErrorRecovery.handleAPIError(apiError, context);
      
      if (recoveryResult.success) {
        // Retry the operation if recovery was successful
        context.retryCount++;
        if (context.retryCount < 3) {
          return await this.analyzeEvents(events);
        }
      }

      // Fall back to offline mode
      console.warn('AI analysis failed, using offline mode:', error);
      return await this.offlineMode.handleAPIFailure(events);
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
   * Chat query handler with rate limit awareness
   */
  static async chatQuery(_query: string, events?: TrackingEvent[]): Promise<string> {
    try {
      // Check rate limiting first
      const rateLimitStatus = await RateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const waitTime = rateLimitStatus.retryAfter || (rateLimitStatus.resetTime - Date.now());
        const waitSeconds = Math.ceil(waitTime / 1000);
        return `I'm currently rate limited. Please wait ${waitSeconds} seconds before asking again.`;
      }

      // If no events provided, get recent events
      const eventsToAnalyze = events || [];
      
      const analysis = await this.analyzeEvents(eventsToAnalyze);
      if (analysis) {
        return `${analysis.narrative}\n\nRecommendations: ${analysis.recommendations.join(', ')}`;
      }
      return 'Unable to analyze tracking data at this time. This might be due to rate limiting or API issues.';
    } catch (error) {
      const apiError = error as APIError;
      
      if (apiError.isRateLimit) {
        const waitTime = apiError.retryAfter || 60000; // Default 1 minute
        const waitSeconds = Math.ceil(waitTime / 1000);
        return `I'm currently rate limited. Please wait ${waitSeconds} seconds before asking again.`;
      }

      console.error('Chat query failed:', error);
      return 'Sorry, I encountered an error processing your request. Please try again later.';
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

  /**
   * Get current rate limit status for UI display
   */
  static async getRateLimitStatus() {
    return RateLimiter.getStatus();
  }

  /**
   * Wait for rate limit to reset (for UI components)
   */
  static async waitForRateLimit(onProgress?: (timeRemaining: number) => void): Promise<void> {
    return RateLimiter.waitForReset(onProgress);
  }

  /**
   * Reset rate limiting (for debugging)
   */
  static async resetRateLimit(): Promise<void> {
    return RateLimiter.resetRateLimit();
  }

  /**
   * Get debug information about rate limiting
   */
  static async getDebugInfo() {
    return RateLimiter.getDebugInfo();
  }
}
