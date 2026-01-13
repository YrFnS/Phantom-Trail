import type { EventAnalysis, EventAnalysisCache } from './LiveNarrative.types';
import type { TrackingEvent } from '../../lib/types';

/**
 * AI analysis caching system with TTL and event-based invalidation
 * Uses session storage to reset cache per browser session
 */
export class AnalysisCache {
  private static readonly CACHE_KEY = 'phantom_trail_analysis_cache';
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Generate cache key from event signature
   */
  private static generateEventSignature(event: TrackingEvent): string {
    return `${event.domain}-${event.trackerType}-${event.riskLevel}`;
  }

  /**
   * Get cached analysis for an event
   */
  static async getCachedAnalysis(
    event: TrackingEvent
  ): Promise<EventAnalysis | null> {
    try {
      const signature = this.generateEventSignature(event);
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: EventAnalysisCache = result[this.CACHE_KEY] || {};

      const cached = cache[signature];
      if (!cached) return null;

      // Check TTL
      const now = Date.now();
      if (now - cached.timestamp > cached.ttl) {
        // Remove expired entry
        delete cache[signature];
        await chrome.storage.session.set({ [this.CACHE_KEY]: cache });
        return null;
      }

      return cached.analysis;
    } catch (error) {
      console.error('Failed to get cached analysis:', error);
      return null;
    }
  }

  /**
   * Cache analysis for an event
   */
  static async setCachedAnalysis(
    event: TrackingEvent,
    analysis: EventAnalysis,
    ttl = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const signature = this.generateEventSignature(event);
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: EventAnalysisCache = result[this.CACHE_KEY] || {};

      // Add new entry
      cache[signature] = {
        analysis,
        timestamp: Date.now(),
        ttl,
      };

      // Cleanup old entries if cache is too large
      await this.cleanupCache(cache);

      await chrome.storage.session.set({ [this.CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache analysis:', error);
    }
  }

  /**
   * Invalidate cache entries for a specific domain
   */
  static async invalidateDomain(domain: string): Promise<void> {
    try {
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: EventAnalysisCache = result[this.CACHE_KEY] || {};

      // Remove entries matching domain
      for (const signature in cache) {
        if (signature.startsWith(`${domain}-`)) {
          delete cache[signature];
        }
      }

      await chrome.storage.session.set({ [this.CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to invalidate domain cache:', error);
    }
  }

  /**
   * Clear entire cache
   */
  static async clearCache(): Promise<void> {
    try {
      await chrome.storage.session.remove(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Cleanup old entries to maintain cache size limit
   */
  private static async cleanupCache(cache: EventAnalysisCache): Promise<void> {
    const entries = Object.entries(cache);

    if (entries.length <= this.MAX_CACHE_SIZE) return;

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries
    const toRemove = entries.length - this.MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      delete cache[entries[i][0]];
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(): Promise<{
    size: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const result = await chrome.storage.session.get(this.CACHE_KEY);
      const cache: EventAnalysisCache = result[this.CACHE_KEY] || {};
      const entries = Object.values(cache);

      if (entries.length === 0) {
        return { size: 0, oldestEntry: 0, newestEntry: 0 };
      }

      const timestamps = entries.map(e => e.timestamp);
      return {
        size: entries.length,
        oldestEntry: Math.min(...timestamps),
        newestEntry: Math.max(...timestamps),
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { size: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }
}
