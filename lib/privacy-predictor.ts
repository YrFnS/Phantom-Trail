import { StorageManager } from './storage-manager';
import { TrackerDatabase } from './tracker-db';
import type { TrackingEvent, RiskLevel, TrackerType } from './types';

export interface PrivacyPrediction {
  url: string;
  predictedScore: number;
  predictedGrade: string;
  confidence: number; // 0-1
  riskFactors: RiskFactor[];
  expectedTrackers: PredictedTracker[];
  recommendations: string[];
  comparisonToAverage: number;
  timestamp: number;
}

export interface RiskFactor {
  type: 'domain-reputation' | 'category-risk' | 'tracker-patterns' | 'user-history';
  impact: number; // -50 to +50 points
  description: string;
  confidence: number;
}

export interface PredictedTracker {
  domain: string;
  type: TrackerType;
  probability: number; // 0-1
  riskLevel: RiskLevel;
}

export interface LinkAnalysis {
  url: string;
  prediction: PrivacyPrediction;
  context: PageContext;
  shouldWarn: boolean;
  displayText: string;
}

export interface PageContext {
  referrer: string;
  currentDomain: string;
  linkText: string;
  linkPosition: 'header' | 'content' | 'footer' | 'sidebar';
  isExternal: boolean;
}

interface DomainPattern {
  domain: string;
  averageScore: number;
  commonTrackers: string[];
  riskProfile: RiskProfile;
  confidence: number;
  lastUpdated: number;
  visitCount: number;
}

interface RiskProfile {
  advertisingRisk: number;
  analyticsRisk: number;
  socialRisk: number;
  fingerprintingRisk: number;
  overallRisk: number;
}

interface CategoryBaseline {
  category: string;
  averageScore: number;
  commonTrackers: TrackerType[];
  riskLevel: RiskLevel;
  confidence: number;
  sampleSize: number;
}

interface DomainFeatures {
  tld: string;
  subdomains: number;
  length: number;
  hasNumbers: boolean;
  hasHyphens: boolean;
  isKnownCDN: boolean;
  registrationAge?: number;
}

const CATEGORY_BASELINES: Record<string, CategoryBaseline> = {
  'news': {
    category: 'news',
    averageScore: 72,
    commonTrackers: ['analytics', 'advertising', 'social'],
    riskLevel: 'medium',
    confidence: 0.8,
    sampleSize: 150
  },
  'ecommerce': {
    category: 'ecommerce',
    averageScore: 68,
    commonTrackers: ['analytics', 'advertising', 'fingerprinting'],
    riskLevel: 'medium',
    confidence: 0.85,
    sampleSize: 200
  },
  'social': {
    category: 'social',
    averageScore: 45,
    commonTrackers: ['analytics', 'advertising', 'social', 'fingerprinting'],
    riskLevel: 'high',
    confidence: 0.9,
    sampleSize: 100
  },
  'search': {
    category: 'search',
    averageScore: 78,
    commonTrackers: ['analytics', 'advertising'],
    riskLevel: 'medium',
    confidence: 0.75,
    sampleSize: 50
  },
  'government': {
    category: 'government',
    averageScore: 88,
    commonTrackers: ['analytics'],
    riskLevel: 'low',
    confidence: 0.7,
    sampleSize: 80
  },
  'education': {
    category: 'education',
    averageScore: 82,
    commonTrackers: ['analytics', 'social'],
    riskLevel: 'low',
    confidence: 0.75,
    sampleSize: 120
  },
  'entertainment': {
    category: 'entertainment',
    averageScore: 58,
    commonTrackers: ['analytics', 'advertising', 'social'],
    riskLevel: 'high',
    confidence: 0.8,
    sampleSize: 180
  }
};

export class PrivacyPredictor {
  private static predictionCache = new Map<string, PrivacyPrediction>();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CACHE_SIZE = 1000;

  static async predictPrivacyImpact(url: string): Promise<PrivacyPrediction> {
    // Check cache first
    const cached = this.getCachedPrediction(url);
    if (cached) return cached;

    try {
      const domain = new URL(url).hostname;
      
      // Gather prediction factors
      const domainReputation = await this.analyzeDomainReputation(domain);
      const categoryPrediction = await this.predictByCategory(url);
      const userBehavior = await this.analyzeUserBehavior(url);
      const trackerPatterns = await this.analyzeTrackerPatterns(domain);

      // Calculate weighted prediction
      const prediction = this.calculateWeightedPrediction({
        domainReputation,
        categoryPrediction,
        userBehavior,
        trackerPatterns
      });

      // Generate recommendations
      const recommendations = await this.generateRecommendations(prediction);

      const result: PrivacyPrediction = {
        url,
        predictedScore: prediction.score,
        predictedGrade: this.scoreToGrade(prediction.score),
        confidence: prediction.confidence,
        riskFactors: prediction.riskFactors,
        expectedTrackers: prediction.expectedTrackers,
        recommendations,
        comparisonToAverage: prediction.comparisonToAverage,
        timestamp: Date.now()
      };

      // Cache the result
      this.cachePrediction(url, result);
      
      return result;
    } catch (error) {
      console.error('Failed to predict privacy impact:', error);
      
      // Return fallback prediction
      return {
        url,
        predictedScore: 70,
        predictedGrade: 'C',
        confidence: 0.3,
        riskFactors: [{
          type: 'domain-reputation',
          impact: 0,
          description: 'Unable to analyze - limited data available',
          confidence: 0.3
        }],
        expectedTrackers: [],
        recommendations: ['Exercise caution when browsing'],
        comparisonToAverage: 0,
        timestamp: Date.now()
      };
    }
  }

  static async analyzeLink(url: string, context: PageContext): Promise<LinkAnalysis> {
    const prediction = await this.predictPrivacyImpact(url);
    
    const shouldWarn = prediction.predictedScore < 60 || 
                      prediction.riskFactors.some(rf => rf.impact < -20);
    
    const displayText = this.generateDisplayText(prediction);

    return {
      url,
      prediction,
      context,
      shouldWarn,
      displayText
    };
  }

  private static async analyzeDomainReputation(domain: string): Promise<any> {
    // Check if domain is in tracker databases
    const trackerInfo = TrackerDatabase.classifyUrl(`https://${domain}`);
    let reputationScore = 80; // Default neutral score
    let confidence = 0.5;

    if (trackerInfo) {
      // Known tracker domain
      reputationScore = this.trackerRiskToScore(trackerInfo.riskLevel);
      confidence = 0.9;
    }

    // Check user's historical data
    const userHistory = await this.getUserDomainHistory(domain);
    if (userHistory.length > 0) {
      const avgUserScore = userHistory.reduce((sum, event) => sum + (event.privacyScore || 70), 0) / userHistory.length;
      reputationScore = (reputationScore + avgUserScore) / 2;
      confidence = Math.min(0.95, confidence + 0.2);
    }

    // Analyze domain features
    const features = this.extractDomainFeatures(domain);
    const featureAdjustment = this.calculateFeatureAdjustment(features);
    
    return {
      score: Math.max(0, Math.min(100, reputationScore + featureAdjustment)),
      confidence,
      features,
      trackerInfo
    };
  }

  private static async predictByCategory(url: string): Promise<any> {
    const category = this.categorizeWebsite(url);
    const baseline = CATEGORY_BASELINES[category] || CATEGORY_BASELINES['news'];
    
    // Adjust baseline based on domain characteristics
    const domain = new URL(url).hostname;
    const domainAdjustment = this.calculateDomainAdjustment(domain);
    
    return {
      score: Math.max(0, Math.min(100, baseline.averageScore + domainAdjustment)),
      confidence: baseline.confidence,
      category,
      baseline,
      expectedTrackers: baseline.commonTrackers
    };
  }

  private static async analyzeUserBehavior(url: string): Promise<any> {
    try {
      const recentEvents = await StorageManager.getRecentEvents(200);
      const domain = new URL(url).hostname;
      
      // Find similar domains user has visited
      const similarDomains = this.findSimilarDomains(domain, recentEvents);
      
      if (similarDomains.length === 0) {
        return {
          score: 70, // Neutral score for unknown patterns
          confidence: 0.3,
          similarDomains: []
        };
      }

      // Calculate average score from similar domains
      const avgScore = similarDomains.reduce((sum, event) => {
        return sum + (event.privacyScore || 70);
      }, 0) / similarDomains.length;

      return {
        score: avgScore,
        confidence: Math.min(0.8, similarDomains.length * 0.1),
        similarDomains: similarDomains.slice(0, 5)
      };
    } catch {
      return {
        score: 70,
        confidence: 0.3,
        similarDomains: []
      };
    }
  }

  private static async analyzeTrackerPatterns(domain: string): Promise<any> {
    // Analyze common tracker patterns
    const patterns = {
      hasAnalytics: this.hasAnalyticsPattern(domain),
      hasAdvertising: this.hasAdvertisingPattern(domain),
      hasSocial: this.hasSocialPattern(domain),
      hasFingerprinting: this.hasFingerprintingPattern(domain)
    };

    let riskScore = 80; // Start neutral
    const expectedTrackers: PredictedTracker[] = [];

    if (patterns.hasAnalytics) {
      riskScore -= 5;
      expectedTrackers.push({
        domain: 'google-analytics.com',
        type: 'analytics',
        probability: 0.8,
        riskLevel: 'low'
      });
    }

    if (patterns.hasAdvertising) {
      riskScore -= 15;
      expectedTrackers.push({
        domain: 'doubleclick.net',
        type: 'advertising',
        probability: 0.7,
        riskLevel: 'medium'
      });
    }

    if (patterns.hasSocial) {
      riskScore -= 10;
      expectedTrackers.push({
        domain: 'facebook.com',
        type: 'social',
        probability: 0.6,
        riskLevel: 'medium'
      });
    }

    if (patterns.hasFingerprinting) {
      riskScore -= 20;
      expectedTrackers.push({
        domain: 'fingerprinting-service.com',
        type: 'fingerprinting',
        probability: 0.5,
        riskLevel: 'high'
      });
    }

    return {
      score: Math.max(0, riskScore),
      confidence: 0.6,
      patterns,
      expectedTrackers
    };
  }

  private static calculateWeightedPrediction(factors: any): any {
    const weights = {
      domainReputation: 0.4,
      categoryPrediction: 0.3,
      userBehavior: 0.2,
      trackerPatterns: 0.1
    };

    // Calculate weighted score
    const weightedScore = 
      factors.domainReputation.score * weights.domainReputation +
      factors.categoryPrediction.score * weights.categoryPrediction +
      factors.userBehavior.score * weights.userBehavior +
      factors.trackerPatterns.score * weights.trackerPatterns;

    // Calculate weighted confidence
    const weightedConfidence = 
      factors.domainReputation.confidence * weights.domainReputation +
      factors.categoryPrediction.confidence * weights.categoryPrediction +
      factors.userBehavior.confidence * weights.userBehavior +
      factors.trackerPatterns.confidence * weights.trackerPatterns;

    // Generate risk factors
    const riskFactors: RiskFactor[] = [];
    
    if (factors.domainReputation.trackerInfo) {
      riskFactors.push({
        type: 'domain-reputation',
        impact: -20,
        description: `Known tracker domain: ${factors.domainReputation.trackerInfo.name}`,
        confidence: 0.9
      });
    }

    if (factors.categoryPrediction.category === 'social') {
      riskFactors.push({
        type: 'category-risk',
        impact: -25,
        description: 'Social media sites typically have extensive tracking',
        confidence: 0.8
      });
    }

    // Combine expected trackers
    const expectedTrackers = [
      ...factors.trackerPatterns.expectedTrackers,
      ...factors.categoryPrediction.expectedTrackers.map((type: TrackerType) => ({
        domain: `${type}-tracker.com`,
        type,
        probability: 0.6,
        riskLevel: 'medium' as RiskLevel
      }))
    ];

    return {
      score: Math.round(weightedScore),
      confidence: Math.min(0.95, weightedConfidence),
      riskFactors,
      expectedTrackers,
      comparisonToAverage: weightedScore - 70 // Compare to neutral baseline
    };
  }

  static async generateRecommendations(prediction: PrivacyPrediction): Promise<string[]> {
    const recommendations: string[] = [];

    if (prediction.predictedScore < 50) {
      recommendations.push('Consider using incognito/private browsing mode');
      recommendations.push('Enable ad blocker before visiting');
      recommendations.push('Use VPN for additional privacy protection');
    } else if (prediction.predictedScore < 70) {
      recommendations.push('Review privacy settings on this site');
      recommendations.push('Consider disabling third-party cookies');
    } else {
      recommendations.push('Site appears privacy-friendly');
    }

    // Add specific recommendations based on expected trackers
    const hasAdvertising = prediction.expectedTrackers.some(t => t.type === 'advertising');
    const hasFingerprinting = prediction.expectedTrackers.some(t => t.type === 'fingerprinting');
    
    if (hasAdvertising) {
      recommendations.push('Ad blocker recommended for this site');
    }
    
    if (hasFingerprinting) {
      recommendations.push('Use browser with fingerprinting protection');
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }

  static async updatePredictionModel(actualData: TrackingEvent[]): Promise<void> {
    // Update domain patterns based on actual tracking data
    for (const event of actualData) {
      await this.updateDomainPattern(event);
    }
  }

  static async getPredictionConfidence(url: string): Promise<number> {
    const prediction = await this.predictPrivacyImpact(url);
    return prediction.confidence;
  }

  // Helper methods
  private static getCachedPrediction(url: string): PrivacyPrediction | null {
    const cached = this.predictionCache.get(url);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.predictionCache.delete(url);
      return null;
    }

    return cached;
  }

  private static cachePrediction(url: string, prediction: PrivacyPrediction): void {
    // Implement LRU cache eviction if needed
    if (this.predictionCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.predictionCache.keys().next().value;
      if (firstKey) {
        this.predictionCache.delete(firstKey);
      }
    }

    this.predictionCache.set(url, prediction);
  }

  private static scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private static trackerRiskToScore(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case 'low': return 75;
      case 'medium': return 60;
      case 'high': return 45;
      case 'critical': return 30;
      default: return 70;
    }
  }

  private static extractDomainFeatures(domain: string): DomainFeatures {
    const parts = domain.split('.');
    return {
      tld: parts[parts.length - 1],
      subdomains: parts.length - 2,
      length: domain.length,
      hasNumbers: /\d/.test(domain),
      hasHyphens: /-/.test(domain),
      isKnownCDN: this.isKnownCDN(domain)
    };
  }

  private static calculateFeatureAdjustment(features: DomainFeatures): number {
    let adjustment = 0;

    // TLD-based adjustments
    if (['gov', 'edu', 'org'].includes(features.tld)) adjustment += 10;
    if (['tk', 'ml', 'ga'].includes(features.tld)) adjustment -= 15;

    // Domain characteristics
    if (features.length > 20) adjustment -= 5;
    if (features.hasNumbers && features.hasHyphens) adjustment -= 10;
    if (features.isKnownCDN) adjustment += 5;

    return adjustment;
  }

  private static categorizeWebsite(url: string): string {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Simple categorization based on domain patterns
    if (domain.includes('news') || domain.includes('times') || domain.includes('post')) return 'news';
    if (domain.includes('shop') || domain.includes('store') || domain.includes('buy')) return 'ecommerce';
    if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('instagram')) return 'social';
    if (domain.includes('google') || domain.includes('bing') || domain.includes('search')) return 'search';
    if (domain.includes('gov') || domain.endsWith('.gov')) return 'government';
    if (domain.includes('edu') || domain.endsWith('.edu')) return 'education';
    if (domain.includes('video') || domain.includes('stream') || domain.includes('watch')) return 'entertainment';
    
    return 'news'; // Default category
  }

  private static calculateDomainAdjustment(domain: string): number {
    // Adjust category baseline based on specific domain characteristics
    let adjustment = 0;

    if (domain.includes('privacy') || domain.includes('secure')) adjustment += 15;
    if (domain.includes('ad') || domain.includes('track')) adjustment -= 20;
    if (domain.length > 30) adjustment -= 5;

    return adjustment;
  }

  private static async getUserDomainHistory(domain: string): Promise<TrackingEvent[]> {
    try {
      const recentEvents = await StorageManager.getRecentEvents(500);
      return recentEvents.filter(event => event.domain === domain);
    } catch {
      return [];
    }
  }

  private static findSimilarDomains(targetDomain: string, events: TrackingEvent[]): TrackingEvent[] {
    const targetParts = targetDomain.split('.');
    const targetTLD = targetParts[targetParts.length - 1];
    
    return events.filter(event => {
      const eventParts = event.domain.split('.');
      const eventTLD = eventParts[eventParts.length - 1];
      
      // Same TLD or similar domain structure
      return eventTLD === targetTLD || 
             event.domain.includes(targetDomain.split('.')[0]) ||
             targetDomain.includes(event.domain.split('.')[0]);
    });
  }

  private static hasAnalyticsPattern(domain: string): boolean {
    return domain.includes('analytics') || 
           domain.includes('stats') || 
           domain.includes('metrics');
  }

  private static hasAdvertisingPattern(domain: string): boolean {
    return domain.includes('ads') || 
           domain.includes('advertising') || 
           domain.includes('doubleclick');
  }

  private static hasSocialPattern(domain: string): boolean {
    return domain.includes('facebook') || 
           domain.includes('twitter') || 
           domain.includes('social');
  }

  private static hasFingerprintingPattern(domain: string): boolean {
    return domain.includes('fingerprint') || 
           domain.includes('canvas') || 
           domain.includes('webgl');
  }

  private static isKnownCDN(domain: string): boolean {
    const cdnPatterns = ['cloudflare', 'amazonaws', 'cloudfront', 'fastly', 'jsdelivr'];
    return cdnPatterns.some(pattern => domain.includes(pattern));
  }

  private static generateDisplayText(prediction: PrivacyPrediction): string {
    const grade = prediction.predictedGrade;
    const score = prediction.predictedScore;
    const confidence = Math.round(prediction.confidence * 100);

    if (prediction.predictedScore >= 80) {
      return `🟢 ${grade} (${score}) - Minimal tracking expected (${confidence}% confident)`;
    } else if (prediction.predictedScore >= 60) {
      return `🟡 ${grade} (${score}) - Moderate tracking expected (${confidence}% confident)`;
    } else {
      return `🔴 ${grade} (${score}) - Extensive tracking expected (${confidence}% confident)`;
    }
  }

  private static async updateDomainPattern(event: TrackingEvent): Promise<void> {
    // Update prediction model based on actual tracking data
    // This would be implemented to improve prediction accuracy over time
    try {
      const patterns = await StorageManager.get('domainPatterns') as Record<string, DomainPattern> || {};
      
      const existing = patterns[event.domain];
      if (existing) {
        existing.visitCount++;
        existing.averageScore = (existing.averageScore + (event.privacyScore || 70)) / 2;
        existing.lastUpdated = Date.now();
      } else {
        patterns[event.domain] = {
          domain: event.domain,
          averageScore: event.privacyScore || 70,
          commonTrackers: [event.trackerType],
          riskProfile: {
            advertisingRisk: event.trackerType === 'advertising' ? 0.8 : 0.2,
            analyticsRisk: event.trackerType === 'analytics' ? 0.8 : 0.2,
            socialRisk: event.trackerType === 'social' ? 0.8 : 0.2,
            fingerprintingRisk: event.trackerType === 'fingerprinting' ? 0.8 : 0.2,
            overallRisk: this.calculateOverallRisk(event.riskLevel)
          },
          confidence: 0.5,
          lastUpdated: Date.now(),
          visitCount: 1
        };
      }

      await StorageManager.set('domainPatterns', patterns);
    } catch (error) {
      console.error('Failed to update domain pattern:', error);
    }
  }

  private static calculateOverallRisk(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case 'low': return 0.2;
      case 'medium': return 0.5;
      case 'high': return 0.8;
      case 'critical': return 1.0;
      default: return 0.5;
    }
  }
}
