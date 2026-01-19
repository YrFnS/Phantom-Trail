/**
 * Privacy Recommendations Engine
 * Provides actionable privacy advice based on detected tracking
 */

import type { TrackingEvent, TrackerType } from './types';

export interface PrivacyAction {
  id: string;
  title: string;
  description: string;
  actionType: 'browser_setting' | 'alternative_service' | 'extension' | 'behavior';
  difficulty: 'easy' | 'medium' | 'advanced';
  impact: 'low' | 'medium' | 'high';
  url?: string;
  steps?: string[];
}

export interface ServiceAlternative {
  original: string;
  alternative: string;
  description: string;
  privacyBenefit: string;
  url: string;
}

export interface InstalledTool {
  name: string;
  detected: boolean;
  effectiveness: number; // 0-100
  recommendation?: string;
}

export class PrivacyRecommendations {
  private static readonly SERVICE_ALTERNATIVES: ServiceAlternative[] = [
    {
      original: 'google.com',
      alternative: 'DuckDuckGo',
      description: 'Privacy-focused search engine',
      privacyBenefit: 'No search tracking or personalized ads',
      url: 'https://duckduckgo.com'
    },
    {
      original: 'gmail.com',
      alternative: 'ProtonMail',
      description: 'End-to-end encrypted email',
      privacyBenefit: 'Emails are encrypted and not scanned for ads',
      url: 'https://protonmail.com'
    },
    {
      original: 'youtube.com',
      alternative: 'Invidious',
      description: 'Privacy-friendly YouTube frontend',
      privacyBenefit: 'Watch YouTube without Google tracking',
      url: 'https://invidious.io'
    },
    {
      original: 'facebook.com',
      alternative: 'Signal',
      description: 'Private messaging app',
      privacyBenefit: 'End-to-end encrypted messaging without data collection',
      url: 'https://signal.org'
    },
    {
      original: 'twitter.com',
      alternative: 'Mastodon',
      description: 'Decentralized social network',
      privacyBenefit: 'No algorithmic timeline or advertising tracking',
      url: 'https://joinmastodon.org'
    }
  ];

  private static readonly TRACKER_ACTIONS: Record<TrackerType, PrivacyAction[]> = {
    advertising: [
      {
        id: 'install-ublock',
        title: 'Install uBlock Origin',
        description: 'Block advertising trackers automatically',
        actionType: 'extension',
        difficulty: 'easy',
        impact: 'high',
        url: 'https://ublockorigin.com',
        steps: ['Visit Chrome Web Store', 'Search for uBlock Origin', 'Click Add to Chrome']
      },
      {
        id: 'disable-ad-personalization',
        title: 'Disable Ad Personalization',
        description: 'Turn off personalized ads in Google settings',
        actionType: 'browser_setting',
        difficulty: 'easy',
        impact: 'medium',
        url: 'https://adssettings.google.com',
        steps: ['Visit Google Ad Settings', 'Turn off Ad Personalization', 'Delete advertising ID']
      }
    ],
    analytics: [
      {
        id: 'enable-dnt',
        title: 'Enable Do Not Track',
        description: 'Tell websites not to track your browsing',
        actionType: 'browser_setting',
        difficulty: 'easy',
        impact: 'low',
        steps: ['Open Chrome Settings', 'Go to Privacy and Security', 'Enable "Send Do Not Track request"']
      },
      {
        id: 'use-private-browsing',
        title: 'Use Incognito Mode',
        description: 'Browse without saving history or cookies',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'medium',
        steps: ['Press Ctrl+Shift+N', 'Browse in incognito window', 'Close when done']
      }
    ],
    social: [
      {
        id: 'review-social-privacy',
        title: 'Review Social Media Privacy Settings',
        description: 'Limit data sharing with third-party websites',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'high',
        steps: ['Visit Facebook Privacy Settings', 'Disable "Apps, Websites and Games"', 'Limit ad data usage']
      },
      {
        id: 'use-social-alternatives',
        title: 'Consider Privacy-Focused Alternatives',
        description: 'Switch to platforms that respect your privacy',
        actionType: 'alternative_service',
        difficulty: 'medium',
        impact: 'high'
      }
    ],
    fingerprinting: [
      {
        id: 'enable-fingerprint-protection',
        title: 'Enable Fingerprinting Protection',
        description: 'Use browser features to prevent fingerprinting',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'high',
        steps: ['Install Firefox', 'Enable Enhanced Tracking Protection', 'Set to Strict mode']
      },
      {
        id: 'use-privacy-browser',
        title: 'Switch to Privacy-Focused Browser',
        description: 'Use Brave or Firefox for better fingerprint protection',
        actionType: 'alternative_service',
        difficulty: 'medium',
        impact: 'high',
        url: 'https://brave.com'
      }
    ],
    cryptomining: [
      {
        id: 'install-mining-blocker',
        title: 'Install Anti-Mining Extension',
        description: 'Block cryptocurrency mining scripts',
        actionType: 'extension',
        difficulty: 'easy',
        impact: 'high',
        url: 'https://github.com/keraf/NoCoin',
        steps: ['Install NoCoin extension', 'Enable mining protection', 'Monitor CPU usage']
      }
    ],
    unknown: [
      {
        id: 'general-privacy-checkup',
        title: 'Perform Privacy Checkup',
        description: 'Review and improve your overall privacy settings',
        actionType: 'browser_setting',
        difficulty: 'easy',
        impact: 'medium',
        url: 'https://myaccount.google.com/privacycheckup',
        steps: ['Visit Google Privacy Checkup', 'Review each section', 'Apply recommended settings']
      }
    ]
  };

  /**
   * Get personalized privacy actions based on detected tracking events
   */
  static async getPersonalizedActions(events: TrackingEvent[]): Promise<PrivacyAction[]> {
    if (events.length === 0) {
      return [];
    }

    const actions: PrivacyAction[] = [];
    const trackerTypes = new Set<TrackerType>();
    const highRiskDomains = new Set<string>();

    // Analyze events to determine recommendations
    for (const event of events) {
      trackerTypes.add(event.trackerType);
      
      if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
        highRiskDomains.add(event.domain);
      }
    }

    // Add actions based on detected tracker types
    for (const trackerType of trackerTypes) {
      const typeActions = this.TRACKER_ACTIONS[trackerType] || [];
      actions.push(...typeActions);
    }

    // Prioritize high-impact, easy actions
    const prioritizedActions = actions
      .filter((action, index, self) => 
        self.findIndex(a => a.id === action.id) === index // Remove duplicates
      )
      .sort((a, b) => {
        // Sort by impact (high first), then difficulty (easy first)
        const impactOrder = { high: 3, medium: 2, low: 1 };
        const difficultyOrder = { easy: 3, medium: 2, advanced: 1 };
        
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        if (impactDiff !== 0) return impactDiff;
        
        return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
      })
      .slice(0, 5); // Limit to top 5 recommendations

    return prioritizedActions;
  }

  /**
   * Get privacy-friendly alternatives for tracked services
   */
  static async suggestAlternatives(domain: string): Promise<ServiceAlternative[]> {
    return this.SERVICE_ALTERNATIVES.filter(alt => 
      domain.includes(alt.original) || alt.original.includes(domain)
    );
  }

  /**
   * Detect installed privacy tools (basic detection)
   */
  static async detectUserTools(): Promise<InstalledTool[]> {
    const tools: InstalledTool[] = [
      {
        name: 'uBlock Origin',
        detected: false,
        effectiveness: 0,
        recommendation: 'Install uBlock Origin for comprehensive ad and tracker blocking'
      },
      {
        name: 'Privacy Badger',
        detected: false,
        effectiveness: 0,
        recommendation: 'Add Privacy Badger for intelligent tracker blocking'
      },
      {
        name: 'DuckDuckGo Privacy Essentials',
        detected: false,
        effectiveness: 0,
        recommendation: 'Install DuckDuckGo extension for search and tracker protection'
      }
    ];

    // Basic detection via extension APIs (limited in content script context)
    try {
      // This is a simplified detection - in practice, we'd need more sophisticated methods
      const extensions = await chrome.management?.getAll?.() || [];
      
      for (const tool of tools) {
        const found = extensions.find(ext => 
          ext.name.toLowerCase().includes(tool.name.toLowerCase())
        );
        
        if (found && found.enabled) {
          tool.detected = true;
          tool.effectiveness = 85; // Estimated effectiveness
          tool.recommendation = `${tool.name} is active and protecting your privacy`;
        }
      }
    } catch {
      // Extension detection not available in this context
      console.log('Extension detection not available');
    }

    return tools;
  }

  /**
   * Get contextual recommendations based on current website
   */
  static async getContextualRecommendations(
    domain: string, 
    events: TrackingEvent[]
  ): Promise<PrivacyAction[]> {
    const actions: PrivacyAction[] = [];
    
    // Banking/financial sites
    if (this.isBankingDomain(domain)) {
      actions.push({
        id: 'banking-privacy',
        title: 'Use Dedicated Browser for Banking',
        description: 'Use a separate browser or incognito mode for financial sites',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'high',
        steps: [
          'Open incognito/private window',
          'Navigate to banking site',
          'Close window when done'
        ]
      });
    }

    // Social media sites
    if (this.isSocialMediaDomain(domain)) {
      actions.push({
        id: 'social-privacy-settings',
        title: 'Review Privacy Settings',
        description: 'Limit data sharing and ad targeting on this platform',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'high'
      });
    }

    // High tracker count
    if (events.length > 10) {
      actions.push({
        id: 'avoid-site',
        title: 'Consider Alternative Website',
        description: 'This site has excessive tracking - look for privacy-friendly alternatives',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'medium'
      });
    }

    return actions;
  }

  private static isBankingDomain(domain: string): boolean {
    const bankingKeywords = ['bank', 'credit', 'financial', 'paypal', 'stripe'];
    return bankingKeywords.some(keyword => domain.includes(keyword));
  }

  private static isSocialMediaDomain(domain: string): boolean {
    const socialKeywords = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'];
    return socialKeywords.some(keyword => domain.includes(keyword));
  }
}
