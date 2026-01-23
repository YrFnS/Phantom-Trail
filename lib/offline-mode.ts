import type { TrackingEvent } from './types';

export interface AIAnalysis {
  narrative: string;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  confidence: number;
}

export interface CachedAnalysis extends AIAnalysis {
  cacheKey: string;
  timestamp: number;
  events: TrackingEvent[];
}

export interface OfflineModeConfig {
  cacheMaxAge: number;
  maxCachedAnalyses: number;
  enableRuleBasedAnalysis: boolean;
}

export class OfflineMode {
  private static instance: OfflineMode;
  private isOffline: boolean = false;
  private cachedAnalyses: Map<string, CachedAnalysis> = new Map();
  private config: OfflineModeConfig;

  private constructor(config: Partial<OfflineModeConfig> = {}) {
    this.config = {
      cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCachedAnalyses: 100,
      enableRuleBasedAnalysis: true,
      ...config,
    };

    this.loadCachedAnalyses();
  }

  static getInstance(config?: Partial<OfflineModeConfig>): OfflineMode {
    if (!OfflineMode.instance) {
      OfflineMode.instance = new OfflineMode(config);
    }
    return OfflineMode.instance;
  }

  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  isInOfflineMode(): boolean {
    return this.isOffline;
  }

  async handleAPIFailure(events: TrackingEvent[]): Promise<AIAnalysis | null> {
    // Try to find cached analysis for similar events
    const cachedResult = await this.findSimilarAnalysis(events);
    if (cachedResult) {
      return this.adaptCachedAnalysis(cachedResult, events);
    }

    // Fall back to rule-based analysis if enabled
    if (this.config.enableRuleBasedAnalysis) {
      return this.generateRuleBasedAnalysis(events);
    }

    return null;
  }

  async cacheAnalysis(
    events: TrackingEvent[],
    analysis: AIAnalysis
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(events);
    const cachedAnalysis: CachedAnalysis = {
      ...analysis,
      cacheKey,
      timestamp: Date.now(),
      events: events.slice(), // Create a copy
    };

    this.cachedAnalyses.set(cacheKey, cachedAnalysis);

    // Limit cache size
    if (this.cachedAnalyses.size > this.config.maxCachedAnalyses) {
      this.evictOldestCache();
    }

    await this.saveCachedAnalyses();
  }

  private async findSimilarAnalysis(
    events: TrackingEvent[]
  ): Promise<CachedAnalysis | null> {
    const currentDomains = new Set(events.map(e => e.domain));
    const currentRiskLevels = events.map(e => e.riskLevel);

    let bestMatch: CachedAnalysis | null = null;
    let bestScore = 0;

    for (const cached of this.cachedAnalyses.values()) {
      // Check if cache is still valid
      if (Date.now() - cached.timestamp > this.config.cacheMaxAge) {
        continue;
      }

      const cachedDomains = new Set(cached.events.map(e => e.domain));
      const similarity = this.calculateSimilarity(
        currentDomains,
        cachedDomains,
        currentRiskLevels,
        cached.events.map(e => e.riskLevel)
      );

      if (similarity > bestScore && similarity > 0.6) {
        // 60% similarity threshold
        bestScore = similarity;
        bestMatch = cached;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(
    domains1: Set<string>,
    domains2: Set<string>,
    risks1: string[],
    risks2: string[]
  ): number {
    // Domain similarity
    const intersection = new Set([...domains1].filter(d => domains2.has(d)));
    const union = new Set([...domains1, ...domains2]);
    const domainSimilarity = intersection.size / union.size;

    // Risk level similarity
    const riskSimilarity = this.calculateRiskSimilarity(risks1, risks2);

    // Weighted average
    return domainSimilarity * 0.7 + riskSimilarity * 0.3;
  }

  private calculateRiskSimilarity(risks1: string[], risks2: string[]): number {
    const riskWeights = { low: 1, medium: 2, high: 3, critical: 4 };

    const avg1 =
      risks1.reduce(
        (sum, risk) =>
          sum + (riskWeights[risk as keyof typeof riskWeights] || 0),
        0
      ) / risks1.length;
    const avg2 =
      risks2.reduce(
        (sum, risk) =>
          sum + (riskWeights[risk as keyof typeof riskWeights] || 0),
        0
      ) / risks2.length;

    return 1 - Math.abs(avg1 - avg2) / 4; // Normalize to 0-1
  }

  private adaptCachedAnalysis(
    cached: CachedAnalysis,
    currentEvents: TrackingEvent[]
  ): AIAnalysis {
    // Adapt the cached analysis to current events
    const adaptedNarrative = cached.narrative.replace(
      /\d+ trackers?/g,
      `${currentEvents.length} tracker${currentEvents.length === 1 ? '' : 's'}`
    );

    return {
      narrative: `${adaptedNarrative} (from cache)`,
      riskAssessment: cached.riskAssessment,
      recommendations: cached.recommendations,
      confidence: cached.confidence * 0.8, // Reduce confidence for cached results
    };
  }

  private generateRuleBasedAnalysis(events: TrackingEvent[]): AIAnalysis {
    const highRiskEvents = events.filter(
      e => e.riskLevel === 'critical' || e.riskLevel === 'high'
    );
    const mediumRiskEvents = events.filter(e => e.riskLevel === 'medium');

    let narrative = 'Privacy analysis (offline mode): ';
    let riskAssessment: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (highRiskEvents.length === 0 && mediumRiskEvents.length === 0) {
      narrative += 'No significant tracking detected on this page.';
      riskAssessment = 'low';
    } else if (highRiskEvents.length === 0) {
      narrative += `${mediumRiskEvents.length} medium-risk tracker${mediumRiskEvents.length === 1 ? '' : 's'} detected.`;
      riskAssessment = 'medium';
      recommendations.push('Consider reviewing privacy settings for this site');
    } else if (
      highRiskEvents.filter(e => e.riskLevel === 'critical').length > 0
    ) {
      narrative += `${highRiskEvents.length} high-risk tracker${highRiskEvents.length === 1 ? '' : 's'} detected, including critical threats.`;
      riskAssessment = 'critical';
      recommendations.push(
        'Immediate action recommended - consider leaving this site'
      );
      recommendations.push('Use a VPN and ad blocker for protection');
    } else {
      narrative += `${highRiskEvents.length} high-risk tracker${highRiskEvents.length === 1 ? '' : 's'} detected.`;
      riskAssessment = 'high';
      recommendations.push('Consider using an ad blocker or privacy browser');
      recommendations.push('Review and limit data sharing permissions');
    }

    // Add domain-specific recommendations
    const uniqueDomains = new Set(events.map(e => e.domain));
    if (uniqueDomains.size > 5) {
      recommendations.push(
        'Multiple tracking domains detected - consider stricter privacy settings'
      );
    }

    return {
      narrative,
      riskAssessment,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['Continue browsing normally'],
      confidence: 0.7, // Lower confidence for rule-based analysis
    };
  }

  private generateCacheKey(events: TrackingEvent[]): string {
    const domains = events.map(e => e.domain).sort();
    const risks = events.map(e => e.riskLevel).sort();
    return `${domains.join(',')}_${risks.join(',')}`;
  }

  private evictOldestCache(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of this.cachedAnalyses.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cachedAnalyses.delete(oldestKey);
    }
  }

  private async loadCachedAnalyses(): Promise<void> {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(['offlineAnalysisCache']);
        if (result.offlineAnalysisCache) {
          const cached = JSON.parse(result.offlineAnalysisCache);
          this.cachedAnalyses = new Map(cached);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached analyses:', error);
    }
  }

  private async saveCachedAnalyses(): Promise<void> {
    try {
      if (chrome?.storage?.local) {
        const cacheArray = Array.from(this.cachedAnalyses.entries());
        await chrome.storage.local.set({
          offlineAnalysisCache: JSON.stringify(cacheArray),
        });
      }
    } catch (error) {
      console.warn('Failed to save cached analyses:', error);
    }
  }

  clearCache(): void {
    this.cachedAnalyses.clear();
    if (chrome?.storage?.local) {
      chrome.storage.local.remove(['offlineAnalysisCache']);
    }
  }

  getCacheStats() {
    const now = Date.now();
    const validCaches = Array.from(this.cachedAnalyses.values()).filter(
      cached => now - cached.timestamp <= this.config.cacheMaxAge
    );

    return {
      totalCached: this.cachedAnalyses.size,
      validCached: validCaches.length,
      oldestCache:
        validCaches.length > 0
          ? Math.min(...validCaches.map(c => c.timestamp))
          : null,
      newestCache:
        validCaches.length > 0
          ? Math.max(...validCaches.map(c => c.timestamp))
          : null,
    };
  }
}
