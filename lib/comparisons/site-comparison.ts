import { WebsiteCategorization } from '../website-categorization';
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

export interface SimilarSiteComparison {
  status: 'observational-only';
  currentSite: {
    domain: string;
    privacyScore: number | null;
    scoreStatus: EvidenceScoreStatus;
    scoreConfidence: EvidenceCoverageConfidence;
  };
  similarSites: Array<{
    domain: string;
    privacyScore: number;
    scoreConfidence: Exclude<EvidenceCoverageConfidence, 'none'>;
    category: string;
  }>;
  ranking: null;
  insight: string;
}

/**
 * Returns local observed evidence indices for similarly categorized pages.
 * It deliberately does not rank them: browsing exposure, detector coverage,
 * and evidence quality are not controlled across sites.
 */
export class SiteComparisonService {
  static async compare(domain: string): Promise<SimilarSiteComparison> {
    try {
      const normalizedDomain = normalizeDomain(domain);
      const siteEvents = await this.getSiteEvents(normalizedDomain);
      const currentScore = calculatePrivacyScore(siteEvents, true, {
        scope: 'page',
        pageDomain: normalizedDomain,
      });
      const category = WebsiteCategorization.categorizeWebsite(normalizedDomain);
      const allEvents = await EventsStorage.getRecentEvents(1000);
      const domainScores = this.calculateDomainScores(allEvents);
      const similarSites = domainScores
        .filter(site => {
          const siteCategory = WebsiteCategorization.categorizeWebsite(
            site.domain
          );
          return (
            siteCategory.id === category.id &&
            site.domain !== normalizedDomain
          );
        })
        .slice(0, 10)
        .map(site => ({
          ...site,
          category: category.name,
        }));

      return {
        status: 'observational-only',
        currentSite: {
          domain: normalizedDomain,
          privacyScore: currentScore.score,
          scoreStatus: currentScore.status,
          scoreConfidence: currentScore.confidence,
        },
        similarSites,
        ranking: null,
        insight:
          similarSites.length === 0
            ? 'No other similarly categorized page has a local estimated evidence index. No ranking is available.'
            : `${similarSites.length} similarly categorized page${
                similarSites.length === 1 ? '' : 's'
              } have local estimated evidence indices. They are shown for inspection only; no privacy ranking is produced because browsing exposure and evidence coverage are not comparable.`,
      };
    } catch (error) {
      console.error('Failed to prepare observational site comparison:', error);
      throw error;
    }
  }

  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => eventMatchesPageDomain(event, domain));
  }

  private static calculateDomainScores(events: TrackingEvent[]): Array<{
    domain: string;
    privacyScore: number;
    scoreConfidence: Exclude<EvidenceCoverageConfidence, 'none'>;
  }> {
    const domainEvents = new Map<string, TrackingEvent[]>();

    for (const event of events) {
      const pageDomain = getPageDomain(event);
      if (!pageDomain) continue;
      const grouped = domainEvents.get(pageDomain) || [];
      grouped.push(event);
      domainEvents.set(pageDomain, grouped);
    }

    return Array.from(domainEvents.entries()).flatMap(([pageDomain, grouped]) => {
      const score = calculatePrivacyScore(grouped, true, {
        scope: 'page',
        pageDomain,
      });
      if (
        score.status !== 'estimated' ||
        score.score === null ||
        score.confidence === 'none'
      ) {
        return [];
      }

      return [
        {
          domain: pageDomain,
          privacyScore: score.score,
          scoreConfidence: score.confidence,
        },
      ];
    });
  }
}
