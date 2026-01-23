/**
 * Privacy Tool Detection and Integration
 * Detects installed privacy tools and shows effectiveness
 */

import type { TrackingEvent } from './types';

export interface DetectedTool {
  name: string;
  detected: boolean;
  enabled: boolean;
  effectiveness: number; // 0-100
  blockedCount?: number;
  recommendation: string;
  installUrl?: string;
}

export interface PrivacyToolsStatus {
  tools: DetectedTool[];
  overallEffectiveness: number;
  blockedTrackers: number;
  missedTrackers: number;
  recommendations: string[];
}

export class PrivacyToolDetector {
  private static readonly KNOWN_TOOLS = [
    {
      name: 'uBlock Origin',
      patterns: ['ublock', 'ublock origin'],
      effectiveness: 95,
      installUrl: 'https://ublockorigin.com',
    },
    {
      name: 'AdBlock Plus',
      patterns: ['adblock plus', 'adblock'],
      effectiveness: 80,
      installUrl: 'https://adblockplus.org',
    },
    {
      name: 'Privacy Badger',
      patterns: ['privacy badger'],
      effectiveness: 75,
      installUrl: 'https://privacybadger.org',
    },
    {
      name: 'Ghostery',
      patterns: ['ghostery'],
      effectiveness: 85,
      installUrl: 'https://ghostery.com',
    },
    {
      name: 'DuckDuckGo Privacy Essentials',
      patterns: ['duckduckgo', 'privacy essentials'],
      effectiveness: 70,
      installUrl: 'https://duckduckgo.com/app',
    },
  ];

  /**
   * Detect installed privacy tools
   */
  static async detectInstalledTools(): Promise<DetectedTool[]> {
    const tools: DetectedTool[] = [];

    try {
      // Try to get installed extensions (requires management permission)
      const extensions = (await chrome.management?.getAll?.()) || [];

      for (const knownTool of this.KNOWN_TOOLS) {
        const detected = extensions.find(ext =>
          knownTool.patterns.some(pattern =>
            ext.name.toLowerCase().includes(pattern.toLowerCase())
          )
        );

        tools.push({
          name: knownTool.name,
          detected: !!detected,
          enabled: detected?.enabled || false,
          effectiveness: detected?.enabled ? knownTool.effectiveness : 0,
          recommendation: detected?.enabled
            ? `${knownTool.name} is protecting your privacy`
            : `Install ${knownTool.name} for better protection`,
          installUrl: knownTool.installUrl,
        });
      }
    } catch {
      // Management API not available - use heuristic detection
      for (const knownTool of this.KNOWN_TOOLS) {
        tools.push({
          name: knownTool.name,
          detected: false,
          enabled: false,
          effectiveness: 0,
          recommendation: `Install ${knownTool.name} for ${knownTool.effectiveness}% tracker blocking`,
          installUrl: knownTool.installUrl,
        });
      }
    }

    return tools;
  }

  /**
   * Analyze tool effectiveness against detected trackers
   */
  static async analyzeEffectiveness(
    tools: DetectedTool[],
    events: TrackingEvent[]
  ): Promise<PrivacyToolsStatus> {
    const enabledTools = tools.filter(tool => tool.enabled);
    const totalTrackers = events.length;

    // Estimate blocked trackers based on tool effectiveness
    let estimatedBlocked = 0;
    if (enabledTools.length > 0) {
      const maxEffectiveness = Math.max(
        ...enabledTools.map(t => t.effectiveness)
      );
      estimatedBlocked = Math.floor(totalTrackers * (maxEffectiveness / 100));
    }

    const missedTrackers = totalTrackers - estimatedBlocked;
    const overallEffectiveness =
      totalTrackers > 0
        ? Math.round((estimatedBlocked / totalTrackers) * 100)
        : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (enabledTools.length === 0) {
      recommendations.push(
        'Install a privacy tool like uBlock Origin for automatic protection'
      );
    } else if (overallEffectiveness < 80) {
      recommendations.push(
        'Consider adding Privacy Badger for better tracker detection'
      );
    }

    if (missedTrackers > 5) {
      recommendations.push(
        'Enable strict tracking protection in your browser settings'
      );
    }

    // Update tools with estimated blocked counts
    const updatedTools = tools.map(tool => ({
      ...tool,
      blockedCount: tool.enabled
        ? Math.floor(totalTrackers * (tool.effectiveness / 100))
        : 0,
    }));

    return {
      tools: updatedTools,
      overallEffectiveness,
      blockedTrackers: estimatedBlocked,
      missedTrackers,
      recommendations,
    };
  }

  /**
   * Get improvement suggestions based on current setup
   */
  static getImprovementSuggestions(status: PrivacyToolsStatus): string[] {
    const suggestions: string[] = [];
    const { tools, overallEffectiveness, missedTrackers } = status;

    const hasUBlock = tools.find(t => t.name.includes('uBlock') && t.enabled);
    const hasPrivacyBadger = tools.find(
      t => t.name.includes('Privacy Badger') && t.enabled
    );

    if (!hasUBlock) {
      suggestions.push(
        'Install uBlock Origin - the most effective ad and tracker blocker'
      );
    }

    if (!hasPrivacyBadger && missedTrackers > 3) {
      suggestions.push('Add Privacy Badger for intelligent tracker learning');
    }

    if (overallEffectiveness < 70) {
      suggestions.push(
        'Enable Enhanced Tracking Protection in Firefox or use Brave browser'
      );
    }

    if (tools.every(t => !t.enabled)) {
      suggestions.push('Your current setup provides no tracker protection');
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }
}
