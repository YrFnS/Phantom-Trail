/**
 * Optional privacy-tool discovery.
 *
 * The management permission can reveal installed extension names and enabled
 * state. P3 requests it only after a visible user action and supports revocation.
 * Phantom Trail still cannot observe another tool's filtering decisions.
 */

import type { TrackingEvent } from './types';

export interface DetectedTool {
  name: string;
  detected: boolean;
  enabled: boolean;
  effectiveness: number;
  blockedCount?: number;
  recommendation: string;
  installUrl?: string;
}

export interface PrivacyToolsStatus {
  tools: DetectedTool[];
  overallEffectiveness: number;
  blockedTrackers: number;
  missedTrackers: number;
  measurementAvailable?: boolean;
  enabledToolCount?: number;
  observedSignals?: number;
  permissionGranted: boolean;
  recommendations: string[];
}

export class PrivacyToolDetector {
  private static readonly OPTIONAL_PERMISSION = 'management' as const;
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

  static async hasDiscoveryPermission(): Promise<boolean> {
    try {
      return await chrome.permissions.contains({
        permissions: [this.OPTIONAL_PERMISSION],
      });
    } catch {
      return false;
    }
  }

  static async requestDiscoveryPermission(): Promise<boolean> {
    try {
      return await chrome.permissions.request({
        permissions: [this.OPTIONAL_PERMISSION],
      });
    } catch (error) {
      console.error('Failed to request optional extension discovery:', error);
      return false;
    }
  }

  static async revokeDiscoveryPermission(): Promise<boolean> {
    try {
      return await chrome.permissions.remove({
        permissions: [this.OPTIONAL_PERMISSION],
      });
    } catch (error) {
      console.error('Failed to revoke optional extension discovery:', error);
      return false;
    }
  }

  static async detectInstalledTools(): Promise<DetectedTool[]> {
    const permissionGranted = await this.hasDiscoveryPermission();
    if (!permissionGranted) return [];

    try {
      const extensions = (await chrome.management.getAll()) || [];
      return this.KNOWN_TOOLS.map(knownTool => {
        const detected = extensions.find(extension =>
          knownTool.patterns.some(pattern =>
            extension.name.toLowerCase().includes(pattern.toLowerCase())
          )
        );

        return {
          name: knownTool.name,
          detected: Boolean(detected),
          enabled: detected?.enabled || false,
          effectiveness: 0,
          recommendation: detected?.enabled
            ? `${knownTool.name} is installed and enabled`
            : `Review ${knownTool.name} manually if it fits your needs`,
          installUrl: knownTool.installUrl,
        };
      });
    } catch (error) {
      console.error('Optional extension discovery failed:', error);
      return [];
    }
  }

  static async analyzeEffectiveness(
    tools: DetectedTool[],
    events: TrackingEvent[]
  ): Promise<PrivacyToolsStatus> {
    const permissionGranted = await this.hasDiscoveryPermission();
    const enabledToolCount = tools.filter(tool => tool.enabled).length;
    const recommendations: string[] = permissionGranted
      ? [
          'Extension discovery confirms installation state only; blocking effectiveness is not measured.',
        ]
      : [
          'Extension discovery is off. Grant the optional permission only when you want Phantom Trail to inspect installed extension names and enabled state.',
        ];

    if (permissionGranted && enabledToolCount === 0) {
      recommendations.push(
        'No supported privacy extension was detected as enabled.'
      );
    }

    if (events.length > 0 && permissionGranted) {
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
      permissionGranted,
      recommendations,
    };
  }

  static getImprovementSuggestions(status: PrivacyToolsStatus): string[] {
    if (!status.permissionGranted) {
      return [
        'Optional extension discovery is disabled; review privacy tools independently or grant access temporarily.',
      ];
    }

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
