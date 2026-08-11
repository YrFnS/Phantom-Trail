/**
 * Experimental coaching engine.
 *
 * Suggestions are derived from recorded heuristic events. They are not a
 * measurement of user behavior, browsing safety, or privacy compliance.
 */

import { aiEngine } from './ai-engine';
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
  impact: number;
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

  static async updateJourney(newScore: number): Promise<PrivacyJourney> {
    let journey = await BaseStorage.get<PrivacyJourney>('privacy_journey');

    if (!journey) {
      journey = await this.initializeJourney(newScore);
    }

    const now = Date.now();
    journey.scoreHistory.push({ date: now, score: newScore });
    journey.scoreHistory = journey.scoreHistory
      .filter(entry => now - entry.date < 30 * 24 * 60 * 60 * 1000)
      .slice(-30);
    journey.currentScore = newScore;

    journey.improvementGoals = journey.improvementGoals.map(goal => {
      if (goal.status === 'active' && newScore >= goal.targetScore) {
        return { ...goal, status: 'completed' as const };
      }
      return goal;
    });

    await BaseStorage.set('privacy_journey', journey);
    return journey;
  }

  /**
   * Group recent detector output into possible signal patterns.
   */
  static async analyzeBehaviorPatterns(
    events: TrackingEvent[]
  ): Promise<BehaviorPattern[]> {
    if (events.length === 0) return [];

    const patterns: BehaviorPattern[] = [];
    const domainCounts = new Map<string, number>();
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const event of events) {
      domainCounts.set(event.domain, (domainCounts.get(event.domain) || 0) + 1);
      riskCounts[event.riskLevel]++;
    }

    const elevatedSignals = riskCounts.high + riskCounts.critical;
    if (elevatedSignals > events.length * 0.3) {
      patterns.push({
        pattern: 'high_risk_sites',
        frequency: elevatedSignals,
        riskLevel: 'high',
        recommendation:
          'A large share of recent events received high or critical prototype labels. Review the underlying entries; this does not prove that the visited sites were unsafe.',
      });
    }

    const socialMatches = Array.from(domainCounts.entries())
      .filter(([domain]) =>
        ['facebook', 'twitter', 'instagram', 'tiktok', 'linkedin'].some(token =>
          domain.includes(token)
        )
      )
      .reduce((sum, [, count]) => sum + count, 0);

    if (socialMatches > events.length * 0.4) {
      patterns.push({
        pattern: 'social_heavy',
        frequency: socialMatches,
        riskLevel: 'medium',
        recommendation:
          'Many recent recorded domains matched social-platform strings. This is a detector-event pattern, not a measurement of total browsing behavior.',
      });
    }

    return patterns;
  }

  static async generateCoachingInsights(
    journey: PrivacyJourney,
    recentEvents: TrackingEvent[]
  ): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = [];
    const scoreChange = this.calculateScoreChange(journey.scoreHistory);
    const patterns = await this.analyzeBehaviorPatterns(recentEvents);

    if (scoreChange > 10) {
      insights.push({
        type: 'progress',
        title: 'Heuristic Score Increased',
        message: `The experimental score increased by ${scoreChange} points in the recent history window. Review the underlying event mix before drawing conclusions.`,
        actionable: false,
        priority: 1,
      });
    } else if (scoreChange < -10) {
      insights.push({
        type: 'warning',
        title: 'Heuristic Score Decreased',
        message: `The experimental score decreased by ${Math.abs(scoreChange)} points. Review which recorded events changed; this is not proof that privacy became worse.`,
        actionable: true,
        priority: 3,
      });
    }

    for (const pattern of patterns) {
      insights.push({
        type: 'suggestion',
        title: this.getPatternTitle(pattern.pattern),
        message: pattern.recommendation,
        actionable: true,
        priority: pattern.riskLevel === 'high' ? 3 : 2,
      });
    }

    const activeGoals = journey.improvementGoals.filter(
      goal => goal.status === 'active'
    );
    if (activeGoals.length === 0 && journey.currentScore < 80) {
      insights.push({
        type: 'suggestion',
        title: 'Review Generated Goals',
        message:
          'The prototype can create another heuristic-based goal. Keep only suggestions that fit your needs and independently review their trade-offs.',
        actionable: true,
        priority: 2,
      });
    }

    try {
      insights.push(...(await this.generateAIInsights(recentEvents)));
    } catch (error) {
      console.error('Failed to generate optional coaching summary:', error);
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  private static async generateAIInsights(
    events: TrackingEvent[]
  ): Promise<CoachingInsight[]> {
    try {
      const response = await aiEngine.analyzeEvents(events);
      if (!response?.narrative) return [];
      return this.parseAIInsights(response.narrative);
    } catch (error) {
      console.error('Optional coaching summary failed:', error);
      return [];
    }
  }

  private static parseAIInsights(response: string): CoachingInsight[] {
    const insights: CoachingInsight[] = [];
    const lines = response.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/(\w+):\s*(.+?)\s*-\s*(.+)/);
      if (!match) continue;

      const [, rawType, title, message] = match;
      const normalizedType = rawType.toLowerCase();
      const allowedTypes: CoachingInsight['type'][] = [
        'progress',
        'warning',
        'achievement',
        'suggestion',
      ];
      const type = allowedTypes.includes(normalizedType as CoachingInsight['type'])
        ? (normalizedType as CoachingInsight['type'])
        : 'suggestion';

      insights.push({
        type,
        title: `Generated: ${title.trim()}`,
        message: `${message.trim()} This text is generated from recorded heuristic events and may be inaccurate.`,
        actionable: type === 'suggestion',
        priority: type === 'warning' ? 3 : 2,
      });
    }

    return insights;
  }

  private static async generateInitialGoals(
    score: number
  ): Promise<PrivacyGoal[]> {
    if (score < 60) {
      return [
        {
          id: 'basic_protection',
          title: 'Review Basic Privacy Tools',
          description:
            'Consider whether tools such as uBlock Origin or Privacy Badger fit your browser and needs',
          targetScore: 70,
          priority: 'high',
          status: 'active',
          actions: ['review_ublock', 'review_privacy_badger', 'review_browser_controls'],
        },
      ];
    }

    if (score < 80) {
      return [
        {
          id: 'advanced_protection',
          title: 'Review Browser Privacy Settings',
          description:
            'Review available browser controls and choose settings appropriate to your needs',
          targetScore: 85,
          priority: 'medium',
          status: 'active',
          actions: [
            'review_tracking_protection',
            'review_third_party_cookies',
            'review_dns_options',
          ],
        },
      ];
    }

    return [
      {
        id: 'privacy_expert',
        title: 'Review Advanced Privacy Options',
        description:
          'Explore advanced options only after reviewing usability, security, and privacy trade-offs',
        targetScore: 95,
        priority: 'low',
        status: 'active',
        actions: ['review_private_browsers', 'review_vpn_tradeoffs', 'review_compartmentalization'],
      },
    ];
  }

  private static calculateScoreChange(
    history: Array<{ date: number; score: number }>
  ): number {
    if (history.length < 2) return 0;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentScores = history.filter(entry => entry.date >= weekAgo);
    if (recentScores.length < 2) return 0;

    return recentScores[recentScores.length - 1].score - recentScores[0].score;
  }

  private static getPatternTitle(pattern: BehaviorPattern['pattern']): string {
    switch (pattern) {
      case 'high_risk_sites':
        return 'Frequent High-Severity Signals';
      case 'social_heavy':
        return 'Frequent Social-Domain Matches';
      case 'shopping_frequent':
        return 'Frequent Shopping-Domain Matches';
      case 'banking_insecure':
        return 'Banking-Related Signals';
      default:
        return 'Possible Signal Pattern';
    }
  }
}
