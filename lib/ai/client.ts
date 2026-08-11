import type { AIAnalysis, TrackingEvent, RiskLevel } from '../types';
import { DEFAULT_MODEL, FALLBACK_MODEL } from '../ai-models';
import { SettingsStorage } from '../storage/settings-storage';
import { DataProtectionStorage } from '../storage/data-protection-storage';
import { OpenRouterCredentialStorage } from '../storage/openrouter-credential-storage';
import { calculatePrivacyScore } from '../privacy-score';
import {
  buildAISummaryPayload,
  type AISummaryPayload,
} from './outbound-payload.mts';
import { RateLimiter } from './rate-limiter';
import { jsonrepair } from 'jsonrepair';

export interface APIError extends Error {
  status?: number;
  retryAfter?: number;
  isRateLimit?: boolean;
}

/**
 * OpenRouter client for optional aggregate summaries.
 *
 * P3 builds the chat-completion payload from the same canonical aggregate shown
 * in the settings preview. Raw detector events and URLs are never serialized
 * into the OpenRouter prompt.
 */
export class AIClient {
  private static readonly API_BASE = 'https://openrouter.ai/api/v1';
  private static readonly REQUEST_TIMEOUT = 30000;
  private static readonly MAX_RETRIES = 3;

  static async makeRequest(
    events: TrackingEvent[],
    modelId: string = DEFAULT_MODEL
  ): Promise<AIAnalysis> {
    const [settings, protectionSettings, apiKey] = await Promise.all([
      SettingsStorage.getSettings(),
      DataProtectionStorage.getSettings(),
      OpenRouterCredentialStorage.getCredential(),
    ]);

    if (!settings.enableAI || !apiKey) {
      throw new Error(
        'OpenRouter summaries require explicit enablement and a configured API key'
      );
    }

    const rateLimitStatus = await RateLimiter.getStatus();
    if (!rateLimitStatus.canMakeRequest) {
      const error = new Error('Local OpenRouter rate limit exceeded') as APIError;
      error.isRateLimit = true;
      error.retryAfter =
        rateLimitStatus.retryAfter || rateLimitStatus.resetTime - Date.now();
      throw error;
    }

    const score = calculatePrivacyScore(events);
    const outboundPayload = buildAISummaryPayload(
      events,
      score,
      protectionSettings.aiOutboundMode
    );
    const chatCompletionRequest = {
      model: modelId,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: this.buildUserPrompt(outboundPayload) },
      ],
      max_tokens: 500,
      temperature: 0.3,
    };

    let lastError: APIError | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      if (Date.now() - startTime > this.REQUEST_TIMEOUT) {
        const timeoutError = new Error('Retry window exceeded') as APIError;
        timeoutError.status = 408;
        throw timeoutError;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT
      );

      try {
        const response = await fetch(`${this.API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://phantom-trail.extension',
            'X-Title': 'Phantom Trail Experimental Signal Monitor',
          },
          body: JSON.stringify(chatCompletionRequest),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = new Error(
            `OpenRouter request failed: ${response.status}`
          ) as APIError;
          error.status = response.status;

          if (response.status === 429) {
            error.isRateLimit = true;
            const retryAfter = response.headers.get('retry-after');
            if (retryAfter) {
              error.retryAfter = Number.parseInt(retryAfter, 10) * 1000;
            }
            await RateLimiter.recordRateLimit();
            throw error;
          }

          if (response.status >= 500 && attempt < this.MAX_RETRIES) {
            lastError = error;
            await this.delay(2 ** attempt * 1000);
            continue;
          }

          throw error;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('OpenRouter response did not contain summary text');
        }

        await RateLimiter.recordRequest();
        return this.parseAIResponse(content);
      } catch (error) {
        lastError = error as APIError;

        if (
          lastError.isRateLimit ||
          (lastError.status !== undefined && lastError.status < 500) ||
          attempt === this.MAX_RETRIES
        ) {
          break;
        }

        console.warn(`OpenRouter summary attempt ${attempt} failed`);
        await this.delay(2 ** attempt * 1000);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (modelId === DEFAULT_MODEL && !lastError?.isRateLimit) {
      try {
        return await this.makeRequest(events, FALLBACK_MODEL);
      } catch (fallbackError) {
        console.error('OpenRouter fallback summary failed:', fallbackError);
      }
    }

    throw lastError || new Error('OpenRouter summary attempts failed');
  }

  private static delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  private static buildSystemPrompt(): string {
    return `You summarize aggregate possible tracking-related detector signals from an experimental browser extension.

The input contains aggregate counts and optional bounded resource-domain labels. It contains no page URLs, resource URLs, paths, query strings, fragments, raw descriptions, detector-evidence strings, or API arguments. The detector model remains incomplete and can contain false positives, false negatives, and incorrect attribution.

RESPONSE FORMAT (valid JSON only):
{
  "narrative": "A cautious plain-language summary of the supplied aggregates, maximum 100 words",
  "riskAssessment": "low|medium|high|critical",
  "recommendations": ["one cautious review step", "another cautious review step"],
  "confidence": 0.0
}

RULES:
- Call the input aggregate detector evidence or prototype labels.
- State uncertainty and coverage limits.
- Never claim collection, surveillance, sharing, sale, fingerprinting, attack, safety, reputation, compliance, ownership, or intent as established fact.
- Treat riskAssessment as a prototype severity label, not a verified threat rating.
- Do not infer personal traits, habits, identity, sensitive interests, or user intent.
- Keep confidence at or below 0.6 because the source evidence is unvalidated.`;
  }

  private static buildUserPrompt(payload: AISummaryPayload): string {
    return `Summarize only the following aggregate payload. Do not infer fields that are absent.\n\n${JSON.stringify(
      payload,
      null,
      2
    )}\n\nReturn only the required JSON object.`;
  }

  private static parseAIResponse(content: string): AIAnalysis {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const repairedJson = jsonrepair(jsonMatch ? jsonMatch[0] : content);
      const parsed = JSON.parse(repairedJson) as Record<string, unknown>;

      const narrative =
        typeof parsed.narrative === 'string' && parsed.narrative.trim()
          ? parsed.narrative.trim()
          : 'The optional model returned no usable aggregate-signal summary.';
      const recommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
      const confidenceValue =
        typeof parsed.confidence === 'number' ? parsed.confidence : 0;

      return {
        narrative: `${narrative}\n\nThis generated summary may be inaccurate and is not a verified privacy conclusion.`,
        riskAssessment: this.normalizeRiskLevel(parsed.riskAssessment),
        recommendations:
          recommendations.length > 0
            ? recommendations
            : ['Review the underlying detector evidence and coverage limits.'],
        confidence: Math.max(0, Math.min(0.6, confidenceValue)),
      };
    } catch (error) {
      console.error('Failed to parse OpenRouter summary:', error);
      return {
        narrative:
          'The optional model response could not be parsed. No conclusion was produced.',
        riskAssessment: 'medium',
        recommendations: [
          'Review the underlying detector evidence directly.',
          'Do not treat an unavailable summary as evidence of safety or risk.',
        ],
        confidence: 0,
      };
    }
  }

  private static normalizeRiskLevel(value: unknown): RiskLevel {
    return value === 'low' ||
      value === 'medium' ||
      value === 'high' ||
      value === 'critical'
      ? value
      : 'medium';
  }
}
