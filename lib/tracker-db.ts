import type { RiskLevel, TrackerInfo, TrackerMatch, TrackerType } from './types';
import {
  ANALYTICS_TRACKERS,
  ADVERTISING_TRACKERS,
  SOCIAL_MEDIA_TRACKERS,
  FINGERPRINTING_TRACKERS,
  CRYPTOMINING_TRACKERS,
} from './trackers';
import { matchTrackerUrl } from './tracker-match.mts';

const KNOWN_TRACKERS: Record<string, TrackerInfo> = {
  ...ANALYTICS_TRACKERS,
  ...ADVERTISING_TRACKERS,
  ...SOCIAL_MEDIA_TRACKERS,
  ...FINGERPRINTING_TRACKERS,
  ...CRYPTOMINING_TRACKERS,
};

/**
 * Tracker classification and detection utilities.
 *
 * P1 exposes the exact rule, evidence, and confidence instead of returning only
 * a category label. A rule match still does not establish tracking intent or
 * data collection.
 */
export class TrackerDatabase {
  static matchUrl(url: string): TrackerMatch | null {
    return matchTrackerUrl(url, KNOWN_TRACKERS);
  }

  /** Compatibility wrapper for callers that only need the catalog label. */
  static classifyUrl(url: string): TrackerInfo | null {
    return this.matchUrl(url)?.tracker || null;
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
    const totalScore = trackers.reduce(
      (sum, tracker) => sum + riskScores[tracker.riskLevel],
      0
    );

    let adjustedScore = totalScore / trackers.length;
    if (trackers.length > 10) adjustedScore += 1;
    if (trackers.length > 20) adjustedScore += 1;

    if (adjustedScore >= 3.5) return 'critical';
    if (adjustedScore >= 2.5) return 'high';
    if (adjustedScore >= 1.5) return 'medium';
    return 'low';
  }
}
