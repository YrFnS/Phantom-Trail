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
 * Coordinates optional OpenRouter event summaries.
 *
 * External requests are permitted only when the user has explicitly enabled AI
 * analysis and stored an API key. A stored key alone is not consent.
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

  async analyzeEvents(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    if (!(await this.isAvailable())) {
      return null;
    }

    return this.analyzeEventsAttempt(events, 0);
  }

  private async analyzeEventsAttempt(
    events: TrackingEvent[],
    retryCount: number
  ): Promise<AIAnalysis | null> {
    const context: ErrorContext = {
      operation: 'analyzeEvents',
      timestamp: Date.now(),
      systemState: { eventsCount: events.length },
      retryCount,
    };

    try {
      const rateLimitStatus = await this.rateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        console.warn('OpenRouter summary is locally rate limited');
        return await this.offlineMode.handleAPIFailure(events);
      }

      const sanitizedEvents = this.dataSanitizer.sanitizeEvents(events);
      const cached = await this.aiCache.getCached(sanitizedEvents);
      if (cached) return cached;

      const analysis = await this.circuitBreaker.execute(async () => {
        return await this.aiClient.makeRequest(sanitizedEvents);
      });

      await this.aiCache.store(sanitizedEvents, analysis);
      await this.offlineMode.cacheAnalysis(sanitizedEvents, analysis);
      return analysis;
    } catch (error) {
      const apiError = error as APIError;

      if (apiError.isRateLimit) {
        await this.rateLimiter.recordRateLimit();
        return await this.offlineMode.handleAPIFailure(events);
      }

      const recoveryResult = await this.errorRecovery.handleAPIError(
        apiError,
        context
      );
      const nextRetryCount = retryCount + 1;

      if (
        recoveryResult.success &&
        nextRetryCount < LIMITS.MAX_RETRIES &&
        (await this.isAvailable())
      ) {
        return this.analyzeEventsAttempt(events, nextRetryCount);
      }

      console.warn('OpenRouter summary failed; using local fallback:', error);
      return await this.offlineMode.handleAPIFailure(events);
    }
  }

  async analyzeEvent(event: TrackingEvent): Promise<AIAnalysis | null> {
    return this.analyzeEvents([event]);
  }

  async generateEventAnalysis(
    event: TrackingEvent
  ): Promise<AIAnalysis | null> {
    return this.analyzeEvent(event);
  }

  async generateNarrative(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    return this.analyzeEvents(events);
  }

  /**
   * The 0.1.0 client summarizes recorded event data. It does not send the
   * wording of the user's question to the model or provide general Q&A.
   */
  async chatQuery(query: string, events?: TrackingEvent[]): Promise<string> {
    const requestedTopic = query.trim();

    if (!(await this.isAvailable())) {
      return 'OpenRouter event summaries are disabled or no API key is configured. The prototype can still answer supported local signal-analysis patterns.';
    }

    try {
      const rateLimitStatus = await this.rateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const waitTime =
          rateLimitStatus.retryAfter || rateLimitStatus.resetTime - Date.now();
        const waitSeconds = Math.max(1, Math.ceil(waitTime / 1000));
        return `The optional OpenRouter summary is rate limited. Try again after approximately ${waitSeconds} seconds.`;
      }

      const analysis = await this.analyzeEvents(events || []);
      if (!analysis) {
        return 'No optional event summary is available.';
      }

      return `Requested topic: ${requestedTopic || 'recorded signals'}\n\nThis 0.1.0 prototype generated an event summary rather than a direct answer to the wording of the question:\n\n${analysis.narrative}\n\nGenerated suggestions: ${analysis.recommendations.join(', ')}`;
    } catch (error) {
      const apiError = error as APIError;

      if (apiError.isRateLimit) {
        const waitTime = apiError.retryAfter || TIMEOUTS.RATE_LIMIT_WINDOW;
        const waitSeconds = Math.max(1, Math.ceil(waitTime / 1000));
        return `The optional OpenRouter summary is rate limited. Try again after approximately ${waitSeconds} seconds.`;
      }

      console.error('Optional event summary failed:', error);
      return 'The optional event summary failed. No conclusion was produced.';
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const settings = await this.settingsStorage.getSettings();
      return settings.enableAI === true && Boolean(settings.openRouterApiKey);
    } catch (error) {
      console.error('Failed to read AI opt-in settings:', error);
      return false;
    }
  }

  async getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  async waitForRateLimit(
    onProgress?: (timeRemaining: number) => void
  ): Promise<void> {
    return this.rateLimiter.waitForReset(onProgress);
  }

  async resetRateLimit(): Promise<void> {
    return this.rateLimiter.resetRateLimit();
  }

  async getDebugInfo() {
    return this.rateLimiter.getDebugInfo();
  }
}

export const aiEngine = new AIEngine();

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
