import { calculatePrivacyScore } from '../privacy-score';
import type {
  EvidenceCoverageConfidence,
  EvidenceScoreStatus,
  TrackingEvent,
} from '../types';
import { EventsStorage } from '../storage/events-storage';
import {
  eventMatchesPageDomain,
  getPageDomain,
  normalizeDomain,
} from '../event-attribution.mts';

export interface UserComparison {
  status: 'observational-only';
  currentSite: {
    domain: string;
    privacyScore: number | null;
    scoreStatus: EvidenceScoreStatus;
    scoreConfidence: EvidenceCoverageConfidence;
  };
  userAverage: {
    privacyScore: number | null;
    totalEstimatedSites: number;
  };
  percentile: null;
  insight: string;
  betterThanUsual: null;
}

/**
 * Summarizes local estimated indices without converting them into a browsing
 * privacy percentile. Page exposure and evidence coverage are not controlled,
 * so a ranking would be misleading.
 */
export class UserComparisonService {
  static async compare(domain: string): Promise<UserComparison> {
    try {
      const normalizedDomain = normalizeDomain(domain);
      const siteEvents = await this.getSiteEvents(normalizedDomain);
      const siteScore = calculatePrivacyScore(siteEvents, true, {
        scope: 'page',
        pageDomain: normalizedDomain,
      });
      const allEvents = await EventsStorage.getRecentEvents(1000);
      const estimatedSiteScores = this.calculateUserSiteEstimates(allEvents);
      const average =
        estimatedSiteScores.length > 0
          ? Math.round(
              estimatedSiteScores.reduce(
                (total, entry) => total + entry.score,
                0
              ) / estimatedSiteScores.length
            )
          : null;

      return {
        status: 'observational-only',
        currentSite: {
          domain: normalizedDomain,
          privacyScore: siteScore.score,
          scoreStatus: siteScore.status,
          scoreConfidence: siteScore.confidence,
        },
        userAverage: {
          privacyScore: average,
          totalEstimatedSites: estimatedSiteScores.length,
        },
        percentile: null,
        insight:
          average === null
            ? 'No other page has a local estimated evidence index. A browsing comparison is unavailable.'
            : `${estimatedSiteScores.length} page${
                estimatedSiteScores.length === 1 ? '' : 's'
              } have local estimated indices. Their simple average is shown only as stored-history context; no privacy percentile or better/worse judgment is produced.`,
        betterThanUsual: null,
      };
    } catch (error) {
      console.error('Failed to prepare browsing-history comparison:', error);
      return {
        status: 'observational-only',
        currentSite: {
          domain: normalizeDomain(domain),
          privacyScore: null,
          scoreStatus: 'insufficient-evidence',
          scoreConfidence: 'none',
        },
        userAverage: {
          privacyScore: null,
          totalEstimatedSites: 0,
        },
        percentile: null,
        insight: 'Browsing-history comparison is unavailable.',
        betterThanUsual: null,
      };
    }
  }

  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => eventMatchesPageDomain(event, domain));
  }

  private static calculateUserSiteEstimates(
    events: TrackingEvent[]
  ): Array<{ domain: string; score: number }> {
    const siteEvents = new Map<string, TrackingEvent[]>();

    for (const event of events) {
      const pageDomain = getPageDomain(event);
      if (!pageDomain) continue;
      const grouped = siteEvents.get(pageDomain) || [];
      grouped.push(event);
      siteEvents.set(pageDomain, grouped);
    }

    return Array.from(siteEvents.entries()).flatMap(([pageDomain, grouped]) => {
      const result = calculatePrivacyScore(grouped, true, {
        scope: 'page',
        pageDomain,
      });
      return result.status === 'estimated' && result.score !== null
        ? [{ domain: pageDomain, score: result.score }]
        : [];
    });
  }
}
