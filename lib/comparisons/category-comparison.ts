import {
  WebsiteCategorization,
  type WebsiteCategory,
} from '../website-categorization';
import { calculatePrivacyScore } from '../privacy-score';
import type {
  EvidenceCoverageConfidence,
  EvidenceScoreStatus,
  TrackingEvent,
} from '../types';
import { EventsStorage } from '../storage/events-storage';
import {
  eventMatchesPageDomain,
  getEventOccurrenceCount,
  normalizeDomain,
} from '../event-attribution.mts';

export interface CategoryComparison {
  status: 'unavailable';
  currentSite: {
    domain: string;
    privacyScore: number | null;
    scoreStatus: EvidenceScoreStatus;
    scoreConfidence: EvidenceCoverageConfidence;
    evidenceUnits: number;
    occurrenceCount: number;
    category: string;
  };
  categoryAverage: {
    privacyScore: null;
    trackerCount: null;
    category: string;
  };
  percentile: null;
  insight: string;
  betterThanAverage: null;
  improvementSuggestions: string[];
}

/**
 * Category benchmark comparison is deliberately unavailable.
 *
 * The legacy benchmark table and distributions are synthetic prototype values,
 * not a documented observational dataset. P2 preserves the current site's
 * evidence result but never compares it to those values or emits a percentile.
 */
export class CategoryComparisonService {
  static async compare(domain: string): Promise<CategoryComparison> {
    try {
      const normalizedDomain = normalizeDomain(domain);
      const events = await this.getSiteEvents(normalizedDomain);
      const score = calculatePrivacyScore(events, true, {
        scope: 'page',
        pageDomain: normalizedDomain,
      });
      const category = WebsiteCategorization.categorizeWebsite(normalizedDomain);
      const occurrenceCount = events.reduce(
        (total, event) => total + getEventOccurrenceCount(event),
        0
      );

      return {
        status: 'unavailable',
        currentSite: {
          domain: normalizedDomain,
          privacyScore: score.score,
          scoreStatus: score.status,
          scoreConfidence: score.confidence,
          evidenceUnits: score.breakdown.evidenceUnits,
          occurrenceCount,
          category: category.name,
        },
        categoryAverage: {
          privacyScore: null,
          trackerCount: null,
          category: category.name,
        },
        percentile: null,
        insight:
          'Category percentile comparison is unavailable because the bundled category averages and distributions are synthetic prototype data, not a documented benchmark.',
        betterThanAverage: null,
        improvementSuggestions: this.generateReviewSuggestions(score.status, category),
      };
    } catch (error) {
      console.error('Failed to prepare category comparison disclosure:', error);
      throw error;
    }
  }

  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => eventMatchesPageDomain(event, domain));
  }

  private static generateReviewSuggestions(
    status: EvidenceScoreStatus,
    category: WebsiteCategory
  ): string[] {
    const suggestions = [
      'Review the attributed routes, detector evidence, confidence, and exclusions instead of comparing this page with synthetic category values.',
    ];

    if (status === 'insufficient-evidence') {
      suggestions.push(
        'No numeric result is available for this page. This does not establish that the page is private or safe.'
      );
    }

    suggestions.push(
      `${category.name} is a heuristic content-category label and does not determine privacy behavior.`
    );
    return suggestions;
  }
}
