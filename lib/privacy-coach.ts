/**
 * Privacy Coaching Engine
 * AI-powered personalized privacy recommendations based on user behavior
 */

import { AIEngine } from './ai-engine';
import type { TrackingEvent } from './types';

import { BaseStorage } from './storage/base-storage';

export interface PrivacyJourney {
  startDate: number;
  currentScore: number;
  scoreHistory: Array<{ date: number; score: number }>;
  improvementGoals: PrivacyGoal[];
  completedActions: CompletedAction[];
  behaviorPatterns: BehaviorPattern[];
}

export interface PrivacyGoal {
  id: string;
  title: string;
  description: string;
  targetScore: number;
  deadline?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  actions: string[];
}

export interface CompletedAction {
  actionId: string;
  completedAt: number;
  impact: number; // Score improvement
  category: 'tool' | 'setting' | 'behavior';
}

export interface BehaviorPattern {
  pattern:
    | 'high_risk_sites'
    | 'social_heavy'
    | 'shopping_frequent'
    | 'banking_insecure';
  frequency: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface CoachingInsight {
  type: 'progress' | 'warning' | 'achievement' | 'suggestion';
  title: string;
  message: string;
  actionable: boolean;
  priority: number;
  relatedGoal?: string;
}

export class PrivacyCoach {
  /**
   * Initialize privacy journey for new user
   */
  static async initializeJourney(
    initialScore: number
  ): Promise<PrivacyJourney> {
    const journey: PrivacyJourney = {
      startDate: Date.now(),
      currentScore: initialScore,
      scoreHistory: [{ date: Date.now(), score: initialScore }],
      improvementGoals: await this.generateInitialGoals(initialScore),
      completedActions: [],
      behaviorPatterns: [],
    };

    await BaseStorage.set('privacy_journey', journey);
    return journey;
  }

  /**
   * Update journey with new privacy score
   */
  static async updateJourney(newScore: number): Promise<PrivacyJourney> {
    let journey = await BaseStorage.get<PrivacyJourney>('privacy_journey');

    if (!journey) {
      journey = await this.initializeJourney(newScore);
    }

    // Update score history (keep last 30 days)
    const now = Date.now();
    journey.scoreHistory.push({ date: now, score: newScore });
    journey.scoreHistory = journey.scoreHistory
      .filter(
        (entry: { date: number; score: number }) =>
          now - entry.date < 30 * 24 * 60 * 60 * 1000
      )
      .slice(-30);

    journey.currentScore = newScore;

    // Update goal progress
    journey.improvementGoals = journey.improvementGoals.map(
      (goal: PrivacyGoal) => {
        if (goal.status === 'active' && newScore >= goal.targetScore) {
          return { ...goal, status: 'completed' as const };
        }
        return goal;
      }
    );

    await BaseStorage.set('privacy_journey', journey);
    return journey;
  }

  /**
   * Analyze behavior patterns from recent events
   */
  static async analyzeBehaviorPatterns(
    events: TrackingEvent[]
  ): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    const domainCounts = new Map<string, number>();
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    // Analyze domain frequency and risk distribution
    for (const event of events) {
      domainCounts.set(event.domain, (domainCounts.get(event.domain) || 0) + 1);
      riskCounts[event.riskLevel]++;
    }

    // High-risk sites pattern
    if (riskCounts.high + riskCounts.critical > events.length * 0.3) {
      patterns.push({
        pattern: 'high_risk_sites',
        frequency: riskCounts.high + riskCounts.critical,
        riskLevel: 'high',
        recommendation:
          'You frequently visit high-risk sites. Consider using a VPN and strict privacy settings.',
      });
    }

    // Social media heavy usage
    const socialDomains = Array.from(domainCounts.entries())
      .filter(([domain]) =>
        ['facebook', 'twitter', 'instagram', 'tiktok', 'linkedin'].some(
          social => domain.includes(social)
        )
      )
      .reduce((sum, [, count]) => sum + count, 0);

    if (socialDomains > events.length * 0.4) {
      patterns.push({
        pattern: 'social_heavy',
        frequency: socialDomains,
        riskLevel: 'medium',
        recommendation:
          'Heavy social media usage detected. Review privacy settings and consider alternatives like Signal or Mastodon.',
      });
    }

    return patterns;
  }

  /**
   * Generate personalized coaching insights
   */
  static async generateCoachingInsights(
    journey: PrivacyJourney,
    recentEvents: TrackingEvent[]
  ): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];
    const scoreChange = this.calculateScoreChange(journey.scoreHistory);
    const patterns = await this.analyzeBehaviorPatterns(recentEvents);

    // Progress insights
    if (scoreChange > 10) {
      insights.push({
        type: 'achievement',
        title: 'Great Progress!',
        message: `Your privacy score improved by ${scoreChange} points this week. Keep it up!`,
        actionable: false,
        priority: 1,
      });
    } else if (scoreChange < -10) {
      insights.push({
        type: 'warning',
        title: 'Privacy Score Declining',
        message: `Your score dropped by ${Math.abs(scoreChange)} points. Let's identify what changed.`,
        actionable: true,
        priority: 3,
      });
    }

    // Behavior pattern insights
    for (const pattern of patterns) {
      insights.push({
        type: 'suggestion',
        title: this.getPatternTitle(pattern.pattern),
        message: pattern.recommendation,
        actionable: true,
        priority: pattern.riskLevel === 'high' ? 3 : 2,
      });
    }

    // Goal-based insights
    const activeGoals = journey.improvementGoals.filter(
      g => g.status === 'active'
    );
    if (activeGoals.length === 0 && journey.currentScore < 80) {
      insights.push({
        type: 'suggestion',
        title: 'Set New Privacy Goals',
        message:
          'Ready for the next step? Set a new privacy improvement goal to continue your journey.',
        actionable: true,
        priority: 2,
      });
    }

    // AI-enhanced insights
    try {
      const aiInsights = await this.generateAIInsights(journey, recentEvents);
      insights.push(...aiInsights);
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  /**
   * Generate AI-powered insights using recent events and journey data
   */
  private static async generateAIInsights(
    _journey: PrivacyJourney,
    events: TrackingEvent[]
  ): Promise<CoachingInsight[]> {
    try {
      const response = await AIEngine.analyzeEvents(events);
      if (response?.narrative) {
        return this.parseAIInsights(response.narrative);
      }
      return [];
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return [];
    }
  }

  /**
   * Parse AI response into coaching insights
   */
  private static parseAIInsights(response: string): CoachingInsight[] {
    const insights: CoachingInsight[] = [];
    const lines = response.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/(\w+):\s*(.+?)\s*-\s*(.+)/);
      if (match) {
        const [, type, title, message] = match;
        insights.push({
          type: type.toLowerCase() as CoachingInsight['type'],
          title: title.trim(),
          message: message.trim(),
          actionable: type.toLowerCase() === 'suggestion',
          priority: type.toLowerCase() === 'warning' ? 3 : 2,
        });
      }
    }

    return insights;
  }

  /**
   * Generate initial improvement goals based on current score
   */
  private static async generateInitialGoals(
    score: number
  ): Promise<PrivacyGoal[]> {
    const goals: PrivacyGoal[] = [];

    if (score < 60) {
      goals.push({
        id: 'basic_protection',
        title: 'Install Basic Privacy Tools',
        description:
          'Get essential privacy protection with uBlock Origin and Privacy Badger',
        targetScore: 70,
        priority: 'high',
        status: 'active',
        actions: ['install_ublock', 'install_privacy_badger', 'enable_dnt'],
      });
    } else if (score < 80) {
      goals.push({
        id: 'advanced_protection',
        title: 'Enhance Privacy Settings',
        description: 'Fine-tune browser settings and add advanced protection',
        targetScore: 85,
        priority: 'medium',
        status: 'active',
        actions: [
          'strict_tracking_protection',
          'disable_third_party_cookies',
          'use_private_dns',
        ],
      });
    } else {
      goals.push({
        id: 'privacy_expert',
        title: 'Achieve Privacy Expert Status',
        description: 'Master advanced privacy techniques and tools',
        targetScore: 95,
        priority: 'low',
        status: 'active',
        actions: ['use_tor_browser', 'enable_vpn', 'compartmentalize_browsing'],
      });
    }

    return goals;
  }

  private static calculateScoreChange(
    history: Array<{ date: number; score: number }>
  ): number {
    if (history.length < 2) return 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentScores = history.filter(h => h.date >= weekAgo);
    if (recentScores.length < 2) return 0;

    return recentScores[recentScores.length - 1].score - recentScores[0].score;
  }

  private static getPatternTitle(pattern: BehaviorPattern['pattern']): string {
    switch (pattern) {
      case 'high_risk_sites':
        return 'High-Risk Browsing Detected';
      case 'social_heavy':
        return 'Heavy Social Media Usage';
      case 'shopping_frequent':
        return 'Frequent Online Shopping';
      case 'banking_insecure':
        return 'Insecure Banking Practices';
      default:
        return 'Behavior Pattern Detected';
    }
  }
}
