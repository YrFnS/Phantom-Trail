import type { RiskLevel } from './types';

/**
 * Website category classification system
 */

export interface WebsiteCategory {
  id: string;
  name: string;
  description: string;
  averagePrivacyScore: number;
  averageTrackers: number;
  commonTrackers: string[];
  riskProfile: RiskLevel;
  keywords: string[];
  domainPatterns: RegExp[];
  urlPatterns: RegExp[];
}

export interface CategoryBenchmark {
  averageScore: number;
  averageTrackers: number;
  commonRisks: string[];
  topPerformers: string[];
  distribution: number[]; // Score distribution for percentile calculation
}

/**
 * Website categorization engine
 */
export class WebsiteCategorization {
  private static readonly CATEGORIES: WebsiteCategory[] = [
    {
      id: 'e-commerce',
      name: 'E-commerce',
      description: 'Online shopping and retail sites',
      averagePrivacyScore: 72,
      averageTrackers: 8.5,
      commonTrackers: [
        'google-analytics',
        'facebook-pixel',
        'amazon-advertising',
      ],
      riskProfile: 'medium',
      keywords: [
        'shop',
        'buy',
        'cart',
        'checkout',
        'store',
        'product',
        'price',
      ],
      domainPatterns: [
        /amazon\./i,
        /ebay\./i,
        /shopify\./i,
        /etsy\./i,
        /walmart\./i,
        /target\./i,
        /bestbuy\./i,
        /alibaba\./i,
        /aliexpress\./i,
      ],
      urlPatterns: [
        /\/shop/i,
        /\/cart/i,
        /\/checkout/i,
        /\/product/i,
        /\/buy/i,
        /\/store/i,
        /\/catalog/i,
        /\/marketplace/i,
      ],
    },
    {
      id: 'news',
      name: 'News & Media',
      description: 'News websites and media outlets',
      averagePrivacyScore: 65,
      averageTrackers: 12.3,
      commonTrackers: ['google-analytics', 'chartbeat', 'comscore', 'outbrain'],
      riskProfile: 'high',
      keywords: ['news', 'article', 'breaking', 'politics', 'world', 'local'],
      domainPatterns: [
        /cnn\./i,
        /bbc\./i,
        /reuters\./i,
        /nytimes\./i,
        /washingtonpost\./i,
        /guardian\./i,
        /forbes\./i,
        /techcrunch\./i,
        /wired\./i,
      ],
      urlPatterns: [
        /\/news/i,
        /\/article/i,
        /\/story/i,
        /\/politics/i,
        /\/world/i,
        /\/breaking/i,
        /\/opinion/i,
        /\/editorial/i,
      ],
    },
    {
      id: 'social-media',
      name: 'Social Media',
      description: 'Social networks and community platforms',
      averagePrivacyScore: 45,
      averageTrackers: 15.8,
      commonTrackers: [
        'facebook-pixel',
        'twitter-analytics',
        'linkedin-insights',
      ],
      riskProfile: 'critical',
      keywords: ['social', 'profile', 'friends', 'follow', 'share', 'post'],
      domainPatterns: [
        /facebook\./i,
        /twitter\./i,
        /instagram\./i,
        /linkedin\./i,
        /tiktok\./i,
        /snapchat\./i,
        /reddit\./i,
        /discord\./i,
        /telegram\./i,
      ],
      urlPatterns: [
        /\/profile/i,
        /\/user/i,
        /\/friends/i,
        /\/timeline/i,
        /\/feed/i,
        /\/post/i,
        /\/share/i,
        /\/follow/i,
      ],
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      description: 'Streaming, gaming, and entertainment sites',
      averagePrivacyScore: 68,
      averageTrackers: 9.2,
      commonTrackers: ['google-analytics', 'adobe-analytics', 'nielsen'],
      riskProfile: 'medium',
      keywords: ['watch', 'stream', 'video', 'movie', 'game', 'music', 'play'],
      domainPatterns: [
        /netflix\./i,
        /youtube\./i,
        /spotify\./i,
        /twitch\./i,
        /hulu\./i,
        /disney\./i,
        /steam\./i,
        /xbox\./i,
        /playstation\./i,
      ],
      urlPatterns: [
        /\/watch/i,
        /\/video/i,
        /\/stream/i,
        /\/movie/i,
        /\/game/i,
        /\/music/i,
        /\/play/i,
        /\/entertainment/i,
      ],
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Banking, investing, and financial services',
      averagePrivacyScore: 85,
      averageTrackers: 4.1,
      commonTrackers: ['google-analytics', 'adobe-analytics'],
      riskProfile: 'low',
      keywords: [
        'bank',
        'invest',
        'finance',
        'money',
        'loan',
        'credit',
        'payment',
      ],
      domainPatterns: [
        /chase\./i,
        /bankofamerica\./i,
        /wells\./i,
        /paypal\./i,
        /stripe\./i,
        /robinhood\./i,
        /fidelity\./i,
        /schwab\./i,
        /vanguard\./i,
      ],
      urlPatterns: [
        /\/banking/i,
        /\/invest/i,
        /\/finance/i,
        /\/loan/i,
        /\/credit/i,
        /\/payment/i,
        /\/account/i,
        /\/portfolio/i,
      ],
    },
    {
      id: 'technology',
      name: 'Technology',
      description: 'Software, SaaS, and developer tools',
      averagePrivacyScore: 78,
      averageTrackers: 6.7,
      commonTrackers: ['google-analytics', 'mixpanel', 'amplitude'],
      riskProfile: 'low',
      keywords: ['software', 'app', 'api', 'developer', 'code', 'tech', 'saas'],
      domainPatterns: [
        /github\./i,
        /stackoverflow\./i,
        /google\./i,
        /microsoft\./i,
        /apple\./i,
        /slack\./i,
        /zoom\./i,
        /dropbox\./i,
        /atlassian\./i,
      ],
      urlPatterns: [
        /\/api/i,
        /\/docs/i,
        /\/developer/i,
        /\/app/i,
        /\/software/i,
        /\/tech/i,
        /\/code/i,
        /\/tools/i,
      ],
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Educational institutions and learning platforms',
      averagePrivacyScore: 82,
      averageTrackers: 5.3,
      commonTrackers: ['google-analytics', 'adobe-analytics'],
      riskProfile: 'low',
      keywords: [
        'education',
        'learn',
        'course',
        'school',
        'university',
        'study',
      ],
      domainPatterns: [
        /\.edu$/i,
        /coursera\./i,
        /udemy\./i,
        /khan\./i,
        /edx\./i,
        /mit\./i,
        /harvard\./i,
        /stanford\./i,
        /cambridge\./i,
      ],
      urlPatterns: [
        /\/course/i,
        /\/learn/i,
        /\/education/i,
        /\/study/i,
        /\/class/i,
        /\/lecture/i,
        /\/academic/i,
        /\/student/i,
      ],
    },
    {
      id: 'health',
      name: 'Health & Wellness',
      description: 'Medical, fitness, and wellness sites',
      averagePrivacyScore: 88,
      averageTrackers: 3.9,
      commonTrackers: ['google-analytics'],
      riskProfile: 'low',
      keywords: [
        'health',
        'medical',
        'doctor',
        'fitness',
        'wellness',
        'hospital',
      ],
      domainPatterns: [
        /webmd\./i,
        /mayoclinic\./i,
        /healthline\./i,
        /fitbit\./i,
        /myfitnesspal\./i,
        /nike\./i,
        /peloton\./i,
        /headspace\./i,
        /calm\./i,
      ],
      urlPatterns: [
        /\/health/i,
        /\/medical/i,
        /\/fitness/i,
        /\/wellness/i,
        /\/doctor/i,
        /\/hospital/i,
        /\/medicine/i,
        /\/treatment/i,
      ],
    },
  ];

  /**
   * Categorize a website based on domain and URL
   */
  static categorizeWebsite(domain: string, url: string = ''): WebsiteCategory {
    // Check domain patterns first (most reliable)
    for (const category of this.CATEGORIES) {
      for (const pattern of category.domainPatterns) {
        if (pattern.test(domain)) {
          return category;
        }
      }
    }

    // Check URL patterns
    for (const category of this.CATEGORIES) {
      for (const pattern of category.urlPatterns) {
        if (pattern.test(url)) {
          return category;
        }
      }
    }

    // Check keywords in domain
    const domainLower = domain.toLowerCase();
    for (const category of this.CATEGORIES) {
      for (const keyword of category.keywords) {
        if (domainLower.includes(keyword)) {
          return category;
        }
      }
    }

    // Default to general category
    return {
      id: 'general',
      name: 'General',
      description: 'General websites',
      averagePrivacyScore: 70,
      averageTrackers: 8.0,
      commonTrackers: ['google-analytics'],
      riskProfile: 'medium',
      keywords: [],
      domainPatterns: [],
      urlPatterns: [],
    };
  }

  /**
   * Get category by ID
   */
  static getCategoryById(id: string): WebsiteCategory | null {
    return this.CATEGORIES.find(cat => cat.id === id) || null;
  }

  /**
   * Get all available categories
   */
  static getAllCategories(): WebsiteCategory[] {
    return [...this.CATEGORIES];
  }

  /**
   * Get category benchmark data
   */
  static getCategoryBenchmark(categoryId: string): CategoryBenchmark {
    const category = this.getCategoryById(categoryId);
    if (!category) {
      return {
        averageScore: 70,
        averageTrackers: 8.0,
        commonRisks: ['analytics'],
        topPerformers: [],
        distribution: this.generateNormalDistribution(70, 15),
      };
    }

    return {
      averageScore: category.averagePrivacyScore,
      averageTrackers: category.averageTrackers,
      commonRisks: category.commonTrackers,
      topPerformers: this.getTopPerformers(categoryId),
      distribution: this.generateNormalDistribution(
        category.averagePrivacyScore,
        15
      ),
    };
  }

  /**
   * Generate normal distribution for percentile calculations
   */
  private static generateNormalDistribution(
    mean: number,
    stdDev: number
  ): number[] {
    const distribution: number[] = [];
    for (let i = 0; i <= 100; i++) {
      // Simplified normal distribution approximation
      const z = (i - mean) / stdDev;
      const probability =
        Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI * stdDev * stdDev);
      distribution.push(probability);
    }
    return distribution;
  }

  /**
   * Get top performing sites for category
   */
  private static getTopPerformers(categoryId: string): string[] {
    const topPerformers: Record<string, string[]> = {
      'e-commerce': ['duckduckgo.com', 'protonmail.com', 'signal.org'],
      news: ['reuters.com', 'bbc.com', 'npr.org'],
      'social-media': ['mastodon.social', 'diaspora.social'],
      entertainment: ['archive.org', 'vimeo.com'],
      finance: ['mint.com', 'personalcapital.com'],
      technology: ['github.com', 'stackoverflow.com'],
      education: ['khanacademy.org', 'coursera.org'],
      health: ['mayoclinic.org', 'webmd.com'],
    };

    return topPerformers[categoryId] || [];
  }
}
