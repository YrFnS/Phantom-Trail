import type { TrackerInfo, TrackerType, RiskLevel } from './types';

/**
 * Known tracker database for classification
 * Based on EasyList/EasyPrivacy and Disconnect.me patterns
 */
const KNOWN_TRACKERS: Record<string, TrackerInfo> = {
  'google-analytics.com': {
    domain: 'google-analytics.com',
    name: 'Google Analytics',
    category: 'Analytics',
    description: 'Website analytics and user behavior tracking',
    riskLevel: 'low',
  },
  'googletagmanager.com': {
    domain: 'googletagmanager.com',
    name: 'Google Tag Manager',
    category: 'Analytics',
    description: 'Tag management system for tracking codes',
    riskLevel: 'low',
  },
  'facebook.com': {
    domain: 'facebook.com',
    name: 'Facebook Pixel',
    category: 'Social Media',
    description: 'Social media tracking and advertising',
    riskLevel: 'medium',
  },
  'doubleclick.net': {
    domain: 'doubleclick.net',
    name: 'DoubleClick',
    category: 'Advertising',
    description: 'Google advertising network',
    riskLevel: 'medium',
  },
  'amazon-adsystem.com': {
    domain: 'amazon-adsystem.com',
    name: 'Amazon DSP',
    category: 'Advertising',
    description: 'Amazon advertising platform',
    riskLevel: 'medium',
  },
  'analytics.tiktok.com': {
    domain: 'analytics.tiktok.com',
    name: 'TikTok Pixel',
    category: 'Social Media',
    description: 'TikTok advertising and analytics tracking',
    riskLevel: 'high',
  },
  'clarity.ms': {
    domain: 'clarity.ms',
    name: 'Microsoft Clarity',
    category: 'Analytics',
    description: 'User session recording and heatmaps',
    riskLevel: 'high',
  },
  'hotjar.com': {
    domain: 'hotjar.com',
    name: 'Hotjar',
    category: 'Analytics',
    description: 'User behavior analytics and session recordings',
    riskLevel: 'high',
  },
  'mixpanel.com': {
    domain: 'mixpanel.com',
    name: 'Mixpanel',
    category: 'Analytics',
    description: 'Product analytics and user tracking',
    riskLevel: 'medium',
  },
  'segment.com': {
    domain: 'segment.com',
    name: 'Segment',
    category: 'Analytics',
    description: 'Customer data platform and tracking',
    riskLevel: 'medium',
  },
  'omtrdc.net': {
    domain: 'omtrdc.net',
    name: 'Adobe Analytics',
    category: 'Analytics',
    description: 'Adobe marketing cloud analytics',
    riskLevel: 'medium',
  },
  'salesforce.com': {
    domain: 'salesforce.com',
    name: 'Salesforce Tracking',
    category: 'Analytics',
    description: 'CRM and marketing automation tracking',
    riskLevel: 'medium',
  },
  'hubspot.com': {
    domain: 'hubspot.com',
    name: 'HubSpot',
    category: 'Analytics',
    description: 'Marketing automation and CRM tracking',
    riskLevel: 'medium',
  },
  'intercom.io': {
    domain: 'intercom.io',
    name: 'Intercom',
    category: 'Analytics',
    description: 'Customer messaging and behavior tracking',
    riskLevel: 'medium',
  },
  'zendesk.com': {
    domain: 'zendesk.com',
    name: 'Zendesk',
    category: 'Analytics',
    description: 'Customer support and user tracking',
    riskLevel: 'low',
  },
};

/**
 * Tracker classification and detection utilities
 */
export class TrackerDatabase {
  /**
   * Classify a URL as a potential tracker
   */
  static classifyUrl(url: string): TrackerInfo | null {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const search = urlObj.search.toLowerCase();

      // Check exact domain match
      if (KNOWN_TRACKERS[domain]) {
        return KNOWN_TRACKERS[domain];
      }

      // Check subdomain matches (e.g., *.google-analytics.com)
      for (const [trackerDomain, info] of Object.entries(KNOWN_TRACKERS)) {
        if (domain.endsWith(`.${trackerDomain}`) || domain === trackerDomain) {
          return info;
        }
      }

      // Check path-based detection
      const trackingPaths = ['/gtag/', '/pixel/', '/collect/', '/beacon/', '/track/', '/analytics/'];
      if (trackingPaths.some(trackingPath => path.includes(trackingPath))) {
        return {
          domain,
          name: `Path-based Tracker (${domain})`,
          category: 'Analytics',
          description: 'Detected by tracking path pattern',
          riskLevel: 'medium',
        };
      }

      // Check query parameter detection
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', '_ga', 'mc_eid'];
      if (trackingParams.some(param => search.includes(param))) {
        return {
          domain,
          name: `Parameter-based Tracker (${domain})`,
          category: 'Analytics',
          description: 'Detected by tracking parameters',
          riskLevel: 'low',
        };
      }

      // Heuristic detection for unknown trackers
      return this.detectByHeuristics(url, domain);
    } catch (error) {
      console.error('Failed to classify URL:', error);
      return null;
    }
  }

  /**
   * Detect trackers using heuristic patterns
   */
  private static detectByHeuristics(
    url: string,
    domain: string
  ): TrackerInfo | null {
    const suspiciousPatterns = [
      /analytics?/i,
      /tracking?/i,
      /pixel/i,
      /beacon/i,
      /collect/i,
      /metrics?/i,
      /stats?/i,
    ];

    const advertisingPatterns = [
      /ads?/i,
      /doubleclick/i,
      /adsystem/i,
      /advertising/i,
      /adnxs/i,
      /googlesyndication/i,
    ];

    const socialPatterns = [
      /facebook/i,
      /twitter/i,
      /linkedin/i,
      /instagram/i,
      /tiktok/i,
    ];

    // Check URL path and query parameters
    const fullUrl = url.toLowerCase();

    if (advertisingPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Unknown Advertising Tracker (${domain})`,
        category: 'Advertising',
        description: 'Detected advertising tracker',
        riskLevel: 'medium',
      };
    }

    if (socialPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Social Media Tracker (${domain})`,
        category: 'Social Media',
        description: 'Social media tracking detected',
        riskLevel: 'medium',
      };
    }

    if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Analytics Tracker (${domain})`,
        category: 'Analytics',
        description: 'Analytics tracking detected',
        riskLevel: 'low',
      };
    }

    return null;
  }

  /**
   * Get tracker type from category
   */
  static getTrackerType(category: string): TrackerType {
    switch (category.toLowerCase()) {
      case 'advertising':
        return 'advertising';
      case 'analytics':
        return 'analytics';
      case 'social media':
        return 'social';
      case 'fingerprinting':
        return 'fingerprinting';
      case 'cryptomining':
        return 'cryptomining';
      default:
        return 'unknown';
    }
  }

  /**
   * Calculate risk score for multiple trackers
   */
  static calculateOverallRisk(trackers: TrackerInfo[]): RiskLevel {
    if (trackers.length === 0) return 'low';

    const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalScore = trackers.reduce((sum, tracker) => {
      return sum + riskScores[tracker.riskLevel];
    }, 0);

    const averageScore = totalScore / trackers.length;
    const trackerCount = trackers.length;

    // Adjust risk based on number of trackers
    let adjustedScore = averageScore;
    if (trackerCount > 10) adjustedScore += 1;
    if (trackerCount > 20) adjustedScore += 1;

    if (adjustedScore >= 3.5) return 'critical';
    if (adjustedScore >= 2.5) return 'high';
    if (adjustedScore >= 1.5) return 'medium';
    return 'low';
  }
}
