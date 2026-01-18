import { PrivacyPredictor } from './privacy-predictor';
import { StorageManager } from './storage-manager';
import type { TrackingEvent } from './types';

export interface SiteIntelligence {
  domain: string;
  category: string;
  trustScore: number;
  riskProfile: RiskProfile;
  trackingPatterns: TrackingPattern[];
  userInteractions: UserInteraction[];
  lastAnalyzed: number;
  confidence: number;
}

export interface RiskProfile {
  advertisingRisk: number;
  analyticsRisk: number;
  socialRisk: number;
  fingerprintingRisk: number;
  dataCollectionRisk: number;
  overallRisk: number;
}

export interface TrackingPattern {
  type: 'persistent' | 'aggressive' | 'cross-site' | 'fingerprinting';
  frequency: number;
  severity: number;
  description: string;
  firstSeen: number;
  lastSeen: number;
}

export interface UserInteraction {
  type: 'visit' | 'click' | 'form' | 'purchase' | 'signup';
  timestamp: number;
  privacyScore: number;
  trackersDetected: number;
  userReaction: 'positive' | 'negative' | 'neutral';
}

export interface SiteComparison {
  targetSite: string;
  similarSites: SimilarSite[];
  categoryAverage: number;
  userAverage: number;
  industryRanking: number;
}

export interface SimilarSite {
  domain: string;
  similarity: number;
  privacyScore: number;
  category: string;
}

export class SiteIntelligenceAnalyzer {
  private static intelligenceCache = new Map<string, SiteIntelligence>();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  static async analyzeSite(domain: string): Promise<SiteIntelligence> {
    // Check cache first
    const cached = this.getCachedIntelligence(domain);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    try {
      // Gather site data
      const userHistory = await this.getUserSiteHistory(domain);
      const trackingPatterns = await this.analyzeTrackingPatterns(domain, userHistory);
      const riskProfile = await this.calculateRiskProfile(domain, trackingPatterns);
      const category = await this.categorizeSite();
      const trustScore = await this.calculateTrustScore(userHistory, riskProfile);

      const intelligence: SiteIntelligence = {
        domain,
        category,
        trustScore,
        riskProfile,
        trackingPatterns,
        userInteractions: this.extractUserInteractions(userHistory),
        lastAnalyzed: Date.now(),
        confidence: this.calculateAnalysisConfidence(userHistory.length, trackingPatterns.length)
      };

      // Cache the result
      this.cacheIntelligence(domain, intelligence);
      
      return intelligence;
    } catch (error) {
      console.error('Failed to analyze site intelligence:', error);
      
      // Return minimal intelligence
      return {
        domain,
        category: 'unknown',
        trustScore: 50,
        riskProfile: this.getDefaultRiskProfile(),
        trackingPatterns: [],
        userInteractions: [],
        lastAnalyzed: Date.now(),
        confidence: 0.1
      };
    }
  }

  static async compareSites(targetDomain: string, comparisonDomains: string[]): Promise<SiteComparison> {
    const targetIntelligence = await this.analyzeSite(targetDomain);
    const similarSites: SimilarSite[] = [];

    for (const domain of comparisonDomains) {
      const intelligence = await this.analyzeSite(domain);
      const similarity = this.calculateSiteSimilarity(targetIntelligence, intelligence);
      
      if (similarity > 0.3) { // Only include reasonably similar sites
        similarSites.push({
          domain,
          similarity,
          privacyScore: intelligence.trustScore,
          category: intelligence.category
        });
      }
    }

    // Sort by similarity
    similarSites.sort((a, b) => b.similarity - a.similarity);

    // Calculate averages
    const categoryAverage = await this.getCategoryAverage(targetIntelligence.category);
    const userAverage = await this.getUserAverage();
    const industryRanking = this.calculateIndustryRanking(targetIntelligence.trustScore, categoryAverage);

    return {
      targetSite: targetDomain,
      similarSites: similarSites.slice(0, 10), // Top 10 similar sites
      categoryAverage,
      userAverage,
      industryRanking
    };
  }

  static async getPrivacyTrends(domain: string, days: number = 30): Promise<PrivacyTrend[]> {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const events = await StorageManager.getRecentEvents(1000);
    
    const domainEvents = events
      .filter(event => event.domain === domain && event.timestamp > cutoffDate)
      .sort((a, b) => a.timestamp - b.timestamp);

    const trends: PrivacyTrend[] = [];
    const dailyGroups = this.groupEventsByDay(domainEvents);

    for (const [date, dayEvents] of dailyGroups) {
      const avgScore = dayEvents.reduce((sum, event) => sum + (event.privacyScore || 70), 0) / dayEvents.length;
      const trackerCount = dayEvents.length;
      const uniqueTrackers = new Set(dayEvents.map(event => event.trackerType)).size;

      trends.push({
        date,
        privacyScore: Math.round(avgScore),
        trackerCount,
        uniqueTrackers,
        riskLevel: this.scoreToRiskLevel(avgScore)
      });
    }

    return trends;
  }

  static async predictSiteBehavior(domain: string): Promise<SiteBehaviorPrediction> {
    const intelligence = await this.analyzeSite(domain);
    const prediction = await PrivacyPredictor.predictPrivacyImpact(`https://${domain}`);
    
    // Analyze behavior patterns
    const behaviorPatterns = this.analyzeBehaviorPatterns(intelligence);
    const futureRisk = this.predictFutureRisk(intelligence, behaviorPatterns);
    
    return {
      domain,
      currentTrustScore: intelligence.trustScore,
      predictedTrustScore: prediction.predictedScore,
      behaviorPatterns,
      futureRisk,
      recommendations: await this.generateBehaviorRecommendations(intelligence, futureRisk),
      confidence: Math.min(intelligence.confidence, prediction.confidence)
    };
  }

  private static async getUserSiteHistory(domain: string): Promise<TrackingEvent[]> {
    try {
      const recentEvents = await StorageManager.getRecentEvents(1000);
      return recentEvents.filter(event => event.domain === domain);
    } catch {
      return [];
    }
  }

  private static async analyzeTrackingPatterns(_domain: string, events: TrackingEvent[]): Promise<TrackingPattern[]> {
    const patterns: TrackingPattern[] = [];
    
    if (events.length === 0) return patterns;

    // Analyze tracking frequency
    const trackerTypes = new Map<string, TrackingEvent[]>();
    events.forEach(event => {
      const type = event.trackerType;
      if (!trackerTypes.has(type)) {
        trackerTypes.set(type, []);
      }
      trackerTypes.get(type)!.push(event);
    });

    // Identify patterns
    for (const [type, typeEvents] of trackerTypes) {
      const frequency = typeEvents.length;
      const avgSeverity = typeEvents.reduce((sum, e) => sum + this.riskLevelToNumber(e.riskLevel), 0) / typeEvents.length;

      if (frequency > 5) { // Persistent tracking
        patterns.push({
          type: 'persistent',
          frequency,
          severity: avgSeverity,
          description: `${type} tracking detected ${frequency} times`,
          firstSeen: Math.min(...typeEvents.map(e => e.timestamp)),
          lastSeen: Math.max(...typeEvents.map(e => e.timestamp))
        });
      }

      if (avgSeverity > 0.7) { // Aggressive tracking
        patterns.push({
          type: 'aggressive',
          frequency,
          severity: avgSeverity,
          description: `High-risk ${type} tracking detected`,
          firstSeen: Math.min(...typeEvents.map(e => e.timestamp)),
          lastSeen: Math.max(...typeEvents.map(e => e.timestamp))
        });
      }
    }

    return patterns;
  }

  private static async calculateRiskProfile(_domain: string, patterns: TrackingPattern[]): Promise<RiskProfile> {
    let advertisingRisk = 0;
    let analyticsRisk = 0;
    let socialRisk = 0;
    let fingerprintingRisk = 0;
    let dataCollectionRisk = 0;

    // Calculate risks based on patterns
    patterns.forEach(pattern => {
      const riskContribution = pattern.severity * (pattern.frequency / 10);
      
      if (pattern.description.includes('advertising')) {
        advertisingRisk += riskContribution;
      } else if (pattern.description.includes('analytics')) {
        analyticsRisk += riskContribution;
      } else if (pattern.description.includes('social')) {
        socialRisk += riskContribution;
      } else if (pattern.description.includes('fingerprinting')) {
        fingerprintingRisk += riskContribution;
      }
      
      dataCollectionRisk += riskContribution * 0.5;
    });

    // Normalize risks (0-1 scale)
    advertisingRisk = Math.min(1, advertisingRisk);
    analyticsRisk = Math.min(1, analyticsRisk);
    socialRisk = Math.min(1, socialRisk);
    fingerprintingRisk = Math.min(1, fingerprintingRisk);
    dataCollectionRisk = Math.min(1, dataCollectionRisk);

    const overallRisk = (advertisingRisk + analyticsRisk + socialRisk + fingerprintingRisk + dataCollectionRisk) / 5;

    return {
      advertisingRisk,
      analyticsRisk,
      socialRisk,
      fingerprintingRisk,
      dataCollectionRisk,
      overallRisk
    };
  }

  private static async categorizeSite(): Promise<string> {
    // Simple categorization logic - would need domain parameter in real implementation
    // For now, return a default category
    return 'general';
  }

  private static async calculateTrustScore(history: TrackingEvent[], riskProfile: RiskProfile): Promise<number> {
    let baseScore = 70; // Neutral starting point

    // Adjust based on risk profile
    baseScore -= riskProfile.overallRisk * 30;

    // Adjust based on user history
    if (history.length > 0) {
      const avgHistoryScore = history.reduce((sum, event) => sum + (event.privacyScore || 70), 0) / history.length;
      baseScore = (baseScore + avgHistoryScore) / 2;
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  private static extractUserInteractions(events: TrackingEvent[]): UserInteraction[] {
    return events.map(event => ({
      type: 'visit',
      timestamp: event.timestamp,
      privacyScore: event.privacyScore || 70,
      trackersDetected: 1,
      userReaction: event.privacyScore && event.privacyScore < 50 ? 'negative' : 'neutral'
    }));
  }

  private static calculateAnalysisConfidence(historyLength: number, patternsLength: number): number {
    let confidence = 0.3; // Base confidence

    // More history = higher confidence
    confidence += Math.min(0.4, historyLength * 0.05);
    
    // More patterns = higher confidence
    confidence += Math.min(0.3, patternsLength * 0.1);

    return Math.min(0.95, confidence);
  }

  private static getCachedIntelligence(domain: string): SiteIntelligence | null {
    return this.intelligenceCache.get(domain) || null;
  }

  private static isCacheValid(intelligence: SiteIntelligence): boolean {
    return Date.now() - intelligence.lastAnalyzed < this.CACHE_TTL;
  }

  private static cacheIntelligence(domain: string, intelligence: SiteIntelligence): void {
    this.intelligenceCache.set(domain, intelligence);
  }

  private static getDefaultRiskProfile(): RiskProfile {
    return {
      advertisingRisk: 0.5,
      analyticsRisk: 0.3,
      socialRisk: 0.2,
      fingerprintingRisk: 0.1,
      dataCollectionRisk: 0.4,
      overallRisk: 0.3
    };
  }

  private static calculateSiteSimilarity(site1: SiteIntelligence, site2: SiteIntelligence): number {
    let similarity = 0;

    // Category similarity
    if (site1.category === site2.category) similarity += 0.3;

    // Trust score similarity
    const scoreDiff = Math.abs(site1.trustScore - site2.trustScore);
    similarity += Math.max(0, (100 - scoreDiff) / 100) * 0.4;

    // Risk profile similarity
    const riskSimilarity = 1 - Math.abs(site1.riskProfile.overallRisk - site2.riskProfile.overallRisk);
    similarity += riskSimilarity * 0.3;

    return Math.min(1, similarity);
  }

  private static async getCategoryAverage(category: string): Promise<number> {
    // This would typically query a database of category averages
    const categoryAverages: Record<string, number> = {
      'ecommerce': 68,
      'news': 72,
      'social': 45,
      'entertainment': 58,
      'finance': 78,
      'health': 75,
      'government': 88,
      'education': 82,
      'general': 70
    };

    return categoryAverages[category] || 70;
  }

  private static async getUserAverage(): Promise<number> {
    try {
      const recentEvents = await StorageManager.getRecentEvents(200);
      if (recentEvents.length === 0) return 70;

      const avgScore = recentEvents.reduce((sum, event) => sum + (event.privacyScore || 70), 0) / recentEvents.length;
      return Math.round(avgScore);
    } catch {
      return 70;
    }
  }

  private static calculateIndustryRanking(trustScore: number, categoryAverage: number): number {
    const percentile = (trustScore / categoryAverage) * 50;
    return Math.max(1, Math.min(100, Math.round(percentile)));
  }

  private static groupEventsByDay(events: TrackingEvent[]): Map<string, TrackingEvent[]> {
    const groups = new Map<string, TrackingEvent[]>();

    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(event);
    });

    return groups;
  }

  private static scoreToRiskLevel(score: number): string {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  private static riskLevelToNumber(riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return 0.2;
      case 'medium': return 0.5;
      case 'high': return 0.8;
      case 'critical': return 1.0;
      default: return 0.5;
    }
  }

  private static analyzeBehaviorPatterns(intelligence: SiteIntelligence): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    // Analyze tracking consistency
    if (intelligence.trackingPatterns.some(p => p.type === 'persistent')) {
      patterns.push({
        type: 'consistent-tracking',
        strength: 0.8,
        description: 'Site consistently tracks users across visits'
      });
    }

    // Analyze risk escalation
    if (intelligence.riskProfile.overallRisk > 0.7) {
      patterns.push({
        type: 'high-risk-behavior',
        strength: intelligence.riskProfile.overallRisk,
        description: 'Site exhibits high-risk privacy behaviors'
      });
    }

    return patterns;
  }

  private static predictFutureRisk(intelligence: SiteIntelligence, patterns: BehaviorPattern[]): FutureRisk {
    let riskTrend = 0;

    patterns.forEach(pattern => {
      if (pattern.type === 'consistent-tracking') riskTrend += 0.1;
      if (pattern.type === 'high-risk-behavior') riskTrend += 0.2;
    });

    const futureScore = Math.max(0, Math.min(100, intelligence.trustScore - (riskTrend * 20)));

    return {
      predictedScore: Math.round(futureScore),
      riskTrend: riskTrend > 0.1 ? 'increasing' : 'stable',
      timeframe: '30 days',
      confidence: intelligence.confidence * 0.8
    };
  }

  private static async generateBehaviorRecommendations(intelligence: SiteIntelligence, futureRisk: FutureRisk): Promise<string[]> {
    const recommendations: string[] = [];

    if (futureRisk.riskTrend === 'increasing') {
      recommendations.push('Monitor this site closely for privacy changes');
      recommendations.push('Consider using enhanced privacy protection');
    }

    if (intelligence.riskProfile.advertisingRisk > 0.7) {
      recommendations.push('Use ad blocker when visiting this site');
    }

    if (intelligence.riskProfile.fingerprintingRisk > 0.6) {
      recommendations.push('Enable fingerprinting protection');
    }

    if (recommendations.length === 0) {
      recommendations.push('Site appears to have stable privacy practices');
    }

    return recommendations;
  }
}

// Additional interfaces for the module
interface PrivacyTrend {
  date: string;
  privacyScore: number;
  trackerCount: number;
  uniqueTrackers: number;
  riskLevel: string;
}

interface SiteBehaviorPrediction {
  domain: string;
  currentTrustScore: number;
  predictedTrustScore: number;
  behaviorPatterns: BehaviorPattern[];
  futureRisk: FutureRisk;
  recommendations: string[];
  confidence: number;
}

interface BehaviorPattern {
  type: 'consistent-tracking' | 'high-risk-behavior' | 'privacy-friendly' | 'data-collection';
  strength: number;
  description: string;
}

interface FutureRisk {
  predictedScore: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  timeframe: string;
  confidence: number;
}
