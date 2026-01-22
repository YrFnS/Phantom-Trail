import { BaseStorage } from './storage/base-storage';

export enum TrustLevel {
  FULL_TRUST = 'full',      // No monitoring, always green score
  PARTIAL_TRUST = 'partial', // Reduced monitoring, adjusted scoring
  CONDITIONAL = 'conditional' // Trust with specific conditions
}

export interface TrustCondition {
  type: 'max_trackers' | 'allowed_types' | 'time_limit';
  value: string | number | boolean;
  description: string;
}

export interface TrustedSite {
  domain: string;
  trustLevel: TrustLevel;
  dateAdded: number;
  reason?: string;
  conditions?: TrustCondition[];
  lastVerified?: number;
}

export interface TrustSuggestion {
  type: 'frequent_safe' | 'reputable' | 'user_pattern';
  confidence: number;
  reason: string;
  domain: string;
}

export interface TrustedSitesStorage {
  sites: Record<string, TrustedSite>;
  settings: {
    autoSuggestTrust: boolean;
    verificationInterval: number;
    defaultTrustLevel: TrustLevel;
    inheritSubdomains: boolean;
  };
  suggestions: TrustSuggestion[];
}

export class TrustedSitesManager {
  private static readonly STORAGE_KEY = 'trustedSites';

  static async addTrustedSite(domain: string, trustLevel: TrustLevel = TrustLevel.PARTIAL_TRUST, reason?: string): Promise<void> {
    const data = await this.getTrustedSitesData();
    
    data.sites[domain] = {
      domain,
      trustLevel,
      dateAdded: Date.now(),
      reason,
      lastVerified: Date.now()
    };

    await BaseStorage.set(this.STORAGE_KEY, data);
  }

  static async removeTrustedSite(domain: string): Promise<void> {
    const data = await this.getTrustedSitesData();
    delete data.sites[domain];
    await BaseStorage.set(this.STORAGE_KEY, data);
  }

  static async isTrustedSite(domain: string): Promise<boolean> {
    const data = await this.getTrustedSitesData();
    return domain in data.sites;
  }

  static async getTrustedSite(domain: string): Promise<TrustedSite | null> {
    const data = await this.getTrustedSitesData();
    return data.sites[domain] || null;
  }

  static async getTrustedSites(): Promise<TrustedSite[]> {
    const data = await this.getTrustedSitesData();
    return Object.values(data.sites);
  }

  static async updateTrustLevel(domain: string, level: TrustLevel): Promise<void> {
    const data = await this.getTrustedSitesData();
    if (data.sites[domain]) {
      data.sites[domain].trustLevel = level;
      data.sites[domain].lastVerified = Date.now();
      await BaseStorage.set(this.STORAGE_KEY, data);
    }
  }

  static async adjustScoreForTrust(baseScore: number, domain: string): Promise<number> {
    const trustedSite = await this.getTrustedSite(domain);
    if (!trustedSite) return baseScore;

    switch (trustedSite.trustLevel) {
      case TrustLevel.FULL_TRUST:
        return Math.max(baseScore, 85); // Minimum B+ score
      case TrustLevel.PARTIAL_TRUST:
        return Math.min(baseScore + 15, 100); // Boost score by 15 points
      case TrustLevel.CONDITIONAL:
        return this.evaluateConditions(baseScore, trustedSite);
      default:
        return baseScore;
    }
  }

  static async shouldMonitorTracker(domain: string, trackerRiskLevel: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean> {
    const trustedSite = await this.getTrustedSite(domain);
    if (!trustedSite) return true;

    switch (trustedSite.trustLevel) {
      case TrustLevel.FULL_TRUST:
        return false; // Skip all monitoring
      case TrustLevel.PARTIAL_TRUST:
        return trackerRiskLevel === 'critical'; // Only monitor critical risks
      case TrustLevel.CONDITIONAL:
        return this.shouldMonitorWithConditions(trustedSite, trackerRiskLevel);
      default:
        return true;
    }
  }

  private static evaluateConditions(baseScore: number, trustedSite: TrustedSite): number {
    if (!trustedSite.conditions) return baseScore;
    
    // Simple condition evaluation - can be expanded
    let adjustedScore = baseScore;
    for (const condition of trustedSite.conditions) {
      if (condition.type === 'max_trackers') {
        adjustedScore += 5; // Small boost for conditional trust
      }
    }
    return Math.min(adjustedScore, 100);
  }

  private static shouldMonitorWithConditions(trustedSite: TrustedSite, riskLevel: string): boolean {
    if (!trustedSite.conditions) return true;
    
    // Check conditions - if any condition suggests monitoring, do it
    for (const condition of trustedSite.conditions) {
      if (condition.type === 'allowed_types' && riskLevel === 'critical') {
        return true;
      }
    }
    return false;
  }

  private static async getTrustedSitesData(): Promise<TrustedSitesStorage> {
    const data = await BaseStorage.get<TrustedSitesStorage>(this.STORAGE_KEY);
    
    if (!data) {
      const defaultData: TrustedSitesStorage = {
        sites: {},
        settings: {
          autoSuggestTrust: true,
          verificationInterval: 30, // days
          defaultTrustLevel: TrustLevel.PARTIAL_TRUST,
          inheritSubdomains: true
        },
        suggestions: []
      };
      await BaseStorage.set(this.STORAGE_KEY, defaultData);
      return defaultData;
    }
    
    return data;
  }

  static async generateTrustSuggestions(domain: string): Promise<TrustSuggestion[]> {
    const suggestions: TrustSuggestion[] = [];
    
    // Check if it's a reputable domain
    if (this.isReputableDomain(domain)) {
      suggestions.push({
        type: 'reputable',
        confidence: 0.9,
        reason: 'This is a well-known, reputable website',
        domain
      });
    }
    
    return suggestions;
  }

  private static isReputableDomain(domain: string): boolean {
    const reputableDomains = [
      'github.com', 'stackoverflow.com', 'wikipedia.org',
      'google.com', 'microsoft.com', 'apple.com',
      'amazon.com', 'netflix.com', 'spotify.com'
    ];
    
    return reputableDomains.some(reputable => 
      domain === reputable || domain.endsWith(`.${reputable}`)
    );
  }

  static async addTrustSuggestion(suggestion: TrustSuggestion): Promise<void> {
    const data = await this.getTrustedSitesData();
    data.suggestions.push(suggestion);
    await BaseStorage.set(this.STORAGE_KEY, data);
  }

  static async getTrustSuggestions(): Promise<TrustSuggestion[]> {
    const data = await this.getTrustedSitesData();
    return data.suggestions;
  }

  static async clearTrustSuggestions(): Promise<void> {
    const data = await this.getTrustedSitesData();
    data.suggestions = [];
    await BaseStorage.set(this.STORAGE_KEY, data);
  }
}
