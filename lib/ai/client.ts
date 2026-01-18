import type { AIAnalysis, TrackingEvent, RiskLevel } from '../types';
import { DEFAULT_MODEL, FALLBACK_MODEL } from '../ai-models';
import { StorageManager } from '../storage-manager';
import { RateLimiter } from './rate-limiter';
import { jsonrepair } from 'jsonrepair';

export interface APIError extends Error {
  status?: number;
  retryAfter?: number;
  isRateLimit?: boolean;
}

/**
 * OpenRouter API client for AI requests with enhanced error handling
 */
export class AIClient {
  private static readonly API_BASE = 'https://openrouter.ai/api/v1';
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Make API request to OpenRouter with retry logic and timeout limits
   */
  static async makeRequest(
    events: TrackingEvent[],
    modelId: string = DEFAULT_MODEL
  ): Promise<AIAnalysis> {
    const settings = await StorageManager.getSettings();
    const apiKey = settings.openRouterApiKey;

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Check rate limiting before making request
    const rateLimitStatus = await RateLimiter.getStatus();
    if (!rateLimitStatus.canMakeRequest) {
      const error = new Error('Rate limit exceeded') as APIError;
      error.isRateLimit = true;
      error.retryAfter = rateLimitStatus.retryAfter || (rateLimitStatus.resetTime - Date.now());
      throw error;
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(events);

    const requestBody = {
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    };

    let lastError: APIError | null = null;
    const maxRetryTime = 30000; // 30 seconds total retry limit
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      // Check if we've exceeded total retry time
      if (Date.now() - startTime > maxRetryTime) {
        const timeoutError = new Error('Retry timeout exceeded') as APIError;
        timeoutError.status = 408;
        throw timeoutError;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        const response = await fetch(`${this.API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://phantom-trail.extension',
            'X-Title': 'Phantom Trail Extension',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`API request failed: ${response.status}`) as APIError;
          error.status = response.status;

          if (response.status === 429) {
            error.isRateLimit = true;
            // Try to get retry-after header
            const retryAfter = response.headers.get('retry-after');
            if (retryAfter) {
              error.retryAfter = parseInt(retryAfter) * 1000; // Convert to ms
            }
            
            // Record rate limit for backoff
            await RateLimiter.recordRateLimit();
            throw error;
          }

          // For 5xx errors, retry
          if (response.status >= 500 && attempt < this.MAX_RETRIES) {
            lastError = error;
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
            continue;
          }

          throw error;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('No content in API response');
        }

        // Record successful request
        await RateLimiter.recordRequest();

        return this.parseAIResponse(content);
      } catch (error) {
        lastError = error as APIError;

        // Don't retry on rate limits or client errors
        if (lastError.isRateLimit || (lastError.status && lastError.status < 500)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        console.warn(`API request attempt ${attempt} failed:`, error);
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }

    // Try fallback model if primary fails and it's not a rate limit
    if (modelId === DEFAULT_MODEL && !lastError?.isRateLimit) {
      try {
        return await this.makeRequest(events, FALLBACK_MODEL);
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Delay helper for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build system prompt for AI
   */
  private static buildSystemPrompt(): string {
    return `You are a privacy expert analyzing web tracking activity. Provide clear, actionable insights about data collection.

RESPONSE FORMAT (JSON):
{
  "narrative": "Brief explanation in plain English (max 100 words)",
  "riskAssessment": "low|medium|high|critical",
  "recommendations": ["action1", "action2"],
  "confidence": 0.85
}

GUIDELINES:
- Use simple language, avoid technical jargon
- Focus on user impact, not technical details
- Provide specific, actionable recommendations
- Be accurate but not alarmist`;
  }

  /**
   * Build user prompt from tracking events
   */
  private static buildUserPrompt(events: TrackingEvent[]): string {
    const summary = this.summarizeEvents(events);
    return `Analyze this tracking activity:

${summary}

Provide analysis in the specified JSON format.`;
  }

  /**
   * Summarize events for AI prompt
   */
  private static summarizeEvents(events: TrackingEvent[]): string {
    const domainCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const riskCounts = new Map<RiskLevel, number>();

    events.forEach(event => {
      domainCounts.set(event.domain, (domainCounts.get(event.domain) || 0) + 1);
      typeCounts.set(event.trackerType, (typeCounts.get(event.trackerType) || 0) + 1);
      riskCounts.set(event.riskLevel, (riskCounts.get(event.riskLevel) || 0) + 1);
    });

    const topDomains = Array.from(domainCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => `${domain} (${count}x)`)
      .join(', ');

    const typesSummary = Array.from(typeCounts.entries())
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    const riskSummary = Array.from(riskCounts.entries())
      .map(([risk, count]) => `${risk}: ${count}`)
      .join(', ');

    return `Total events: ${events.length}
Top domains: ${topDomains}
Tracker types: ${typesSummary}
Risk levels: ${riskSummary}`;
  }

  /**
   * Parse AI response JSON
   */
  private static parseAIResponse(content: string): AIAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      
      // Repair and parse JSON
      const repairedJson = jsonrepair(jsonStr);
      const parsed = JSON.parse(repairedJson);

      return {
        narrative: parsed.narrative || 'Analysis completed',
        riskAssessment: parsed.riskAssessment || 'medium',
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Fallback analysis
      return {
        narrative: 'Unable to analyze tracking data at this time.',
        riskAssessment: 'medium',
        recommendations: ['Review privacy settings', 'Consider using ad blockers'],
        confidence: 0.1,
      };
    }
  }
}
