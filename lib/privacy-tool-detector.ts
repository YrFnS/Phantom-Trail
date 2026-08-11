/**
 * Privacy tool discovery.
 *
 * The management API can report whether a recognized extension is installed
 * and enabled. Phantom Trail does not observe the tool's filtering decisions,
 * so it must not claim measured effectiveness or blocked-request totals.
 */

import type { TrackingEvent } from './types';

export interface DetectedTool {
  name: string;
  detected: boolean;
  enabled: boolean;
  /**
   * Deprecated compatibility field. No measured effectiveness value is
   * available, so this remains zero.
   */
  effectiveness: number;
  blockedCount?: number;
  recommendation: string;
  installUrl?: string;
}

export interface PrivacyToolsStatus {
  tools: DetectedTool[];
  /**
   * Deprecated compatibility fields. They remain zero because Phantom Trail
   * does not measure another extension's blocking behavior.
   */
  overallEffectiveness: number;
  blockedTrackers: number;
  missedTrackers: number;
  measurementAvailable?: boolean;
  enabledToolCount?: number;
  observedSignals?: number;
  recommendations: string[];
}

export class PrivacyToolDetector {
  private static readonly KNOWN_TOOLS = [
    {
      name: 'uBlock Origin',
      patterns: ['ublock', 'ublock origin'],
      installUrl: 'https://ublockorigin.com',
    },
    {
      name: 'AdBlock Plus',
      patterns: ['adblock plus', 'adblock'],
      installUrl: 'https://adblockplus.org',
    },
    {
      name: 'Privacy Badger',
      patterns: ['privacy badger'],
      installUrl: 'https://privacybadger.org',
    },
    {
      name: 'Ghostery',
      patterns: ['ghostery'],
      installUrl: 'https://ghostery.com',
    },
    {
      name: 'DuckDuckGo Privacy Essentials',
      patterns: ['duckduckgo', 'privacy essentials'],
      installUrl: 'https://duckduckgo.com/app',
    },
  ];

  static async detectInstalledTools(): Promise<DetectedTool[]> {
    const tools: DetectedTool[] = [];

    try {
      const extensions = (await chrome.management?.getAll?.()) || [];

      for (const knownTool of this.KNOWN_TOOLS) {
        const detected = extensions.find(extension =>
          knownTool.patterns.some(pattern =>
            extension.name.toLowerCase().includes(pattern.toLowerCase())
          )
        );

        tools.push({
          name: knownTool.name,
          detected: Boolean(detected),
          enabled: detected?.enabled || false,
          effectiveness: 0,
          recommendation: detected?.enabled
            ? `${knownTool.name} is installed and enabled`
            : `Review ${knownTool.name} as a possible privacy tool`,
          installUrl: knownTool.installUrl,
        });
      }
    } catch {
      for (const knownTool of this.KNOWN_TOOLS) {
        tools.push({
          name: knownTool.name,
          detected: false,
          enabled: false,
          effectiveness: 0,
          recommendation: `Tool detection was unavailable; review ${knownTool.name} manually`,
          installUrl: knownTool.installUrl,
        });
      }
    }

    return tools;
  }

  static async analyzeEffectiveness(
    tools: DetectedTool[],
    events: TrackingEvent[]
  ): Promise<PrivacyToolsStatus> {
    const enabledToolCount = tools.filter(tool => tool.enabled).length;
    const recommendations: string[] = [
      'Tool discovery confirms installation state only; blocking effectiveness is not measured.',
    ];

    if (enabledToolCount === 0) {
      recommendations.push(
        'No supported privacy extension was detected as enabled.'
      );
    }

    if (events.length > 0) {
      recommendations.push(
        'Recorded Phantom Trail signals do not prove that an installed privacy tool missed or failed to block them.'
      );
    }

    return {
      tools: tools.map(tool => ({
        ...tool,
        effectiveness: 0,
        blockedCount: undefined,
      })),
      overallEffectiveness: 0,
      blockedTrackers: 0,
      missedTrackers: 0,
      measurementAvailable: false,
      enabledToolCount,
      observedSignals: events.length,
      recommendations,
    };
  }

  static getImprovementSuggestions(status: PrivacyToolsStatus): string[] {
    const suggestions: string[] = [];
    const enabledTools = status.tools.filter(tool => tool.enabled);

    if (enabledTools.length === 0) {
      suggestions.push(
        'Review a reputable content blocker or your browser tracking-protection settings.'
      );
    }

    suggestions.push(
      'Verify protection using the privacy tool’s own logs rather than Phantom Trail estimates.'
    );

    return suggestions.slice(0, 3);
  }
}
