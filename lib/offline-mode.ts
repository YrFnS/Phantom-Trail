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
      cacheMaxAge: 24 * 60 * 60 * 1000,
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
    const cachedResult = await this.findSimilarAnalysis(events);
    if (cachedResult) {
      return this.adaptCachedAnalysis(cachedResult, events);
    }

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
      events: events.slice(),
    };

    this.cachedAnalyses.set(cacheKey, cachedAnalysis);

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
    const intersection = new Set([...domains1].filter(d => domains2.has(d)));
    const union = new Set([...domains1, ...domains2]);
    const domainSimilarity = union.size > 0 ? intersection.size / union.size : 1;
    const riskSimilarity = this.calculateRiskSimilarity(risks1, risks2);

    return domainSimilarity * 0.7 + riskSimilarity * 0.3;
  }

  private calculateRiskSimilarity(risks1: string[], risks2: string[]): number {
    if (risks1.length === 0 && risks2.length === 0) return 1;
    if (risks1.length === 0 || risks2.length === 0) return 0;

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

    return 1 - Math.abs(avg1 - avg2) / 4;
  }

  private adaptCachedAnalysis(
    cached: CachedAnalysis,
    currentEvents: TrackingEvent[]
  ): AIAnalysis {
    const adaptedNarrative = cached.narrative.replace(
      /\d+ (?:trackers?|signals?)/g,
      `${currentEvents.length} recorded signal${
        currentEvents.length === 1 ? '' : 's'
      }`
    );

    return {
      narrative: `${adaptedNarrative} (cached heuristic summary)`,
      riskAssessment: cached.riskAssessment,
      recommendations: cached.recommendations,
      confidence: cached.confidence * 0.8,
    };
  }

  private generateRuleBasedAnalysis(events: TrackingEvent[]): AIAnalysis {
    const highRiskEvents = events.filter(
      e => e.riskLevel === 'critical' || e.riskLevel === 'high'
    );
    const criticalEvents = events.filter(e => e.riskLevel === 'critical');
    const mediumRiskEvents = events.filter(e => e.riskLevel === 'medium');

    let narrative = 'Offline heuristic summary: ';
    let riskAssessment: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (events.length === 0) {
      narrative += 'No recorded signals are available to summarize.';
    } else if (highRiskEvents.length === 0 && mediumRiskEvents.length === 0) {
      narrative += 'No medium, high, or critical-risk signals were recorded.';
    } else if (highRiskEvents.length === 0) {
      narrative += `${mediumRiskEvents.length} medium-risk signal${
        mediumRiskEvents.length === 1 ? '' : 's'
      } recorded.`;
      riskAssessment = 'medium';
      recommendations.push('Review unexpected signals and their evidence');
    } else if (criticalEvents.length > 0) {
      narrative += `${highRiskEvents.length} high or critical-risk signal${
        highRiskEvents.length === 1 ? '' : 's'
      } recorded, including ${criticalEvents.length} classified as critical.`;
      riskAssessment = 'critical';
      recommendations.push(
        'Review the underlying evidence before entering sensitive information'
      );
      recommendations.push(
        'Consider appropriate browser privacy controls after confirming the signal'
      );
    } else {
      narrative += `${highRiskEvents.length} high-risk signal${
        highRiskEvents.length === 1 ? '' : 's'
      } recorded.`;
      riskAssessment = 'high';
      recommendations.push('Review the recorded evidence for false positives');
      recommendations.push('Consider browser privacy controls where appropriate');
    }

    const uniqueDomains = new Set(events.map(e => e.domain));
    if (uniqueDomains.size > 5) {
      recommendations.push(
        'Signals reference several domains; this does not by itself prove cross-site data sharing'
      );
    }

    return {
      narrative,
      riskAssessment,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['Continue collecting evidence before drawing conclusions'],
      confidence: 0.5,
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
