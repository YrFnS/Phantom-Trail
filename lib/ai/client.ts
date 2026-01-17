import type { AIAnalysis, TrackingEvent, RiskLevel } from '../types';
import { DEFAULT_MODEL, FALLBACK_MODEL } from '../ai-models';
import { StorageManager } from '../storage-manager';
import { jsonrepair } from 'jsonrepair';

/**
 * OpenRouter API client for AI requests
 */
export class AIClient {
  private static readonly API_BASE = 'https://openrouter.ai/api/v1';

  /**
   * Make API request to OpenRouter
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

    try {
      const response = await fetch(`${this.API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://phantom-trail.extension',
          'X-Title': 'Phantom Trail Extension',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited by OpenRouter API');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in API response');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('AI API request failed:', error);
      
      // Try fallback model if primary fails
      if (modelId === DEFAULT_MODEL) {
        return this.makeRequest(events, FALLBACK_MODEL);
      }
      
      throw error;
    }
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
