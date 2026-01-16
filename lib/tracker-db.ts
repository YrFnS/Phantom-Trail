import type { TrackerInfo, TrackerType, RiskLevel } from './types';

/**
 * Known tracker database for classification
 * Based on EasyList/EasyPrivacy and Disconnect.me patterns
 */
const KNOWN_TRACKERS: Record<string, TrackerInfo> = {
  // Existing trackers
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

  // FINGERPRINTING TRACKERS (CRITICAL RISK)
  'fingerprint.com': {
    domain: 'fingerprint.com',
    name: 'FingerprintJS',
    category: 'Fingerprinting',
    description: 'Advanced browser fingerprinting - tracks across incognito mode and VPNs',
    riskLevel: 'critical',
  },
  'fp.seon.io': {
    domain: 'fp.seon.io',
    name: 'SEON Fraud Prevention',
    category: 'Fingerprinting',
    description: 'Device fingerprinting for fraud detection and user identification',
    riskLevel: 'critical',
  },
  'maxmind.com': {
    domain: 'maxmind.com',
    name: 'MaxMind GeoIP',
    category: 'Fingerprinting',
    description: 'IP geolocation and device fingerprinting',
    riskLevel: 'high',
  },
  'h.online-metrix.net': {
    domain: 'h.online-metrix.net',
    name: 'ThreatMetrix',
    category: 'Fingerprinting',
    description: 'Device fingerprinting and fraud detection',
    riskLevel: 'high',
  },
  'iovation.com': {
    domain: 'iovation.com',
    name: 'iovation Device Intelligence',
    category: 'Fingerprinting',
    description: 'Device fingerprinting and reputation analysis',
    riskLevel: 'high',
  },

  // SESSION RECORDING (CRITICAL RISK)
  'fullstory.com': {
    domain: 'fullstory.com',
    name: 'FullStory',
    category: 'Analytics',
    description: 'Records every click, keystroke, and mouse movement - complete session replay',
    riskLevel: 'critical',
  },
  'logrocket.com': {
    domain: 'logrocket.com',
    name: 'LogRocket',
    category: 'Analytics',
    description: 'Session replay with console logs and network requests',
    riskLevel: 'critical',
  },
  'smartlook.com': {
    domain: 'smartlook.com',
    name: 'Smartlook',
    category: 'Analytics',
    description: 'Session recording and heatmap tracking',
    riskLevel: 'high',
  },
  'luckyorange.com': {
    domain: 'luckyorange.com',
    name: 'Lucky Orange',
    category: 'Analytics',
    description: 'Live visitor recording and heatmaps',
    riskLevel: 'high',
  },
  'mouseflow.com': {
    domain: 'mouseflow.com',
    name: 'Mouseflow',
    category: 'Analytics',
    description: 'Session replay and form analytics',
    riskLevel: 'high',
  },
  'inspectlet.com': {
    domain: 'inspectlet.com',
    name: 'Inspectlet',
    category: 'Analytics',
    description: 'Session recording and eye-tracking heatmaps',
    riskLevel: 'high',
  },

  // SOCIAL MEDIA TRACKERS (HIGH/MEDIUM RISK)
  'linkedin.com': {
    domain: 'linkedin.com',
    name: 'LinkedIn Insight Tag',
    category: 'Social Media',
    description: 'LinkedIn advertising and conversion tracking',
    riskLevel: 'high',
  },
  'pinterest.com': {
    domain: 'pinterest.com',
    name: 'Pinterest Tag',
    category: 'Social Media',
    description: 'Pinterest advertising and analytics',
    riskLevel: 'medium',
  },
  'snap.com': {
    domain: 'snap.com',
    name: 'Snapchat Pixel',
    category: 'Social Media',
    description: 'Snapchat advertising and conversion tracking',
    riskLevel: 'high',
  },
  'reddit.com': {
    domain: 'reddit.com',
    name: 'Reddit Pixel',
    category: 'Social Media',
    description: 'Reddit advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'twitter.com': {
    domain: 'twitter.com',
    name: 'Twitter/X Pixel',
    category: 'Social Media',
    description: 'Twitter advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'instagram.com': {
    domain: 'instagram.com',
    name: 'Instagram Pixel',
    category: 'Social Media',
    description: 'Instagram advertising (owned by Meta/Facebook)',
    riskLevel: 'medium',
  },

  // ADVERTISING NETWORKS (HIGH RISK)
  'criteo.com': {
    domain: 'criteo.com',
    name: 'Criteo',
    category: 'Advertising',
    description: 'Retargeting and personalized advertising across websites',
    riskLevel: 'high',
  },
  'criteo.net': {
    domain: 'criteo.net',
    name: 'Criteo',
    category: 'Advertising',
    description: 'Retargeting and personalized advertising',
    riskLevel: 'high',
  },
  'taboola.com': {
    domain: 'taboola.com',
    name: 'Taboola',
    category: 'Advertising',
    description: 'Content recommendation and native advertising',
    riskLevel: 'medium',
  },
  'outbrain.com': {
    domain: 'outbrain.com',
    name: 'Outbrain',
    category: 'Advertising',
    description: 'Content discovery and native advertising',
    riskLevel: 'medium',
  },
  'quantcast.com': {
    domain: 'quantcast.com',
    name: 'Quantcast',
    category: 'Advertising',
    description: 'Audience measurement and real-time advertising',
    riskLevel: 'high',
  },
  'adnxs.com': {
    domain: 'adnxs.com',
    name: 'AppNexus',
    category: 'Advertising',
    description: 'Programmatic advertising platform',
    riskLevel: 'high',
  },
  'pubmatic.com': {
    domain: 'pubmatic.com',
    name: 'PubMatic',
    category: 'Advertising',
    description: 'Advertising exchange and supply-side platform',
    riskLevel: 'medium',
  },
  'rubiconproject.com': {
    domain: 'rubiconproject.com',
    name: 'Rubicon Project',
    category: 'Advertising',
    description: 'Advertising exchange and header bidding',
    riskLevel: 'medium',
  },
  'openx.net': {
    domain: 'openx.net',
    name: 'OpenX',
    category: 'Advertising',
    description: 'Programmatic advertising exchange',
    riskLevel: 'medium',
  },
  'adsrvr.org': {
    domain: 'adsrvr.org',
    name: 'The Trade Desk',
    category: 'Advertising',
    description: 'Demand-side advertising platform',
    riskLevel: 'high',
  },

  // ANALYTICS PLATFORMS (MEDIUM RISK)
  'amplitude.com': {
    domain: 'amplitude.com',
    name: 'Amplitude',
    category: 'Analytics',
    description: 'Product analytics and user behavior tracking',
    riskLevel: 'medium',
  },
  'heap.io': {
    domain: 'heap.io',
    name: 'Heap Analytics',
    category: 'Analytics',
    description: 'Automatic event tracking and user analytics',
    riskLevel: 'medium',
  },
  'pendo.io': {
    domain: 'pendo.io',
    name: 'Pendo',
    category: 'Analytics',
    description: 'Product analytics and user guidance',
    riskLevel: 'medium',
  },
  'kissmetrics.com': {
    domain: 'kissmetrics.com',
    name: 'Kissmetrics',
    category: 'Analytics',
    description: 'Customer analytics and behavioral tracking',
    riskLevel: 'medium',
  },
  'woopra.com': {
    domain: 'woopra.com',
    name: 'Woopra',
    category: 'Analytics',
    description: 'Customer journey analytics',
    riskLevel: 'medium',
  },
  'chartbeat.com': {
    domain: 'chartbeat.com',
    name: 'Chartbeat',
    category: 'Analytics',
    description: 'Real-time web analytics for publishers',
    riskLevel: 'low',
  },
  'newrelic.com': {
    domain: 'newrelic.com',
    name: 'New Relic',
    category: 'Analytics',
    description: 'Application performance monitoring',
    riskLevel: 'low',
  },
  'datadoghq.com': {
    domain: 'datadoghq.com',
    name: 'Datadog',
    category: 'Analytics',
    description: 'Infrastructure and application monitoring',
    riskLevel: 'low',
  },

  // AUDIENCE MEASUREMENT (MEDIUM RISK)
  'comscore.com': {
    domain: 'comscore.com',
    name: 'comScore',
    category: 'Analytics',
    description: 'Audience measurement and web analytics',
    riskLevel: 'medium',
  },
  'scorecardresearch.com': {
    domain: 'scorecardresearch.com',
    name: 'ScorecardResearch',
    category: 'Analytics',
    description: 'Market research and audience measurement (comScore)',
    riskLevel: 'medium',
  },
  'nielsen.com': {
    domain: 'nielsen.com',
    name: 'Nielsen',
    category: 'Analytics',
    description: 'Audience measurement and market research',
    riskLevel: 'medium',
  },

  // CDN ANALYTICS (LOW RISK)
  'cloudflare.com': {
    domain: 'cloudflare.com',
    name: 'Cloudflare Analytics',
    category: 'Analytics',
    description: 'CDN analytics and performance monitoring',
    riskLevel: 'low',
  },
  'fastly.net': {
    domain: 'fastly.net',
    name: 'Fastly Insights',
    category: 'Analytics',
    description: 'CDN analytics and edge computing',
    riskLevel: 'low',
  },
  'akamai.net': {
    domain: 'akamai.net',
    name: 'Akamai mPulse',
    category: 'Analytics',
    description: 'Real user monitoring and CDN analytics',
    riskLevel: 'low',
  },

  // ADDITIONAL TRACKING SERVICES
  'optimizely.com': {
    domain: 'optimizely.com',
    name: 'Optimizely',
    category: 'Analytics',
    description: 'A/B testing and experimentation platform',
    riskLevel: 'medium',
  },
  'vwo.com': {
    domain: 'vwo.com',
    name: 'Visual Website Optimizer',
    category: 'Analytics',
    description: 'A/B testing and conversion optimization',
    riskLevel: 'medium',
  },
  'crazyegg.com': {
    domain: 'crazyegg.com',
    name: 'Crazy Egg',
    category: 'Analytics',
    description: 'Heatmaps and user behavior analytics',
    riskLevel: 'medium',
  },
  'branch.io': {
    domain: 'branch.io',
    name: 'Branch',
    category: 'Analytics',
    description: 'Mobile deep linking and attribution',
    riskLevel: 'medium',
  },
  'appsflyer.com': {
    domain: 'appsflyer.com',
    name: 'AppsFlyer',
    category: 'Analytics',
    description: 'Mobile attribution and marketing analytics',
    riskLevel: 'medium',
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
