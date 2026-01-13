import type { TrackingEvent } from '../../lib/types';
import type { WebsiteContext, ContextualPrompt } from './LiveNarrative.types';

/**
 * Website context detection utilities for context-aware AI analysis
 */
export class ContextDetector {
  /**
   * Banking and financial domains
   */
  private static readonly BANKING_DOMAINS = [
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citibank.com',
    'usbank.com',
    'capitalone.com',
    'americanexpress.com',
    'discover.com',
    'paypal.com',
    'venmo.com',
    'zelle.com',
    'mint.com',
    'creditkarma.com',
  ];

  /**
   * Shopping and e-commerce domains
   */
  private static readonly SHOPPING_DOMAINS = [
    'amazon.com',
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'costco.com',
    'homedepot.com',
    'lowes.com',
    'macys.com',
    'nordstrom.com',
    'shopify.com',
    'etsy.com',
    'alibaba.com',
    'aliexpress.com',
  ];

  /**
   * Social media domains
   */
  private static readonly SOCIAL_DOMAINS = [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'linkedin.com',
    'tiktok.com',
    'snapchat.com',
    'pinterest.com',
    'reddit.com',
    'youtube.com',
    'discord.com',
    'telegram.org',
    'whatsapp.com',
  ];

  /**
   * News and media domains
   */
  private static readonly NEWS_DOMAINS = [
    'cnn.com',
    'bbc.com',
    'nytimes.com',
    'washingtonpost.com',
    'reuters.com',
    'ap.org',
    'npr.org',
    'foxnews.com',
    'msnbc.com',
    'wsj.com',
    'bloomberg.com',
    'techcrunch.com',
    'theverge.com',
  ];

  /**
   * Search engine domains
   */
  private static readonly SEARCH_DOMAINS = [
    'google.com',
    'bing.com',
    'yahoo.com',
    'duckduckgo.com',
    'baidu.com',
    'yandex.com',
    'ask.com',
  ];

  /**
   * Streaming and entertainment domains
   */
  private static readonly STREAMING_DOMAINS = [
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'amazon.com/prime',
    'hbo.com',
    'spotify.com',
    'apple.com/music',
    'twitch.tv',
    'youtube.com',
    'vimeo.com',
    'soundcloud.com',
  ];

  /**
   * Detect website context from tracking event
   */
  static detectContext(event: TrackingEvent): WebsiteContext {
    const domain = this.extractRootDomain(event.domain);

    if (
      this.BANKING_DOMAINS.some(d => domain.includes(d) || d.includes(domain))
    ) {
      return 'banking';
    }

    if (
      this.SHOPPING_DOMAINS.some(d => domain.includes(d) || d.includes(domain))
    ) {
      return 'shopping';
    }

    if (
      this.SOCIAL_DOMAINS.some(d => domain.includes(d) || d.includes(domain))
    ) {
      return 'social';
    }

    if (this.NEWS_DOMAINS.some(d => domain.includes(d) || d.includes(domain))) {
      return 'news';
    }

    if (
      this.SEARCH_DOMAINS.some(d => domain.includes(d) || d.includes(domain))
    ) {
      return 'search';
    }

    if (
      this.STREAMING_DOMAINS.some(d => domain.includes(d) || d.includes(domain))
    ) {
      return 'streaming';
    }

    return 'unknown';
  }

  /**
   * Get contextual prompt configuration for AI analysis
   */
  static getContextualPrompt(context: WebsiteContext): ContextualPrompt {
    const prompts: Record<WebsiteContext, ContextualPrompt> = {
      banking: {
        context: 'banking',
        systemPrompt:
          'This is a banking/financial website. Focus on data security, financial privacy, and unauthorized access risks.',
        riskMultiplier: 2.0,
      },
      shopping: {
        context: 'shopping',
        systemPrompt:
          'This is an e-commerce website. Focus on purchase tracking, price manipulation, and behavioral profiling.',
        riskMultiplier: 1.2,
      },
      social: {
        context: 'social',
        systemPrompt:
          'This is a social media website. Focus on social graph analysis, content tracking, and behavioral targeting.',
        riskMultiplier: 1.5,
      },
      news: {
        context: 'news',
        systemPrompt:
          'This is a news/media website. Focus on reading habits, political profiling, and content personalization.',
        riskMultiplier: 1.1,
      },
      search: {
        context: 'search',
        systemPrompt:
          'This is a search engine. Focus on search history, query tracking, and intent profiling.',
        riskMultiplier: 1.8,
      },
      streaming: {
        context: 'streaming',
        systemPrompt:
          'This is a streaming/entertainment website. Focus on viewing habits, content preferences, and engagement tracking.',
        riskMultiplier: 1.0,
      },
      unknown: {
        context: 'unknown',
        systemPrompt:
          'Analyze general tracking behavior and privacy implications.',
        riskMultiplier: 1.0,
      },
    };

    return prompts[context];
  }

  /**
   * Extract root domain from full domain string
   */
  private static extractRootDomain(domain: string): string {
    try {
      // Remove protocol if present
      const cleanDomain = domain.replace(/^https?:\/\//, '');

      // Split by dots and take last two parts for most domains
      const parts = cleanDomain.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }

      return cleanDomain;
    } catch (error) {
      console.error('Failed to extract root domain:', error);
      return domain;
    }
  }

  /**
   * Check if context indicates high-risk scenario
   */
  static isHighRiskContext(
    context: WebsiteContext,
    trackerType: string
  ): boolean {
    const highRiskCombinations = [
      {
        context: 'banking',
        trackers: ['advertising', 'social', 'fingerprinting'],
      },
      { context: 'search', trackers: ['advertising', 'social'] },
      { context: 'social', trackers: ['fingerprinting', 'cryptomining'] },
    ];

    return highRiskCombinations.some(
      combo => combo.context === context && combo.trackers.includes(trackerType)
    );
  }

  /**
   * Get context-specific risk assessment
   */
  static assessContextualRisk(
    event: TrackingEvent,
    context: WebsiteContext
  ): {
    baseRisk: number;
    contextMultiplier: number;
    finalRisk: number;
    reasoning: string;
  } {
    const baseRiskMap = {
      low: 0.2,
      medium: 0.5,
      high: 0.8,
      critical: 1.0,
    };

    const baseRisk = baseRiskMap[event.riskLevel];
    const contextPrompt = this.getContextualPrompt(context);
    const contextMultiplier = contextPrompt.riskMultiplier;

    const isHighRisk = this.isHighRiskContext(context, event.trackerType);
    const finalMultiplier = isHighRisk
      ? contextMultiplier * 1.5
      : contextMultiplier;

    const finalRisk = Math.min(1.0, baseRisk * finalMultiplier);

    const reasoning = isHighRisk
      ? `High-risk tracker (${event.trackerType}) detected on ${context} website`
      : `Standard ${event.trackerType} tracking on ${context} website`;

    return {
      baseRisk,
      contextMultiplier: finalMultiplier,
      finalRisk,
      reasoning,
    };
  }
}
