import {
  CategoryComparisonService,
  UserComparisonService,
  type CategoryComparison,
  type UserComparison,
} from './comparisons';

export interface ComparisonInsights {
  categoryComparison: CategoryComparison;
  userComparison: UserComparison;
  overallInsight: string;
  recommendations: string[];
  trustLevel: 'unavailable';
}

/**
 * Compatibility orchestrator for comparison disclosures.
 * P2 does not derive trust, safety, or population rankings from evidence scores.
 */
export class PrivacyComparison {
  static async compareToCategory(domain: string): Promise<CategoryComparison> {
    return await CategoryComparisonService.compare(domain);
  }

  static async compareToUserAverage(domain: string): Promise<UserComparison> {
    return await UserComparisonService.compare(domain);
  }

  static async generateComparisonInsights(
    domain: string
  ): Promise<ComparisonInsights> {
    const [categoryComparison, userComparison] = await Promise.all([
      this.compareToCategory(domain),
      this.compareToUserAverage(domain),
    ]);

    return {
      categoryComparison,
      userComparison,
      overallInsight:
        'Population, category, and trust comparisons are unavailable. The current page and locally observed pages may have evidence-index values, but exposure and coverage are not controlled well enough for a privacy ranking.',
      recommendations: Array.from(
        new Set([
          ...categoryComparison.improvementSuggestions,
          'Inspect the current page’s evidence units, exclusions, and confidence instead of using a better/worse or trusted/untrusted label.',
          'Do not interpret a higher model band as proof that a site is private or safe.',
        ])
      ),
      trustLevel: 'unavailable',
    };
  }
}
