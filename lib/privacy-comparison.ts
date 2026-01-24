import {
  CategoryComparisonService,
  UserComparisonService,
  type CategoryComparison,
  type UserComparison,
} from './comparisons';

/**
 * Comprehensive comparison insights
 */
export interface ComparisonInsights {
  categoryComparison: CategoryComparison;
  userComparison: UserComparison | null;
  overallInsight: string;
  recommendations: string[];
  trustLevel: 'high' | 'medium' | 'low';
}

/**
 * Privacy comparison orchestrator
 */
export class PrivacyComparison {
  /**
   * Compare site to its category average
   */
  static async compareToCategory(domain: string): Promise<CategoryComparison> {
    return await CategoryComparisonService.compare(domain);
  }

  /**
   * Compare site to user's browsing average
   */
  static async compareToUserAverage(
    domain: string
  ): Promise<UserComparison | null> {
    return await UserComparisonService.compare(domain);
  }

  /**
   * Generate comprehensive comparison insights
   */
  static async generateComparisonInsights(
    domain: string
  ): Promise<ComparisonInsights> {
    try {
      const [categoryComparison, userComparison] = await Promise.all([
        this.compareToCategory(domain),
        this.compareToUserAverage(domain),
      ]);

      // Generate overall insight
      const overallInsight = this.generateOverallInsight(
        categoryComparison,
        userComparison
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        categoryComparison,
        userComparison
      );

      // Determine trust level
      const trustLevel = this.calculateTrustLevel(
        categoryComparison.currentSite.privacyScore
      );

      return {
        categoryComparison,
        userComparison,
        overallInsight,
        recommendations,
        trustLevel,
      };
    } catch (error) {
      console.error('Failed to generate comparison insights:', error);
      throw error;
    }
  }

  /**
   * Generate overall insight
   */
  private static generateOverallInsight(
    categoryComparison: CategoryComparison,
    userComparison: UserComparison | null
  ): string {
    const { currentSite, betterThanAverage } = categoryComparison;

    if (betterThanAverage && userComparison?.betterThanUsual) {
      return `${currentSite.domain} has good privacy practices for both its category and your browsing pattern`;
    } else if (betterThanAverage) {
      return `${currentSite.domain} has above-average privacy for ${currentSite.category.toLowerCase()} sites`;
    } else if (userComparison?.betterThanUsual) {
      return `${currentSite.domain} has better privacy than most sites you visit`;
    } else {
      return `${currentSite.domain} has below-average privacy practices`;
    }
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    categoryComparison: CategoryComparison,
    userComparison: UserComparison | null
  ): string[] {
    const recommendations: string[] = [];

    if (!categoryComparison.betterThanAverage) {
      recommendations.push(
        'Consider using privacy-focused alternatives in this category'
      );
      recommendations.push('Enable tracking protection in your browser');
    }

    if (userComparison && !userComparison.betterThanUsual) {
      recommendations.push(
        'This site has more tracking than you typically encounter'
      );
      recommendations.push('Be cautious about sharing personal information');
    }

    if (categoryComparison.currentSite.privacyScore < 50) {
      recommendations.push(
        'Use incognito mode or VPN for sensitive activities'
      );
      recommendations.push('Review and adjust privacy settings');
    }

    return recommendations;
  }

  /**
   * Calculate trust level
   */
  private static calculateTrustLevel(
    privacyScore: number
  ): 'high' | 'medium' | 'low' {
    if (privacyScore >= 80) return 'high';
    if (privacyScore >= 60) return 'medium';
    return 'low';
  }
}
