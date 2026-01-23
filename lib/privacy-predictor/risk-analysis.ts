import type { RiskFactor, DomainPattern } from './types';

export class RiskAnalysis {
  private static readonly DOMAIN_PATTERNS = new Map<string, DomainPattern>();

  static async analyzeDomainReputation(domain: string): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Check known patterns
    const pattern = this.DOMAIN_PATTERNS.get(domain);
    if (pattern) {
      factors.push({
        type: 'domain-reputation',
        impact: pattern.averageScore > 70 ? 10 : -15,
        description: `Domain has ${pattern.averageScore > 70 ? 'good' : 'poor'} privacy reputation`,
        confidence: 0.8,
      });
    }

    // Analyze domain characteristics
    if (domain.includes('analytics') || domain.includes('tracking')) {
      factors.push({
        type: 'domain-reputation',
        impact: -25,
        description: 'Domain name suggests tracking functionality',
        confidence: 0.9,
      });
    }

    if (domain.includes('privacy') || domain.includes('secure')) {
      factors.push({
        type: 'domain-reputation',
        impact: 15,
        description: 'Domain name suggests privacy focus',
        confidence: 0.7,
      });
    }

    return factors;
  }

  static predictByCategory(url: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Social media platforms
      if (
        domain.includes('facebook') ||
        domain.includes('instagram') ||
        domain.includes('twitter') ||
        domain.includes('tiktok')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -20,
          description:
            'Social media platforms typically have extensive tracking',
          confidence: 0.9,
        });
      }

      // E-commerce
      if (
        domain.includes('shop') ||
        domain.includes('store') ||
        domain.includes('amazon') ||
        domain.includes('ebay')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -10,
          description: 'E-commerce sites often use behavioral tracking',
          confidence: 0.8,
        });
      }

      // News sites
      if (
        domain.includes('news') ||
        domain.includes('cnn') ||
        domain.includes('bbc') ||
        domain.includes('reuters')
      ) {
        factors.push({
          type: 'category-risk',
          impact: -15,
          description: 'News sites commonly use advertising trackers',
          confidence: 0.7,
        });
      }

      // Government/Educational
      if (domain.includes('.gov') || domain.includes('.edu')) {
        factors.push({
          type: 'category-risk',
          impact: 20,
          description:
            'Government/educational sites typically have better privacy',
          confidence: 0.8,
        });
      }
    } catch {
      // Invalid URL, no category prediction
    }

    return factors;
  }

  static analyzeTrackerPatterns(domain: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Common tracker domains
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

    if (matchedPatterns.length > 0) {
      factors.push({
        type: 'tracker-patterns',
        impact: -15 * matchedPatterns.length,
        description: `Domain matches ${matchedPatterns.length} known tracker patterns`,
        confidence: 0.9,
      });
    }

    return factors;
  }

  static calculateWeightedPrediction(factors: RiskFactor[]): {
    score: number;
    confidence: number;
  } {
    if (factors.length === 0) {
      return { score: 50, confidence: 0.1 }; // Default neutral score
    }

    let totalImpact = 0;
    let totalConfidence = 0;
    let weightedConfidence = 0;

    for (const factor of factors) {
      const weight = factor.confidence;
      totalImpact += factor.impact * weight;
      totalConfidence += weight;
      weightedConfidence += factor.confidence;
    }

    // Base score of 70, adjusted by weighted factors
    const baseScore = 70;
    const adjustedScore =
      baseScore + (totalConfidence > 0 ? totalImpact / totalConfidence : 0);

    // Clamp to 0-100 range
    const finalScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

    // Average confidence
    const finalConfidence = Math.min(1, weightedConfidence / factors.length);

    return { score: finalScore, confidence: finalConfidence };
  }
}
