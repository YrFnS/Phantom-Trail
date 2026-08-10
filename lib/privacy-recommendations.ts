/**
 * Prototype suggestion rules.
 *
 * Suggestions are generated from heuristic event labels and static domain
 * strings. They are not endorsements, measured impact estimates, or proof that
 * a particular action is necessary or effective for the user.
 */

import type { TrackingEvent, TrackerType } from './types';

export interface PrivacyAction {
  id: string;
  title: string;
  description: string;
  actionType:
    | 'browser_setting'
    | 'alternative_service'
    | 'extension'
    | 'behavior';
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
  effectiveness: number;
  recommendation?: string;
}

export class PrivacyRecommendations {
  private static readonly SERVICE_ALTERNATIVES: ServiceAlternative[] = [
    {
      original: 'google.com',
      alternative: 'DuckDuckGo',
      description: 'Alternative search provider listed by the prototype',
      privacyBenefit:
        'Review the provider policy and independent assessments before switching',
      url: 'https://duckduckgo.com',
    },
    {
      original: 'gmail.com',
      alternative: 'Proton Mail',
      description: 'Alternative email provider listed by the prototype',
      privacyBenefit:
        'Review encryption scope, metadata handling, account recovery, and provider policy',
      url: 'https://proton.me/mail',
    },
    {
      original: 'youtube.com',
      alternative: 'Invidious',
      description: 'Third-party YouTube frontend listed by the prototype',
      privacyBenefit:
        'Availability, instance operators, logging, and privacy behavior vary by instance',
      url: 'https://invidious.io',
    },
    {
      original: 'facebook.com',
      alternative: 'Signal',
      description: 'Messaging service listed as a possible alternative use case',
      privacyBenefit:
        'It is not a direct replacement for every social-network feature; review its policy and threat model',
      url: 'https://signal.org',
    },
    {
      original: 'twitter.com',
      alternative: 'Mastodon',
      description: 'Federated social platform listed by the prototype',
      privacyBenefit:
        'Privacy and moderation practices depend on the selected server operator',
      url: 'https://joinmastodon.org',
    },
  ];

  private static readonly TRACKER_ACTIONS: Record<
    TrackerType,
    PrivacyAction[]
  > = {
    advertising: [
      {
        id: 'review-content-blocker',
        title: 'Review Content-Blocking Options',
        description:
          'Compare browser controls and reputable content blockers for your browser and needs',
        actionType: 'extension',
        difficulty: 'easy',
        impact: 'high',
        url: 'https://github.com/gorhill/uBlock',
        steps: [
          'Confirm the official publisher and supported browser',
          'Review requested permissions and current project documentation',
          'Test behavior on sites you use and keep the extension updated',
        ],
      },
      {
        id: 'review-ad-settings',
        title: 'Review Advertising Preferences',
        description:
          'Review account and browser advertising controls; these controls may not stop all tracking',
        actionType: 'browser_setting',
        difficulty: 'easy',
        impact: 'medium',
        url: 'https://adssettings.google.com',
      },
    ],
    analytics: [
      {
        id: 'review-browser-controls',
        title: 'Review Browser Privacy Controls',
        description:
          'Check cookie, site-data, tracking-protection, and permission settings available in the browser',
        actionType: 'browser_setting',
        difficulty: 'easy',
        impact: 'medium',
      },
      {
        id: 'understand-private-browsing',
        title: 'Review Private-Browsing Limits',
        description:
          'Private windows reduce local history persistence but do not make browsing anonymous or prevent websites and networks from observing activity',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'low',
      },
    ],
    social: [
      {
        id: 'review-social-settings',
        title: 'Review Platform Privacy Settings',
        description:
          'Check data-sharing, advertising, visibility, connected-app, and off-platform activity controls',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'medium',
      },
      {
        id: 'review-social-alternatives',
        title: 'Compare Alternative Services',
        description:
          'Compare features, operators, policies, metadata handling, and migration costs before changing services',
        actionType: 'alternative_service',
        difficulty: 'medium',
        impact: 'medium',
      },
    ],
    fingerprinting: [
      {
        id: 'review-fingerprinting-controls',
        title: 'Review Fingerprinting Protections',
        description:
          'Compare built-in browser protections and their compatibility trade-offs; the recorded signal is not proof that a fingerprint was retained',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'medium',
      },
    ],
    cryptomining: [
      {
        id: 'review-resource-usage',
        title: 'Review Unexpected Resource Usage',
        description:
          'Check browser task-manager and system resource usage before concluding that mining occurred',
        actionType: 'behavior',
        difficulty: 'medium',
        impact: 'medium',
      },
    ],
    unknown: [
      {
        id: 'review-recorded-evidence',
        title: 'Review the Recorded Evidence',
        description:
          'Inspect the event URL, detector, and context before changing settings or installing software',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'low',
      },
    ],
  };

  static async getPersonalizedActions(
    events: TrackingEvent[]
  ): Promise<PrivacyAction[]> {
    if (events.length === 0) return [];

    const actions: PrivacyAction[] = [];
    const trackerTypes = new Set(events.map(event => event.trackerType));

    for (const trackerType of trackerTypes) {
      actions.push(...(this.TRACKER_ACTIONS[trackerType] || []));
    }

    const impactOrder = { high: 3, medium: 2, low: 1 };
    const difficultyOrder = { easy: 3, medium: 2, advanced: 1 };

    return actions
      .filter(
        (action, index, all) =>
          all.findIndex(candidate => candidate.id === action.id) === index
      )
      .sort((first, second) => {
        const impactDifference =
          impactOrder[second.impact] - impactOrder[first.impact];
        return impactDifference !== 0
          ? impactDifference
          : difficultyOrder[second.difficulty] -
              difficultyOrder[first.difficulty];
      })
      .slice(0, 5);
  }

  static async suggestAlternatives(
    domain: string
  ): Promise<ServiceAlternative[]> {
    return this.SERVICE_ALTERNATIVES.filter(
      alternative =>
        domain.includes(alternative.original) ||
        alternative.original.includes(domain)
    );
  }

  /**
   * Discover only supported extension names and enabled state.
   * Effectiveness remains zero because blocked requests are not measured.
   */
  static async detectUserTools(): Promise<InstalledTool[]> {
    const tools: InstalledTool[] = [
      { name: 'uBlock Origin', detected: false, effectiveness: 0 },
      { name: 'Privacy Badger', detected: false, effectiveness: 0 },
      {
        name: 'DuckDuckGo Privacy Essentials',
        detected: false,
        effectiveness: 0,
      },
    ];

    try {
      const extensions = (await chrome.management?.getAll?.()) || [];
      for (const tool of tools) {
        const found = extensions.find(extension =>
          extension.name.toLowerCase().includes(tool.name.toLowerCase())
        );
        tool.detected = Boolean(found?.enabled);
        tool.recommendation = found?.enabled
          ? `${tool.name} appears enabled; Phantom Trail does not measure its blocking results`
          : `${tool.name} was not found as an enabled extension; review official sources before installing anything`;
      }
    } catch {
      for (const tool of tools) {
        tool.recommendation =
          'Installed-extension discovery was unavailable in this context';
      }
    }

    return tools;
  }

  static async getContextualRecommendations(
    domain: string,
    events: TrackingEvent[]
  ): Promise<PrivacyAction[]> {
    const actions: PrivacyAction[] = [];

    if (this.isBankingDomain(domain)) {
      actions.push({
        id: 'banking-review',
        title: 'Review Sensitive-Site Practices',
        description:
          'Confirm the domain, use current browser and operating-system updates, and review account-security guidance from the institution',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'high',
      });
    }

    if (this.isSocialMediaDomain(domain)) {
      actions.push({
        id: 'social-settings-review',
        title: 'Review Platform Controls',
        description:
          'The hostname matched a social-platform rule; review account controls without assuming the recorded events describe all platform behavior',
        actionType: 'browser_setting',
        difficulty: 'medium',
        impact: 'medium',
      });
    }

    if (events.length > 10) {
      actions.push({
        id: 'review-signal-volume',
        title: 'Review the Signal Volume',
        description:
          'More than ten heuristic events were recorded. Check duplicates, attribution, and false positives before deciding whether to use an alternative service.',
        actionType: 'behavior',
        difficulty: 'easy',
        impact: 'low',
      });
    }

    return actions;
  }

  private static isBankingDomain(domain: string): boolean {
    return ['bank', 'credit', 'financial', 'paypal', 'stripe'].some(token =>
      domain.includes(token)
    );
  }

  private static isSocialMediaDomain(domain: string): boolean {
    return ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'].some(
      token => domain.includes(token)
    );
  }
}
