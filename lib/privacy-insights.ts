import { calculatePrivacyScore } from './privacy-score';
import type {
  DailySnapshot,
  EvidenceCoverageConfidence,
  EvidenceScoreStatus,
  TrackingEvent,
} from './types';
import { EventsStorage } from './storage/events-storage';
import { ReportsStorage } from './storage/reports-storage';
import { BaseStorage } from './storage/base-storage';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getResourceDomain,
} from './event-attribution.mts';

export interface BrowsingPatternAnalysis {
  averagePrivacyScore: number | null;
  scoreStatus: EvidenceScoreStatus;
  scoreConfidence: EvidenceCoverageConfidence;
  evidenceUnits: number;
  observedPageCategories: string[];
  signalPatterns: string[];
  reviewAreas: string[];
  evidenceNotes: string[];
  totalEvents: number;
  totalOccurrences: number;
  timePatterns: {
    peakRecordedHours: number[];
    weekdayVsWeekend: { weekday: number; weekend: number };
  };
}

export interface PrivacyTrendAnalysis {
  scoreChange: number | null;
  trendDirection:
    | 'improving'
    | 'declining'
    | 'stable'
    | 'insufficient-evidence';
  weeklyAverage: number | null;
  numericSnapshotCount: number;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
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

/**
 * Evidence-review summaries retained under the historical PrivacyInsights name.
 * They do not infer total browsing behavior, website safety, or privacy quality.
 */
export class PrivacyInsights {
  private static readonly STORAGE_KEY = 'privacyInsights';

  static async generatePersonalizedInsights(): Promise<PersonalizedInsights> {
    const events = await EventsStorage.getRecentEvents(1000);
    const snapshots = await ReportsStorage.getDailySnapshots(30);
    const browsingPattern = this.analyzeBrowsingPatterns(events);
    const privacyTrends = this.analyzePrivacyTrends(snapshots);
    const insights: PersonalizedInsights = {
      browsingPattern,
      privacyTrends,
      recommendations: this.generateEvidenceReviewRecommendations(
        browsingPattern,
        privacyTrends
      ),
      achievements: [],
      lastUpdated: Date.now(),
    };

    await BaseStorage.set(this.STORAGE_KEY, insights);
    return insights;
  }

  static async getStoredInsights(): Promise<PersonalizedInsights | null> {
    return await BaseStorage.get<PersonalizedInsights>(this.STORAGE_KEY);
  }

  private static analyzeBrowsingPatterns(
    events: TrackingEvent[]
  ): BrowsingPatternAnalysis {
    const score = calculatePrivacyScore(events, true);
    const categoryDistribution = this.calculateCategoryDistribution(events);
    const signalPatterns = this.identifySignalPatterns(events);
    const timePatterns = this.analyzeTimePatterns(events);
    const totalOccurrences = events.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );

    return {
      averagePrivacyScore: score.score,
      scoreStatus: score.status,
      scoreConfidence: score.confidence,
      evidenceUnits: score.breakdown.evidenceUnits,
      observedPageCategories: this.getTopCategories(categoryDistribution, 3),
      signalPatterns,
      reviewAreas: this.suggestEvidenceReviewAreas(signalPatterns),
      evidenceNotes: score.recommendations,
      totalEvents: events.length,
      totalOccurrences,
      timePatterns,
    };
  }

  private static analyzePrivacyTrends(
    snapshots: DailySnapshot[]
  ): PrivacyTrendAnalysis {
    const numericSnapshots = snapshots.filter(
      (snapshot): snapshot is DailySnapshot & { privacyScore: number } =>
        snapshot.privacyScore !== null
    );

    if (numericSnapshots.length < 2) {
      return {
        scoreChange: null,
        trendDirection: 'insufficient-evidence',
        weeklyAverage:
          numericSnapshots.length === 1
            ? numericSnapshots[0].privacyScore
            : null,
        numericSnapshotCount: numericSnapshots.length,
        bestDay:
          numericSnapshots.length === 1
            ? {
                date: numericSnapshots[0].date,
                score: numericSnapshots[0].privacyScore,
              }
            : null,
        worstDay:
          numericSnapshots.length === 1
            ? {
                date: numericSnapshots[0].date,
                score: numericSnapshots[0].privacyScore,
              }
            : null,
      };
    }

    const scores = numericSnapshots.map(snapshot => snapshot.privacyScore);
    const weeklyAverage =
      scores.reduce((first, second) => first + second, 0) / scores.length;
    const scoreChange = scores[scores.length - 1] - scores[0];
    const trendDirection =
      scoreChange > 5
        ? 'improving'
        : scoreChange < -5
          ? 'declining'
          : 'stable';
    const bestSnapshot = numericSnapshots.reduce((best, current) =>
      current.privacyScore > best.privacyScore ? current : best
    );
    const worstSnapshot = numericSnapshots.reduce((worst, current) =>
      current.privacyScore < worst.privacyScore ? current : worst
    );

    return {
      scoreChange,
      trendDirection,
      weeklyAverage: Math.round(weeklyAverage),
      numericSnapshotCount: numericSnapshots.length,
      bestDay: { date: bestSnapshot.date, score: bestSnapshot.privacyScore },
      worstDay: { date: worstSnapshot.date, score: worstSnapshot.privacyScore },
    };
  }

  private static calculateCategoryDistribution(
    events: TrackingEvent[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    const seenPages = new Set<string>();

    for (const event of events) {
      const pageDomain = getPageDomain(event);
      if (!pageDomain || seenPages.has(pageDomain)) continue;
      seenPages.add(pageDomain);
      const category = this.categorizeWebsite(pageDomain);
      distribution[category] = (distribution[category] || 0) + 1;
    }

    return distribution;
  }

  private static categorizeWebsite(domain: string): string {
    const categories: Record<string, string[]> = {
      'Social Media': [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'linkedin.com',
        'tiktok.com',
      ],
      Shopping: ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com'],
      News: ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com'],
      Entertainment: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv'],
      Search: ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'],
      Technology: ['github.com', 'stackoverflow.com', 'reddit.com', 'medium.com'],
    };

    for (const [category, domains] of Object.entries(categories)) {
      if (
        domains.some(
          candidate =>
            domain === candidate || domain.endsWith(`.${candidate}`)
        )
      ) {
        return category;
      }
    }
    return 'Other';
  }

  private static identifySignalPatterns(events: TrackingEvent[]): string[] {
    const patterns: string[] = [];
    const thirdPartyDomains = new Set(
      events
        .filter(event => event.context?.party === 'third-party')
        .map(getResourceDomain)
        .filter(Boolean)
    );
    const fingerprintingUnits = new Set(
      events
        .filter(event => event.trackerType === 'fingerprinting')
        .map(event => event.detector?.id || event.inPageTracking?.method)
        .filter(Boolean)
    );

    if (thirdPartyDomains.size > 0) {
      patterns.push(
        `${thirdPartyDomains.size} unique third-party resource-domain label${
          thirdPartyDomains.size === 1 ? '' : 's'
        } recorded`
      );
    }
    if (fingerprintingUnits.size > 0) {
      patterns.push(
        `${fingerprintingUnits.size} fingerprinting-related detector unit${
          fingerprintingUnits.size === 1 ? '' : 's'
        } recorded; normal API use can trigger these rules`
      );
    }
    return patterns;
  }

  private static analyzeTimePatterns(
    events: TrackingEvent[]
  ): BrowsingPatternAnalysis['timePatterns'] {
    const hourCounts: Record<number, number> = {};
    let weekdayCount = 0;
    let weekendCount = 0;

    for (const event of events) {
      const date = new Date(event.lastSeenAt || event.timestamp);
      const occurrences = getEventOccurrenceCount(event);
      hourCounts[date.getHours()] =
        (hourCounts[date.getHours()] || 0) + occurrences;

      if (date.getDay() === 0 || date.getDay() === 6) {
        weekendCount += occurrences;
      } else {
        weekdayCount += occurrences;
      }
    }

    return {
      peakRecordedHours: Object.entries(hourCounts)
        .sort(([, first], [, second]) => second - first)
        .slice(0, 3)
        .map(([hour]) => Number.parseInt(hour, 10)),
      weekdayVsWeekend: { weekday: weekdayCount, weekend: weekendCount },
    };
  }

  private static getTopCategories(
    distribution: Record<string, number>,
    limit: number
  ): string[] {
    return Object.entries(distribution)
      .sort(([, first], [, second]) => second - first)
      .slice(0, limit)
      .map(([category]) => category);
  }

  private static suggestEvidenceReviewAreas(patterns: string[]): string[] {
    return patterns.length > 0
      ? [
          'Inspect page-to-resource routes and detector confidence before changing browser settings.',
          'Review excluded rows as well as score-qualified evidence.',
        ]
      : [
          'No recurring score-qualified pattern is available. This does not establish that tracking was absent.',
        ];
  }

  private static generateEvidenceReviewRecommendations(
    patterns: BrowsingPatternAnalysis,
    trends: PrivacyTrendAnalysis
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    if (patterns.scoreStatus === 'insufficient-evidence') {
      recommendations.push({
        id: 'review-evidence-coverage',
        type: 'education',
        title: 'Review Evidence Coverage',
        description:
          'No numeric index is available. Inspect attribution, detector confidence, and exclusions instead of treating N/A as a favorable result.',
        priority: 'medium',
        estimatedImpact: 'No numeric impact is claimed',
      });
    } else {
      recommendations.push({
        id: 'inspect-contributions',
        type: 'education',
        title: 'Inspect Score Contributions',
        description: `${patterns.evidenceUnits} evidence units contributed to the current index with ${patterns.scoreConfidence} coverage confidence. Review the routes and rules before acting.`,
        priority: 'medium',
        estimatedImpact: 'No score increase is promised',
      });
    }

    if (trends.trendDirection === 'declining') {
      recommendations.push({
        id: 'review-index-change',
        type: 'education',
        title: 'Review the Evidence Mix Change',
        description:
          'The estimated index declined across numeric snapshots. Check whether different pages, detectors, or coverage explain the change.',
        priority: 'medium',
        estimatedImpact: 'No behavioral or privacy outcome is inferred',
      });
    }

    return recommendations;
  }
}
