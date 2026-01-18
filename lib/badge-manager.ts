import type { PrivacyScore } from './types';

export interface BadgeSettings {
  enabled: boolean;
  style: BadgeStyle;
  showScore: boolean;
  showGrade: boolean;
  colorScheme: 'traffic-light' | 'gradient' | 'minimal';
  updateFrequency: 'realtime' | 'periodic' | 'manual';
  showOnlyRisks: boolean;
}

export enum BadgeStyle {
  SCORE_ONLY = 'score',      // "85"
  GRADE_ONLY = 'grade',      // "A"
  ICON_COLOR = 'icon',       // Colored icon only
  COMBINED = 'combined'      // "A 85"
}

export interface PrivacySummary {
  score: number;
  grade: string;
  trackerCount: number;
  riskLevel: string;
}

const STORAGE_KEY = 'phantom-trail-badge-settings';

const COLOR_SCHEMES = {
  'traffic-light': {
    excellent: '#22c55e',  // Green
    good: '#84cc16',       // Light green
    moderate: '#eab308',   // Yellow
    poor: '#f97316',       // Orange
    critical: '#ef4444'    // Red
  },
  'gradient': {
    excellent: '#10b981',
    good: '#34d399',
    moderate: '#fbbf24',
    poor: '#fb923c',
    critical: '#f87171'
  },
  'minimal': {
    excellent: '#6b7280',  // Gray variations
    good: '#6b7280',
    moderate: '#6b7280',
    poor: '#6b7280',
    critical: '#ef4444'    // Only red for critical
  }
};

const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  enabled: true,
  style: BadgeStyle.GRADE_ONLY,
  showScore: true,
  showGrade: true,
  colorScheme: 'traffic-light',
  updateFrequency: 'realtime',
  showOnlyRisks: false
};

export class BadgeManager {
  private static lastUpdateTime = new Map<number, number>();
  private static readonly UPDATE_THROTTLE_MS = 1000; // Max 1 update per second per tab

  static async updateBadge(tabId: number, score: PrivacyScore): Promise<void> {
    try {
      const settings = await this.getBadgeSettings();
      if (!settings.enabled) {
        await this.clearBadge(tabId);
        return;
      }

      // Throttle updates
      const now = Date.now();
      const lastUpdate = this.lastUpdateTime.get(tabId) || 0;
      if (now - lastUpdate < this.UPDATE_THROTTLE_MS) {
        return;
      }
      this.lastUpdateTime.set(tabId, now);

      // Skip if showing only risks and score is good
      if (settings.showOnlyRisks && score.score >= 80) {
        await this.clearBadge(tabId);
        return;
      }

      const badgeText = this.generateBadgeText(score, settings.style);
      const badgeColor = this.getScoreColor(score.score, settings.colorScheme);

      // Update badge text and color
      await chrome.action.setBadgeText({
        text: badgeText,
        tabId: tabId
      });

      await chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId: tabId
      });

      // Update tooltip
      await this.updateTooltip(tabId, {
        score: score.score,
        grade: score.grade,
        trackerCount: score.breakdown.totalTrackers,
        riskLevel: this.getRiskLevel(score.score)
      });

    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  static async setBadgeStyle(style: BadgeStyle): Promise<void> {
    const settings = await this.getBadgeSettings();
    settings.style = style;
    await this.saveBadgeSettings(settings);
  }

  static async clearBadge(tabId: number): Promise<void> {
    try {
      await chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
      
      await chrome.action.setTitle({
        title: 'Phantom Trail - Privacy Monitor',
        tabId: tabId
      });

      this.lastUpdateTime.delete(tabId);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  static async getBadgeSettings(): Promise<BadgeSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return { ...DEFAULT_BADGE_SETTINGS, ...result[STORAGE_KEY] };
    } catch (error) {
      console.error('Failed to get badge settings:', error);
      return DEFAULT_BADGE_SETTINGS;
    }
  }

  static async saveBadgeSettings(settings: BadgeSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    } catch (error) {
      console.error('Failed to save badge settings:', error);
    }
  }

  static async showQuickTooltip(tabId: number, summary: string): Promise<void> {
    try {
      await chrome.action.setTitle({
        title: summary,
        tabId: tabId
      });
    } catch (error) {
      console.error('Failed to show tooltip:', error);
    }
  }

  private static generateBadgeText(score: PrivacyScore, style: BadgeStyle): string {
    switch (style) {
      case BadgeStyle.SCORE_ONLY:
        return score.score.toString();
      case BadgeStyle.GRADE_ONLY:
        return score.grade;
      case BadgeStyle.COMBINED:
        return `${score.grade}${score.score}`;
      case BadgeStyle.ICON_COLOR:
        return ''; // No text, just colored icon
      default:
        return score.grade;
    }
  }

  private static getScoreColor(score: number, colorScheme: BadgeSettings['colorScheme']): string {
    const colors = COLOR_SCHEMES[colorScheme];
    
    if (score >= 90) return colors.excellent;
    if (score >= 80) return colors.good;
    if (score >= 70) return colors.moderate;
    if (score >= 60) return colors.poor;
    return colors.critical;
  }

  private static getRiskLevel(score: number): string {
    if (score >= 90) return 'Minimal';
    if (score >= 80) return 'Low';
    if (score >= 70) return 'Moderate';
    if (score >= 60) return 'High';
    return 'Critical';
  }

  private static async updateTooltip(tabId: number, summary: PrivacySummary): Promise<void> {
    const tooltipText = `Privacy Score: ${summary.score} (${summary.grade})
Trackers: ${summary.trackerCount}
Risk Level: ${summary.riskLevel}
Click for details`;

    await chrome.action.setTitle({
      title: tooltipText,
      tabId: tabId
    });
  }

  // Clean up badge data when tabs are closed
  static cleanupTab(tabId: number): void {
    this.lastUpdateTime.delete(tabId);
  }
}
