import type { TrackerInfo, TrackerType, RiskLevel } from './types';
import {
  ANALYTICS_TRACKERS,
  ADVERTISING_TRACKERS,
  SOCIAL_MEDIA_TRACKERS,
  FINGERPRINTING_TRACKERS,
  CRYPTOMINING_TRACKERS,
} from './trackers';

/**
 * Combined tracker database from all categories.
 */
const KNOWN_TRACKERS: Record<string, TrackerInfo> = {
  ...ANALYTICS_TRACKERS,
  ...ADVERTISING_TRACKERS,
  ...SOCIAL_MEDIA_TRACKERS,
  ...FINGERPRINTING_TRACKERS,
  ...CRYPTOMINING_TRACKERS,
};

/**
 * Experimental URL classification utilities.
 *
 * A returned entry means that a hostname, path, query parameter, or maintained
 * catalog rule matched. It does not prove tracking intent or data collection.
 */
export class TrackerDatabase {
  static classifyUrl(url: string): TrackerInfo | null {
    try {
      const urlObject = new URL(url);
      const domain = urlObject.hostname.toLowerCase();
      const path = urlObject.pathname.toLowerCase();
      const search = urlObject.search.toLowerCase();

      if (KNOWN_TRACKERS[domain]) {
        return KNOWN_TRACKERS[domain];
      }

      for (const [trackerDomain, info] of Object.entries(KNOWN_TRACKERS)) {
        if (domain.endsWith(`.${trackerDomain}`) || domain === trackerDomain) {
          return info;
        }
      }

      const trackingPaths = [
        '/gtag/',
        '/pixel/',
        '/collect/',
        '/beacon/',
        '/track/',
        '/analytics/',
      ];
      if (trackingPaths.some(trackingPath => path.includes(trackingPath))) {
        return {
          domain,
          name: `Path-pattern signal (${domain})`,
          category: 'Analytics',
          description:
            'The URL path matched a broad prototype tracking token; ordinary application endpoints can trigger this rule',
          riskLevel: 'medium',
        };
      }

      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'fbclid',
        'gclid',
        '_ga',
        'mc_eid',
      ];
      if (trackingParams.some(parameter => search.includes(parameter))) {
        return {
          domain,
          name: `Attribution-parameter signal (${domain})`,
          category: 'Analytics',
          description:
            'The URL query contained a maintained attribution parameter; the parameter alone does not prove tracking or data collection',
          riskLevel: 'low',
        };
      }

      return this.detectByHeuristics(url, domain);
    } catch (error) {
      console.error('Failed to classify URL:', error);
      return null;
    }
  }

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

    const fullUrl = url.toLowerCase();

    if (advertisingPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Advertising-related URL match (${domain})`,
        category: 'Advertising',
        description:
          'The URL or hostname matched a prototype advertising-related token; token matches can be false positives',
        riskLevel: 'medium',
      };
    }

    if (socialPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Social-platform URL match (${domain})`,
        category: 'Social Media',
        description:
          'The URL or hostname matched a prototype social-platform token; this does not establish cross-site tracking or data sharing',
        riskLevel: 'medium',
      };
    }

    if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
      return {
        domain,
        name: `Analytics-related URL match (${domain})`,
        category: 'Analytics',
        description:
          'The URL or hostname matched a broad analytics-related token; this rule can classify ordinary resources',
        riskLevel: 'low',
      };
    }

    return null;
  }

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

  static calculateOverallRisk(trackers: TrackerInfo[]): RiskLevel {
    if (trackers.length === 0) return 'low';

    const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalScore = trackers.reduce((sum, tracker) => {
      return sum + riskScores[tracker.riskLevel];
    }, 0);

    const averageScore = totalScore / trackers.length;
    const trackerCount = trackers.length;

    let adjustedScore = averageScore;
    if (trackerCount > 10) adjustedScore += 1;
    if (trackerCount > 20) adjustedScore += 1;

    if (adjustedScore >= 3.5) return 'critical';
    if (adjustedScore >= 2.5) return 'high';
    if (adjustedScore >= 1.5) return 'medium';
    return 'low';
  }
}
