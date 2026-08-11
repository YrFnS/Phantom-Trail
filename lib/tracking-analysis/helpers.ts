import type { TrackingEvent } from '../types';
import { calculatePrivacyScore } from '../privacy-score';
import { EventsStorage } from '../storage/events-storage';

export class AnalysisHelpers {
  static async getEventsInTimeframe(
    timeframe: number
  ): Promise<TrackingEvent[]> {
    const cutoff = Date.now() - timeframe;
    const allEvents = await EventsStorage.getRecentEvents(1000);
    return allEvents.filter(
      event => (event.lastSeenAt || event.timestamp) >= cutoff
    );
  }

  static async getHistoricalScores(days: number): Promise<Array<number | null>> {
    const allEvents = await EventsStorage.getRecentEvents(1000);
    const scores: Array<number | null> = [];

    for (let index = 0; index < days; index += 1) {
      const dayStart = Date.now() - (index + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = Date.now() - index * 24 * 60 * 60 * 1000;
      const dayEvents = allEvents.filter(event => {
        const timestamp = event.lastSeenAt || event.timestamp;
        return timestamp >= dayStart && timestamp < dayEnd;
      });
      scores.unshift(calculatePrivacyScore(dayEvents, true).score);
    }

    return scores;
  }

  static calculateTrend(scores: Array<number | null>): string {
    const numeric = scores.filter((score): score is number => score !== null);
    if (numeric.length < 2) return 'Insufficient evidence';

    const splitPoint = Math.max(1, Math.floor(numeric.length / 2));
    const olderValues = numeric.slice(0, splitPoint);
    const recentValues = numeric.slice(splitPoint);
    if (recentValues.length === 0) return 'Insufficient evidence';

    const older =
      olderValues.reduce((first, second) => first + second, 0) /
      olderValues.length;
    const recent =
      recentValues.reduce((first, second) => first + second, 0) /
      recentValues.length;
    const difference = recent - older;

    if (difference > 5) return '⬆️ Estimated index increased';
    if (difference < -5) return '⬇️ Estimated index decreased';
    return '➡️ Estimated index stable';
  }

  static getTrackerName(domain: string): string {
    const names: Record<string, string> = {
      'google-analytics.com': 'Google Analytics',
      'doubleclick.net': 'Google DoubleClick',
      'facebook.com': 'Facebook Pixel',
      'googletagmanager.com': 'Google Tag Manager',
      'googlesyndication.com': 'Google AdSense',
    };
    return names[domain] || domain;
  }

  static getTrackerOwner(domain: string): string {
    const owners: Record<string, string> = {
      'google-analytics.com': 'Google LLC',
      'doubleclick.net': 'Google LLC',
      'facebook.com': 'Meta Platforms',
      'googletagmanager.com': 'Google LLC',
      'googlesyndication.com': 'Google LLC',
    };
    return owners[domain] || 'Unknown';
  }
}
