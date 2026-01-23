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
      (event: TrackingEvent) => event.timestamp >= cutoff
    );
  }

  static async getHistoricalScores(days: number): Promise<number[]> {
    const scores: number[] = [];
    for (let i = 0; i < days; i++) {
      const dayStart = Date.now() - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = Date.now() - i * 24 * 60 * 60 * 1000;
      const dayEvents = await this.getEventsInTimeframe(dayEnd - dayStart);
      const dayScore = calculatePrivacyScore(
        dayEvents.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd),
        true
      );
      scores.unshift(dayScore.score);
    }
    return scores;
  }

  static calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'stable';
    const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const diff = recent - older;

    if (diff > 5) return '⬆️ Improving';
    if (diff < -5) return '⬇️ Declining';
    return '➡️ Stable';
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
