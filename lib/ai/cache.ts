import type { AIAnalysis, TrackingEvent } from '../types';

interface CacheEntry {
  analysis: AIAnalysis;
  timestamp: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

/**
 * AI response caching utilities
 */
export class AICache {
  private static readonly CACHE_KEY = 'phantom_trail_ai_cache';
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate cache key from events
   */
  private static generateCacheKey(events: TrackingEvent[]): string {
    const domains = events
      .map(e => e.domain)
      .sort()
      .join(',');
    const trackerTypes = events
      .map(e => e.trackerType)
      .sort()
      .join(',');
    return `${domains}:${trackerTypes}`;
  }

  /**
   * Get cached AI analysis
   */
  static async getCached(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    try {
      const cacheKey = this.generateCacheKey(events);
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: CacheData = result[this.CACHE_KEY] || {};

      const cached = cache[cacheKey];
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.analysis;
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store AI analysis in cache
   */
  static async store(
    events: TrackingEvent[],
    analysis: AIAnalysis
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(events);
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: CacheData = result[this.CACHE_KEY] || {};

      cache[cacheKey] = {
        analysis,
        timestamp: Date.now(),
      };

      // Clean old entries (keep only last 50)
      const entries = Object.entries(cache);
      if (entries.length > 50) {
        const sorted = entries.sort(
          ([, a], [, b]) => b.timestamp - a.timestamp
        );
        const cleaned = Object.fromEntries(sorted.slice(0, 50));
        await chrome.storage.session.set({ [this.CACHE_KEY]: cleaned });
      } else {
        await chrome.storage.session.set({ [this.CACHE_KEY]: cache });
      }
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }
}
