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
  SCORE_ONLY = 'score',
  GRADE_ONLY = 'grade',
  ICON_COLOR = 'icon',
  COMBINED = 'combined',
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
    excellent: '#22c55e',
    good: '#84cc16',
    moderate: '#eab308',
    poor: '#f97316',
    critical: '#ef4444',
  },
  gradient: {
    excellent: '#10b981',
    good: '#34d399',
    moderate: '#fbbf24',
    poor: '#fb923c',
    critical: '#f87171',
  },
  minimal: {
    excellent: '#6b7280',
    good: '#6b7280',
    moderate: '#6b7280',
    poor: '#6b7280',
    critical: '#ef4444',
  },
};

const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  enabled: false,
  style: BadgeStyle.GRADE_ONLY,
  showScore: false,
  showGrade: true,
  colorScheme: 'traffic-light',
  updateFrequency: 'realtime',
  showOnlyRisks: false,
};

export class BadgeManager {
  private static lastUpdateTime = new Map<number, number>();
  private static readonly UPDATE_THROTTLE_MS = 1000;

  static async updateBadge(tabId: number, score: PrivacyScore): Promise<void> {
    try {
      const settings = await this.getBadgeSettings();
      if (!settings.enabled) {
        await this.clearBadge(tabId);
        return;
      }

      const now = Date.now();
      const lastUpdate = this.lastUpdateTime.get(tabId) || 0;
      if (now - lastUpdate < this.UPDATE_THROTTLE_MS) return;
      this.lastUpdateTime.set(tabId, now);

      if (settings.showOnlyRisks && score.score >= 80) {
        await this.clearBadge(tabId);
        return;
      }

      await chrome.action.setBadgeText({
        text: this.generateBadgeText(score, settings.style),
        tabId,
      });
      await chrome.action.setBadgeBackgroundColor({
        color: this.getScoreColor(score.score, settings.colorScheme),
        tabId,
      });
      await this.updateTooltip(tabId, {
        score: score.score,
        grade: score.grade,
        trackerCount: score.breakdown.totalTrackers,
        riskLevel: this.getSignalLabel(score.score),
      });
    } catch (error) {
      console.error('Failed to update experimental badge:', error);
    }
  }

  static async setBadgeStyle(style: BadgeStyle): Promise<void> {
    const settings = await this.getBadgeSettings();
    settings.style = style;
    await this.saveBadgeSettings(settings);
  }

  static async clearBadge(tabId: number): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: '', tabId });
      await chrome.action.setTitle({
        title: 'Phantom Trail - Experimental Signal Monitor',
        tabId,
      });
      this.lastUpdateTime.delete(tabId);
    } catch (error) {
      console.error('Failed to clear experimental badge:', error);
    }
  }

  static async getBadgeSettings(): Promise<BadgeSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return { ...DEFAULT_BADGE_SETTINGS, ...result[STORAGE_KEY] };
    } catch (error) {
      console.error('Failed to get badge settings:', error);
      return { ...DEFAULT_BADGE_SETTINGS };
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
        title: `Experimental detector summary: ${summary}`,
        tabId,
      });
    } catch (error) {
      console.error('Failed to show experimental tooltip:', error);
    }
  }

  private static generateBadgeText(
    score: PrivacyScore,
    style: BadgeStyle
  ): string {
    switch (style) {
      case BadgeStyle.SCORE_ONLY:
        return score.score.toString();
      case BadgeStyle.GRADE_ONLY:
        return score.grade;
      case BadgeStyle.COMBINED:
        return `${score.grade}${score.score}`;
      case BadgeStyle.ICON_COLOR:
        return '';
      default:
        return score.grade;
    }
  }

  private static getScoreColor(
    score: number,
    colorScheme: BadgeSettings['colorScheme']
  ): string {
    const colors = COLOR_SCHEMES[colorScheme];
    if (score >= 90) return colors.excellent;
    if (score >= 80) return colors.good;
    if (score >= 70) return colors.moderate;
    if (score >= 60) return colors.poor;
    return colors.critical;
  }

  private static getSignalLabel(score: number): string {
    if (score >= 90) return 'minimal penalty';
    if (score >= 80) return 'low penalty';
    if (score >= 70) return 'moderate penalty';
    if (score >= 60) return 'high penalty';
    return 'critical penalty';
  }

  private static async updateTooltip(
    tabId: number,
    summary: PrivacySummary
  ): Promise<void> {
    const tooltipText = `Experimental heuristic: ${summary.score} (${summary.grade})
Recorded signals: ${summary.trackerCount}
Model label: ${summary.riskLevel}
Not a verified privacy or safety rating`;

    await chrome.action.setTitle({ title: tooltipText, tabId });
  }

  static cleanupTab(tabId: number): void {
    this.lastUpdateTime.delete(tabId);
  }
}
