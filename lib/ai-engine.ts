import type { AIAnalysis, TrackingEvent, RiskLevel } from './types';
import { StorageManager } from './storage-manager';
import { DEFAULT_MODEL, FALLBACK_MODEL } from './ai-models';

/**
 * OpenRouter API integration for AI-powered tracking analysis
 */
export class AIEngine {
  private static readonly API_BASE = 'https://openrouter.ai/api/v1';
  private static readonly MAX_REQUESTS_PER_MINUTE = 10;
  private static readonly RATE_LIMIT_KEY = 'phantom_trail_rate_limit';

  /**
   * Chat interface for user queries
   */
  static async chatQuery(query: string): Promise<string | null> {
    try {
      // Validate input
      if (!query || typeof query !== 'string' || !query.trim()) {
        return null;
      }

      if (!(await this.canMakeRequest())) return null;

      const settings = await StorageManager.getSettings();
      if (!settings.enableAI || !settings.apiKey) return null;

      const events = await StorageManager.getRecentEvents(50);
      const prompt = this.buildChatPrompt(query.trim(), events);
      
      const response = await this.callOpenRouter(settings.apiKey, prompt);
      if (response) {
        await this.incrementRequestCount();
        
        // Validate response is reasonable length and content
        if (response.length > 2000) {
          return response.substring(0, 2000) + '...';
        }
        
        return response;
      }
      
      return null;
    } catch (error) {
      console.error('Chat query failed:', error);
      return null;
    }
  }

  /**
   * Generate AI narrative for tracking events
   */
  static async generateNarrative(
    events: TrackingEvent[]
  ): Promise<AIAnalysis | null> {
    try {
      if (!(await this.canMakeRequest())) {
        console.warn('Rate limit exceeded, skipping AI analysis');
        return null;
      }

      const settings = await StorageManager.getSettings();
      if (!settings.enableAI || !settings.apiKey) {
        return null;
      }

      const prompt = this.buildPrompt(events);
      const response = await this.callOpenRouter(settings.apiKey, prompt);

      if (response) {
        await this.incrementRequestCount();
        return this.parseResponse(response);
      }

      return null;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Check if we can make another API request (rate limiting)
   */
  private static async canMakeRequest(): Promise<boolean> {
    try {
      const result = await chrome.storage.session.get(this.RATE_LIMIT_KEY);
      const rateData = result[this.RATE_LIMIT_KEY] || {
        count: 0,
        resetTime: Date.now(),
      };
      const now = Date.now();

      // Reset counter every minute
      if (now - rateData.resetTime > 60000) {
        rateData.count = 0;
        rateData.resetTime = now;
      }

      return rateData.count < this.MAX_REQUESTS_PER_MINUTE;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow request if storage fails
    }
  }

  /**
   * Increment request counter
   */
  private static async incrementRequestCount(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(this.RATE_LIMIT_KEY);
      const rateData = result[this.RATE_LIMIT_KEY] || {
        count: 0,
        resetTime: Date.now(),
      };
      rateData.count++;

      await chrome.storage.session.set({
        [this.RATE_LIMIT_KEY]: rateData,
      });
    } catch (error) {
      console.error('Failed to increment request count:', error);
    }
  }

  /**
   * Build prompt for chat queries
   */
  private static buildChatPrompt(query: string, events: TrackingEvent[]): string {
    const recentEvents = events.slice(-20);
    const eventSummary = recentEvents
      .map(e => `${e.domain} (${e.trackerType}): ${e.description}`)
      .join('\n');

    return `You are a privacy expert. Based on recent tracking data, answer this user question: "${query}"

Recent tracking activity:
${eventSummary}

Provide a conversational, helpful response. Be specific about what companies learned and actionable about what the user can do.`;
  }

  /**
   * Build prompt for AI analysis
   */
  private static buildPrompt(events: TrackingEvent[]): string {
    const recentEvents = events.slice(-10); // Last 10 events for context

    const eventSummary = recentEvents
      .map(
        event =>
          `- ${event.domain} (${event.trackerType}): ${event.description}`
      )
      .join('\n');

    return `You are a privacy expert analyzing web tracking activity. Based on these recent tracking events, provide a brief, user-friendly analysis:

${eventSummary}

Respond with a JSON object containing:
- "narrative": A 1-2 sentence plain English explanation of what's happening
- "riskAssessment": Overall risk level (low/medium/high/critical)  
- "recommendations": Array of 1-2 actionable recommendations
- "confidence": Confidence score 0-1

Keep the narrative conversational and non-technical. Focus on what the user should know or do.`;
  }

  private static async callOpenRouter(
    apiKey: string,
    prompt: string
  ): Promise<string | null> {
    try {
      const settings = await StorageManager.getSettings();
      const primaryModel = settings.aiModel || DEFAULT_MODEL;
      
      // Try user-selected model first
      let response = await this.makeAPICall(apiKey, prompt, primaryModel);
      if (response) return response;

      // Fallback to default model if user model fails
      if (primaryModel !== DEFAULT_MODEL) {
        response = await this.makeAPICall(apiKey, prompt, DEFAULT_MODEL);
        if (response) return response;
      }
      
      // Final fallback
      response = await this.makeAPICall(apiKey, prompt, FALLBACK_MODEL);
      return response;
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      return null;
    }
  }

  /**
   * Make actual API call to OpenRouter with retry logic
   */
  private static async makeAPICall(
    apiKey: string,
    prompt: string,
    model: string,
    retries = 2
  ): Promise<string | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': chrome.runtime.getURL(''),
            'X-Title': 'Phantom Trail',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
      } catch (error) {
        if (attempt === retries) {
          console.error(`API call to ${model} failed after ${retries + 1} attempts:`, error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Parse AI response into structured format
   */
  private static parseResponse(response: string): AIAnalysis {
    try {
      // Validate response is not empty or malformed
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(response);

      // Validate required fields exist
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Response is not a valid object');
      }

      return {
        narrative: typeof parsed.narrative === 'string' 
          ? parsed.narrative 
          : 'Tracking activity detected',
        riskAssessment:
          this.validateRiskLevel(parsed.riskAssessment) || 'medium',
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.slice(0, 3).filter((r: unknown) => typeof r === 'string')
          : ['Review your privacy settings'],
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);

      // Fallback analysis
      return {
        narrative: 'Multiple trackers detected on this page',
        riskAssessment: 'medium',
        recommendations: ['Consider using privacy-focused browser settings'],
        confidence: 0.3,
      };
    }
  }

  /**
   * Validate risk level from AI response
   */
  private static validateRiskLevel(level: unknown): RiskLevel | null {
    const validLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    return typeof level === 'string' && validLevels.includes(level as RiskLevel)
      ? (level as RiskLevel)
      : null;
  }
}
