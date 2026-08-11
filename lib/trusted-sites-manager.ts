import { BaseStorage } from './storage/base-storage';

/**
 * Legacy values retained for storage compatibility.
 *
 * In version 0.1.0 these values are personal annotation metadata only. They do
 * not change detector behavior or scores.
 */
export enum TrustLevel {
  FULL_TRUST = 'full',
  PARTIAL_TRUST = 'partial',
  CONDITIONAL = 'conditional',
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

/**
 * Stores user-created site annotations.
 *
 * The historical class name is preserved to avoid breaking imports. A personal
 * annotation is not evidence that a site is safe, private, or trustworthy.
 */
export class TrustedSitesManager {
  private static readonly STORAGE_KEY = 'trustedSites';

  static async addTrustedSite(
    domain: string,
    trustLevel: TrustLevel = TrustLevel.PARTIAL_TRUST,
    reason?: string
  ): Promise<void> {
    const normalizedDomain = domain.trim().toLowerCase();
    if (!normalizedDomain) {
      throw new Error('A domain is required');
    }

    const data = await this.getTrustedSitesData();
    data.sites[normalizedDomain] = {
      domain: normalizedDomain,
      trustLevel,
      dateAdded: Date.now(),
      reason,
      lastVerified: Date.now(),
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

  static async updateTrustLevel(
    domain: string,
    level: TrustLevel
  ): Promise<void> {
    const data = await this.getTrustedSitesData();
    const site = data.sites[domain];
    if (!site) return;

    site.trustLevel = level;
    site.lastVerified = Date.now();
    await BaseStorage.set(this.STORAGE_KEY, data);
  }

  /**
   * Personal annotations must not change an evidence-derived score.
   */
  static async adjustScoreForTrust(
    baseScore: number,
    domain: string
  ): Promise<number> {
    void domain;
    return baseScore;
  }

  /**
   * Personal annotations must not suppress detector output.
   */
  static async shouldMonitorTracker(
    domain: string,
    trackerRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<boolean> {
    void domain;
    void trackerRiskLevel;
    return true;
  }

  private static async getTrustedSitesData(): Promise<TrustedSitesStorage> {
    const data = await BaseStorage.get<TrustedSitesStorage>(this.STORAGE_KEY);
    if (data) return data;

    const defaultData: TrustedSitesStorage = {
      sites: {},
      settings: {
        autoSuggestTrust: false,
        verificationInterval: 30,
        defaultTrustLevel: TrustLevel.PARTIAL_TRUST,
        inheritSubdomains: false,
      },
      suggestions: [],
    };
    await BaseStorage.set(this.STORAGE_KEY, defaultData);
    return defaultData;
  }

  /**
   * Automatic safety/reputation suggestions are disabled until a documented and
   * validated source exists.
   */
  static async generateTrustSuggestions(
    domain: string
  ): Promise<TrustSuggestion[]> {
    void domain;
    return [];
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
