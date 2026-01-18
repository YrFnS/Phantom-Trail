import type { TrackingEvent } from './types';
import { StorageManager } from './storage-manager';

export interface BrowsingPatternAnalysis {
  averagePrivacyScore: number;
  mostVisitedCategories: string[];
  riskiestHabits: string[];
  improvementAreas: string[];
  strengths: string[];
  totalEvents: number;
  timePatterns: {
    peakHours: number[];
    weekdayVsWeekend: { weekday: number; weekend: number };
  };
}

export interface PrivacyTrendAnalysis {
  scoreChange: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  weeklyAverage: number;
  bestDay: { date: string; score: number };
  worstDay: { date: string; score: number };
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'tool_suggestion' | 'behavior_change' | 'education' | 'goal_setting';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  actionUrl?: string;
}

export interface PrivacyAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number;
  category: 'streak' | 'improvement' | 'learning' | 'tool_mastery';
}

export interface PersonalizedInsights {
  browsingPattern: BrowsingPatternAnalysis;
  privacyTrends: PrivacyTrendAnalysis;
  recommendations: PersonalizedRecommendation[];
  achievements: PrivacyAchievement[];
  lastUpdated: number;
}

export class PrivacyInsights {
  private static readonly STORAGE_KEY = 'privacyInsights';

  static async generatePersonalizedInsights(): Promise<PersonalizedInsights> {
    const events = await StorageManager.getRecentEvents(1000);
    const snapshots = await StorageManager.getDailySnapshots(30);
    
    const browsingPattern = this.analyzeBrowsingPatterns(events);
    const privacyTrends = this.analyzePrivacyTrends(snapshots);
    const recommendations = this.generatePersonalizedRecommendations(browsingPattern, privacyTrends);
    const achievements = await this.checkForNewAchievements(browsingPattern, privacyTrends);

    const insights: PersonalizedInsights = {
      browsingPattern,
      privacyTrends,
      recommendations,
      achievements,
      lastUpdated: Date.now()
    };

    await StorageManager.set(this.STORAGE_KEY, insights);
    return insights;
  }

  static async getStoredInsights(): Promise<PersonalizedInsights | null> {
    return await StorageManager.get<PersonalizedInsights>(this.STORAGE_KEY);
  }

  private static analyzeBrowsingPatterns(events: TrackingEvent[]): BrowsingPatternAnalysis {
    if (events.length === 0) {
      return {
        averagePrivacyScore: 100,
        mostVisitedCategories: [],
        riskiestHabits: [],
        improvementAreas: [],
        strengths: ['No tracking detected'],
        totalEvents: 0,
        timePatterns: { peakHours: [], weekdayVsWeekend: { weekday: 0, weekend: 0 } }
      };
    }

    const categoryDistribution = this.calculateCategoryDistribution(events);
    const riskPatterns = this.identifyRiskPatterns(events);
    const timePatterns = this.analyzeTimePatterns(events);
    const averageScore = this.calculateAverageScore(events);

    return {
      averagePrivacyScore: averageScore,
      mostVisitedCategories: this.getTopCategories(categoryDistribution, 3),
      riskiestHabits: this.identifyRiskyBehaviors(riskPatterns),
      improvementAreas: this.suggestImprovements(riskPatterns),
      strengths: this.identifyStrengths(events, averageScore),
      totalEvents: events.length,
      timePatterns
    };
  }

  private static analyzePrivacyTrends(snapshots: Array<{ date: string; privacyScore: number }>): PrivacyTrendAnalysis {
    if (snapshots.length < 2) {
      return {
        scoreChange: 0,
        trendDirection: 'stable',
        weeklyAverage: 100,
        bestDay: { date: new Date().toISOString().split('T')[0], score: 100 },
        worstDay: { date: new Date().toISOString().split('T')[0], score: 100 }
      };
    }

    const scores = snapshots.map(s => s.privacyScore);
    const weeklyAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
    const scoreChange = scores[scores.length - 1] - scores[0];
    
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (scoreChange > 5) trendDirection = 'improving';
    else if (scoreChange < -5) trendDirection = 'declining';

    const bestSnapshot = snapshots.reduce((best, current) => 
      current.privacyScore > best.privacyScore ? current : best
    );
    const worstSnapshot = snapshots.reduce((worst, current) => 
      current.privacyScore < worst.privacyScore ? current : worst
    );

    return {
      scoreChange,
      trendDirection,
      weeklyAverage,
      bestDay: { date: bestSnapshot.date, score: bestSnapshot.privacyScore },
      worstDay: { date: worstSnapshot.date, score: worstSnapshot.privacyScore }
    };
  }

  private static calculateCategoryDistribution(events: TrackingEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    events.forEach(event => {
      const category = this.categorizeWebsite(event.domain);
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }

  private static categorizeWebsite(domain: string): string {
    const categories = {
      'Social Media': ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com'],
      'Shopping': ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com', 'walmart.com'],
      'News': ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'theguardian.com'],
      'Entertainment': ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'hulu.com'],
      'Search': ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'],
      'Technology': ['github.com', 'stackoverflow.com', 'reddit.com', 'medium.com']
    };

    for (const [category, domains] of Object.entries(categories)) {
      if (domains.some(d => domain.includes(d) || d.includes(domain))) {
        return category;
      }
    }
    return 'Other';
  }

  private static identifyRiskPatterns(events: TrackingEvent[]): Record<string, number> {
    const patterns: Record<string, number> = {};
    
    events.forEach(event => {
      if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
        const pattern = `${event.trackerType}_tracking`;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
      
      if (event.inPageTracking?.method) {
        const method = event.inPageTracking.method;
        patterns[method] = (patterns[method] || 0) + 1;
      }
    });

    return patterns;
  }

  private static analyzeTimePatterns(events: TrackingEvent[]): BrowsingPatternAnalysis['timePatterns'] {
    const hourCounts: Record<number, number> = {};
    let weekdayCount = 0;
    let weekendCount = 0;

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
      } else {
        weekdayCount++;
      }
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      peakHours,
      weekdayVsWeekend: { weekday: weekdayCount, weekend: weekendCount }
    };
  }

  private static calculateAverageScore(events: TrackingEvent[]): number {
    // Simplified score calculation based on risk levels
    const riskWeights = { low: 95, medium: 85, high: 70, critical: 50 };
    const scores = events.map(e => riskWeights[e.riskLevel] || 85);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
  }

  private static getTopCategories(distribution: Record<string, number>, limit: number): string[] {
    return Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([category]) => category);
  }

  private static identifyRiskyBehaviors(patterns: Record<string, number>): string[] {
    const risky = [];
    
    if (patterns['social_media_tracking'] > 10) {
      risky.push('Heavy social media tracking exposure');
    }
    if (patterns['advertising_tracking'] > 20) {
      risky.push('Extensive advertising tracker encounters');
    }
    if (patterns['canvas-fingerprint'] > 0) {
      risky.push('Canvas fingerprinting detected');
    }
    if (patterns['fingerprinting_tracking'] > 5) {
      risky.push('Multiple fingerprinting attempts');
    }

    return risky;
  }

  private static suggestImprovements(patterns: Record<string, number>): string[] {
    const improvements = [];
    
    if (patterns['advertising_tracking'] > 15) {
      improvements.push('Consider using an ad blocker');
    }
    if (patterns['social_media_tracking'] > 8) {
      improvements.push('Use social media containers or privacy settings');
    }
    if (patterns['canvas-fingerprint'] > 0) {
      improvements.push('Enable fingerprinting protection in browser');
    }
    if (patterns['analytics_tracking'] > 10) {
      improvements.push('Consider disabling third-party cookies');
    }

    return improvements;
  }

  private static identifyStrengths(events: TrackingEvent[], averageScore: number): string[] {
    const strengths = [];
    
    if (averageScore > 85) {
      strengths.push('Maintaining good privacy practices');
    }
    if (events.filter(e => e.riskLevel === 'critical').length === 0) {
      strengths.push('No critical privacy risks detected');
    }
    if (events.filter(e => e.url.startsWith('https')).length / events.length > 0.9) {
      strengths.push('Consistently using secure HTTPS connections');
    }

    return strengths.length > 0 ? strengths : ['Building privacy awareness'];
  }

  private static generatePersonalizedRecommendations(
    patterns: BrowsingPatternAnalysis,
    trends: PrivacyTrendAnalysis
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Score-based recommendations
    if (patterns.averagePrivacyScore < 70) {
      recommendations.push({
        id: 'improve-score',
        type: 'behavior_change',
        title: 'Improve Your Privacy Score',
        description: 'Your average privacy score could be better. Focus on reducing tracker exposure.',
        priority: 'high',
        estimatedImpact: '+20 privacy score points'
      });
    }

    // Pattern-based recommendations
    if (patterns.riskiestHabits.includes('Heavy social media tracking exposure')) {
      recommendations.push({
        id: 'social-media-protection',
        type: 'tool_suggestion',
        title: 'Protect Against Social Media Tracking',
        description: 'Use browser containers or adjust privacy settings to limit social media tracking.',
        priority: 'medium',
        estimatedImpact: '+10 privacy score points'
      });
    }

    if (patterns.improvementAreas.includes('Consider using an ad blocker')) {
      recommendations.push({
        id: 'ad-blocker',
        type: 'tool_suggestion',
        title: 'Install an Ad Blocker',
        description: 'Ad blockers can significantly reduce tracking and improve your privacy score.',
        priority: 'high',
        estimatedImpact: '+25 privacy score points'
      });
    }

    // Trend-based recommendations
    if (trends.trendDirection === 'declining') {
      recommendations.push({
        id: 'reverse-trend',
        type: 'behavior_change',
        title: 'Reverse Privacy Decline',
        description: 'Your privacy score has been declining. Review recent browsing habits.',
        priority: 'high',
        estimatedImpact: 'Stop privacy score decline'
      });
    }

    return recommendations;
  }

  private static async checkForNewAchievements(
    patterns: BrowsingPatternAnalysis,
    trends: PrivacyTrendAnalysis
  ): Promise<PrivacyAchievement[]> {
    const achievements: PrivacyAchievement[] = [];
    const now = Date.now();

    // Score achievements
    if (patterns.averagePrivacyScore >= 90) {
      achievements.push({
        id: 'privacy-champion',
        title: 'Privacy Champion',
        description: 'Maintained an A+ privacy score average',
        icon: '🏆',
        unlockedAt: now,
        category: 'improvement'
      });
    }

    // Improvement achievements
    if (trends.scoreChange > 15) {
      achievements.push({
        id: 'privacy-improver',
        title: 'Privacy Improver',
        description: 'Improved privacy score by 15+ points',
        icon: '📈',
        unlockedAt: now,
        category: 'improvement'
      });
    }

    // Learning achievements
    if (patterns.strengths.includes('No critical privacy risks detected')) {
      achievements.push({
        id: 'risk-free',
        title: 'Risk-Free Browsing',
        description: 'No critical privacy risks detected',
        icon: '🛡️',
        unlockedAt: now,
        category: 'learning'
      });
    }

    return achievements;
  }
}
