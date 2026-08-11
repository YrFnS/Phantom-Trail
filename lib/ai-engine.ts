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
import { OpenRouterCredentialStorage } from './storage/openrouter-credential-storage';
import { TIMEOUTS, LIMITS } from './constants';

export interface AIEngineDeps {
  circuitBreaker?: CircuitBreaker;
  offlineMode?: OfflineMode;
  settingsStorage?: typeof SettingsStorage;
  credentialStorage?: typeof OpenRouterCredentialStorage;
  rateLimiter?: typeof RateLimiter;
  aiClient?: typeof AIClient;
  aiCache?: typeof AICache;
  dataSanitizer?: typeof DataSanitizer;
  errorRecovery?: typeof ErrorRecovery;
}

/** Coordinates the explicit optional OpenRouter aggregate-summary action. */
export class AIEngine {
  private circuitBreaker: CircuitBreaker;
  private offlineMode: OfflineMode;
  private settingsStorage: typeof SettingsStorage;
  private credentialStorage: typeof OpenRouterCredentialStorage;
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
    this.credentialStorage =
      deps.credentialStorage ?? OpenRouterCredentialStorage;
    this.rateLimiter = deps.rateLimiter ?? RateLimiter;
    this.aiClient = deps.aiClient ?? AIClient;
    this.aiCache = deps.aiCache ?? AICache;
    this.dataSanitizer = deps.dataSanitizer ?? DataSanitizer;
    this.errorRecovery = deps.errorRecovery ?? ErrorRecovery;
  }

  async analyzeEvents(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    if (!(await this.isAvailable())) return null;
    return this.analyzeEventsAttempt(events, 0);
  }

  private async analyzeEventsAttempt(
    events: TrackingEvent[],
    retryCount: number
  ): Promise<AIAnalysis | null> {
    const context: ErrorContext = {
      operation: 'aggregateEvidenceSummary',
      timestamp: Date.now(),
      systemState: { eventsCount: events.length },
      retryCount,
    };

    try {
      const rateLimitStatus = await this.rateLimiter.getStatus();
      if (!rateLimitStatus.canMakeRequest) {
        return await this.offlineMode.handleAPIFailure(events);
      }

      const sanitizedEvents = this.dataSanitizer.sanitizeEvents(events);
      const cached = await this.aiCache.getCached(sanitizedEvents);
      if (cached) return cached;

      const analysis = await this.circuitBreaker.execute(async () =>
        this.aiClient.makeRequest(sanitizedEvents)
      );

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

  async generateAggregateSummary(events: TrackingEvent[]): Promise<string> {
    if (!(await this.isAvailable())) {
      return 'Optional OpenRouter aggregate summaries are disabled or no credential is configured. Enable the feature explicitly in Settings to use this separate action.';
    }
    if (events.length === 0) {
      return 'No retained detector events are available for an aggregate summary. No request was sent.';
    }

    const analysis = await this.analyzeEvents(events);
    if (!analysis) {
      return 'No OpenRouter aggregate summary is available. No conclusion was produced.';
    }

    const suggestions = analysis.recommendations.length
      ? `\n\nGenerated review notes:\n- ${analysis.recommendations.join('\n- ')}`
      : '';
    return `Optional OpenRouter aggregate summary\n\n${analysis.narrative}${suggestions}\n\nModel confidence field: ${analysis.confidence}. This is generated text, not a verified privacy conclusion.`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const [settings, credentialState] = await Promise.all([
        this.settingsStorage.getSettings(),
        this.credentialStorage.getState(),
      ]);
      return settings.enableAI === true && credentialState.configured;
    } catch (error) {
      console.error('Failed to read aggregate-summary availability:', error);
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
  generateAggregateSummary: (events: TrackingEvent[]) =>
    aiEngine.generateAggregateSummary(events),
  isAvailable: () => aiEngine.isAvailable(),
  getRateLimitStatus: () => aiEngine.getRateLimitStatus(),
  waitForRateLimit: (onProgress?: (timeRemaining: number) => void) =>
    aiEngine.waitForRateLimit(onProgress),
  resetRateLimit: () => aiEngine.resetRateLimit(),
  getDebugInfo: () => aiEngine.getDebugInfo(),
};
