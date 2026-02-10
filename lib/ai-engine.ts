import type { AIAnalysis, TrackingEvent } from './types';
import {
  DataSanitizer,
  RateLimiter,
  AICache,
  AIClient,
  type APIError,
} from './ai';
import { ErrorRecovery, type ErrorContext } from './error-recovery';
import { CircuitBreaker } from './circuit-breaker';
import { OfflineMode } from './offline-mode';
import { SettingsStorage } from './storage/settings-storage';
import { TIMEOUTS, LIMITS } from './constants';

/**
 * Dependencies that can be injected for testing
 */
export interface AIEngineDeps {
  circuitBreaker?: CircuitBreaker;
  offlineMode?: OfflineMode;
  settingsStorage?: typeof SettingsStorage;
  rateLimiter?: typeof RateLimiter;
  aiClient?: typeof AIClient;
  aiCache?: typeof AICache;
  dataSanitizer?: typeof DataSanitizer;
  errorRecovery?: typeof ErrorRecovery;
}

/**
 * Main AI engine orchestrating all AI functionality with enhanced error handling.
 * Now uses instance-based pattern with dependency injection for testability.
 */
export class AIEngine {
  private circuitBreaker: CircuitBreaker;
  private offlineMode: OfflineMode;
  private settingsStorage: typeof SettingsStorage;
  private rateLimiter: typeof RateLimiter;
  private aiClient: typeof AIClient;
  private aiCache: typeof AICache;
  private dataSanitizer: typeof DataSanitizer;
  private errorRecovery: typeof ErrorRecovery;

  constructor(deps: AIEngineDeps = {}) {
    this.circuitBreaker =
      deps.circuitBreaker ??
      new CircuitBreaker({
        failureThreshold: LIMITS.FAILURE_THRESHOLD,
        recoveryTimeout: TIMEOUTS.RECOVERY,
        halfOpenMaxCalls: LIMITS.HALF_OPEN_MAX_CALLS,
      });
    this.offlineMode = deps.offlineMode ?? OfflineMode.getInstance();
    this.settingsStorage = deps.settingsStorage ?? SettingsStorage;
    this.rateLimiter = deps.rateLimiter ?? RateLimiter;
    this.aiClient = deps.aiClient ?? AIClient;
    this.aiCache = deps.aiCache ?? AICache;
    this.dataSanitizer = deps.dataSanitizer ?? DataSanitizer;
    this.errorRecovery = deps.errorRecovery ?? ErrorRecovery;
  }

  /**
   * Analyze tracking events with AI and proper error handling
   */
  async analyzeEvents(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    const context: ErrorContext = {
      operation: 'analyzeEvents',
      timestamp: Date.now(),
      systemState: { eventsCount: events.length },
      retryCount: 0,
    };

    try {
      // Check if AI is available
      if (!(await this.isAvailable())) {
        console.warn('AI not available - no API key configured');
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Check rate limiting with detailed status
      const rateLimitStatus = await this.rateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const waitTime =
          rateLimitStatus.retryAfter || rateLimitStatus.resetTime - Date.now();
        console.warn(
          `AI request rate limited. Wait ${Math.ceil(waitTime / 1000)}s`
        );
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Sanitize events before processing
      const sanitizedEvents = this.dataSanitizer.sanitizeEvents(events);

      // Check cache first
      const cached = await this.aiCache.getCached(sanitizedEvents);
      if (cached) {
        return cached;
      }

      // Make AI request with circuit breaker protection
      const analysis = await this.circuitBreaker.execute(async () => {
        return await this.aiClient.makeRequest(sanitizedEvents);
      });

      // Cache the result
      await this.aiCache.store(sanitizedEvents, analysis);

      // Cache for offline mode
      await this.offlineMode.cacheAnalysis(sanitizedEvents, analysis);

      return analysis;
    } catch (error) {
      const apiError = error as APIError;

      if (apiError.isRateLimit) {
        console.warn('AI request rate limited by API');
        await this.rateLimiter.recordRateLimit();
        return await this.offlineMode.handleAPIFailure(events);
      }

      // Handle error with recovery system
      const recoveryResult = await this.errorRecovery.handleAPIError(
        apiError,
        context
      );

      if (recoveryResult.success) {
        // Retry the operation if recovery was successful
        context.retryCount++;
        if (context.retryCount < LIMITS.MAX_RETRIES) {
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
  async analyzeEvent(event: TrackingEvent): Promise<AIAnalysis | null> {
    return this.analyzeEvents([event]);
  }

  /**
   * Generate event analysis (compatibility method)
   */
  async generateEventAnalysis(
    event: TrackingEvent
  ): Promise<AIAnalysis | null> {
    return this.analyzeEvent(event);
  }

  /**
   * Generate narrative from events (compatibility method)
   */
  async generateNarrative(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    return this.analyzeEvents(events);
  }

  /**
   * Chat query handler with rate limit awareness
   */
  async chatQuery(_query: string, events?: TrackingEvent[]): Promise<string> {
    try {
      // Check rate limiting first
      const rateLimitStatus = await this.rateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const waitTime =
          rateLimitStatus.retryAfter || rateLimitStatus.resetTime - Date.now();
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
        const waitTime =
          apiError.retryAfter || TIMEOUTS.RATE_LIMIT_WINDOW; // Default 1 minute
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
  async isAvailable(): Promise<boolean> {
    try {
      const settings = await this.settingsStorage.getSettings();
      const hasKey = !!settings.openRouterApiKey;
      console.log('[AIEngine] isAvailable check:', {
        hasKey,
        keyLength: settings.openRouterApiKey?.length || 0,
      });
      return hasKey;
    } catch (error) {
      console.error('[AIEngine] isAvailable error:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status for UI display
   */
  async getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Wait for rate limit to reset (for UI components)
   */
  async waitForRateLimit(
    onProgress?: (timeRemaining: number) => void
  ): Promise<void> {
    return this.rateLimiter.waitForReset(onProgress);
  }

  /**
   * Reset rate limiting (for debugging)
   */
  async resetRateLimit(): Promise<void> {
    return this.rateLimiter.resetRateLimit();
  }

  /**
   * Get debug information about rate limiting
   */
  async getDebugInfo() {
    return this.rateLimiter.getDebugInfo();
  }
}

// Default singleton instance for backward compatibility
export const aiEngine = new AIEngine();

// Static method wrappers for backward compatibility
// These can be deprecated in future versions
export const AIEngineStatic = {
  analyzeEvents: (events: TrackingEvent[]) => aiEngine.analyzeEvents(events),
  analyzeEvent: (event: TrackingEvent) => aiEngine.analyzeEvent(event),
  generateEventAnalysis: (event: TrackingEvent) =>
    aiEngine.generateEventAnalysis(event),
  generateNarrative: (events: TrackingEvent[]) =>
    aiEngine.generateNarrative(events),
  chatQuery: (query: string, events?: TrackingEvent[]) =>
    aiEngine.chatQuery(query, events),
  isAvailable: () => aiEngine.isAvailable(),
  getRateLimitStatus: () => aiEngine.getRateLimitStatus(),
  waitForRateLimit: (onProgress?: (timeRemaining: number) => void) =>
    aiEngine.waitForRateLimit(onProgress),
  resetRateLimit: () => aiEngine.resetRateLimit(),
  getDebugInfo: () => aiEngine.getDebugInfo(),
};
