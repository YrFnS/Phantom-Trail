import type { RiskFactor, DomainPattern } from './types';

/**
 * URL-pattern heuristics used by the optional link estimate.
 *
 * These rules do not fetch, execute, or audit the destination and must not be
 * described as domain reputation or measured privacy behavior.
 */
export class RiskAnalysis {
  private static readonly DOMAIN_PATTERNS = new Map<string, DomainPattern>();

  static async analyzeDomainReputation(domain: string): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    const storedPattern = this.DOMAIN_PATTERNS.get(domain);

    if (storedPattern) {
      factors.push({
        type: 'domain-reputation',
        impact: storedPattern.averageScore > 70 ? 10 : -15,
        description: 'A locally stored prototype domain rule matched',
        confidence: 0.5,
      });
    }

    if (domain.includes('analytics') || domain.includes('tracking')) {
      factors.push({
        type: 'domain-reputation',
        impact: -25,
        description: 'Hostname contains a tracking-related token',
        confidence: 0.55,
      });
    }

    return factors;
  }

  static predictByCategory(url: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    try {
      const domain = new URL(url).hostname.toLowerCase();

      if (
        domain.includes('facebook') ||
        domain.includes('instagram') ||
        domain.includes('twitter') ||
        domain.includes('tiktok')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -20,
          description: 'Hostname matched a social-platform category rule',
          confidence: 0.45,
        });
      }

      if (
        domain.includes('shop') ||
        domain.includes('store') ||
        domain.includes('amazon') ||
        domain.includes('ebay')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -10,
          description: 'Hostname matched an e-commerce category rule',
          confidence: 0.4,
        });
      }

      if (
        domain.includes('news') ||
        domain.includes('cnn') ||
        domain.includes('bbc') ||
        domain.includes('reuters')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -15,
          description: 'Hostname matched a news-category rule',
          confidence: 0.4,
        });
      }
    } catch {
      // Invalid URL: no category rule is applied.
    }

    return factors;
  }

  static analyzeTrackerPatterns(domain: string): RiskFactor[] {
    const trackerPatterns = [
      'google-analytics',
      'googletagmanager',
      'doubleclick',
      'facebook.com/tr',
      'connect.facebook.net',
      'amazon-adsystem',
      'googlesyndication',
    ];

    const matchedPatterns = trackerPatterns.filter(pattern =>
      domain.includes(pattern)
    );

    if (matchedPatterns.length === 0) return [];

    return [
      {
        type: 'tracker-patterns',
        impact: -15 * matchedPatterns.length,
        description: `Hostname matched ${matchedPatterns.length} maintained tracker string${
          matchedPatterns.length === 1 ? '' : 's'
        }`,
        confidence: 0.6,
      },
    ];
  }

  static calculateWeightedPrediction(factors: RiskFactor[]): {
    score: number;
    confidence: number;
  } {
    if (factors.length === 0) {
      return { score: 50, confidence: 0 };
    }

    let totalImpact = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      totalImpact += factor.impact * factor.confidence;
      totalWeight += factor.confidence;
    }

    const baseScore = 50;
    const adjustedScore =
      baseScore + (totalWeight > 0 ? totalImpact / totalWeight : 0);
    const score = Math.max(0, Math.min(100, Math.round(adjustedScore)));
    const confidence = Math.min(
      0.6,
      factors.reduce((sum, factor) => sum + factor.confidence, 0) /
        factors.length
    );

    return { score, confidence };
  }
}
