import {
  WebsiteCategorization,
  type WebsiteCategory,
} from '../website-categorization';
import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent } from '../types';
import { EventsStorage } from '../storage/events-storage';

/**
 * Category comparison data structure
 */
export interface CategoryComparison {
  currentSite: {
    domain: string;
    privacyScore: number;
    trackerCount: number;
    category: string;
  };
  categoryAverage: {
    privacyScore: number;
    trackerCount: number;
    category: string;
  };
  percentile: number;
  insight: string;
  betterThanAverage: boolean;
  improvementSuggestions: string[];
}

/**
 * Service for comparing sites to their category averages
 */
export class CategoryComparisonService {
  /**
   * Compare site to its category average
   */
  static async compare(domain: string): Promise<CategoryComparison> {
    try {
      // Get site's tracking events
      const events = await this.getSiteEvents(domain);
      const privacyScore =
        events.length > 0 ? calculatePrivacyScore(events, true).score : 100;

      // Categorize the website
      const category = WebsiteCategorization.categorizeWebsite(domain);
      const benchmark = WebsiteCategorization.getCategoryBenchmark(category.id);

      // Calculate percentile
      const percentile = this.calculatePercentile(
        privacyScore,
        benchmark.distribution
      );

      // Generate insight
      const insight = this.generateInsight(percentile, category.name);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        privacyScore,
        benchmark.averageScore,
        category
      );

      return {
        currentSite: {
          domain,
          privacyScore,
          trackerCount: events.length,
          category: category.name,
        },
        categoryAverage: {
          privacyScore: benchmark.averageScore,
          trackerCount: benchmark.averageTrackers,
          category: category.name,
        },
        percentile,
        insight,
        betterThanAverage: privacyScore > benchmark.averageScore,
        improvementSuggestions,
      };
    } catch (error) {
      console.error('Failed to compare to category:', error);
      throw error;
    }
  }

  /**
   * Get tracking events for a specific site
   */
  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => event.domain === domain);
  }

  /**
   * Calculate percentile ranking
   */
  private static calculatePercentile(
    score: number,
    distribution: number[]
  ): number {
    if (distribution.length === 0) return 50;

    let count = 0;
    for (let i = 0; i < score && i < distribution.length; i++) {
      count += distribution[i];
    }

    const totalArea = distribution.reduce((sum, val) => sum + val, 0);
    return Math.round((count / totalArea) * 100);
  }

  /**
   * Generate category comparison insight
   */
  private static generateInsight(
    percentile: number,
    categoryName: string
  ): string {
    if (percentile >= 80) {
      return `Excellent privacy - better than ${percentile}% of ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 60) {
      return `Good privacy - above average for ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 40) {
      return `Average privacy for ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 20) {
      return `Below average privacy - worse than ${100 - percentile}% of ${categoryName.toLowerCase()} sites`;
    } else {
      return `Poor privacy - among the worst ${100 - percentile}% of ${categoryName.toLowerCase()} sites`;
    }
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovementSuggestions(
    siteScore: number,
    avgScore: number,
    category: WebsiteCategory
  ): string[] {
    const suggestions: string[] = [];

    if (siteScore < avgScore - 10) {
      suggestions.push(
        `This ${category.name.toLowerCase()} site has more tracking than typical`
      );
      suggestions.push(
        'Consider using an ad blocker or privacy-focused browser'
      );
    }

    if (
      category.riskProfile === 'critical' ||
      category.riskProfile === 'high'
    ) {
      suggestions.push(`${category.name} sites often have extensive tracking`);
      suggestions.push(
        'Review privacy settings and limit personal information sharing'
      );
    }

    if (siteScore < 60) {
      suggestions.push('Consider alternatives with better privacy practices');
      suggestions.push(
        'Use incognito/private browsing mode for sensitive activities'
      );
    }

    return suggestions;
  }
}
