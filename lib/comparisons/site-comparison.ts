import { WebsiteCategorization } from '../website-categorization';
import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent } from '../types';
import { EventsStorage } from '../storage/events-storage';

/**
 * Similar site comparison data structure
 */
export interface SimilarSiteComparison {
  currentSite: {
    domain: string;
    privacyScore: number;
  };
  similarSites: Array<{
    domain: string;
    privacyScore: number;
    category: string;
  }>;
  ranking: number;
  insight: string;
}

/**
 * Service for comparing sites to similar sites
 */
export class SiteComparisonService {
  /**
   * Compare to similar sites
   */
  static async compare(domain: string): Promise<SimilarSiteComparison> {
    try {
      const siteEvents = await this.getSiteEvents(domain);
      const siteScore =
        siteEvents.length > 0
          ? calculatePrivacyScore(siteEvents, true).score
          : 100;

      // Get category and find similar sites
      const category = WebsiteCategorization.categorizeWebsite(domain);
      const allEvents = await EventsStorage.getRecentEvents(1000);

      // Group events by domain and calculate scores
      const domainScores = await this.calculateDomainScores(allEvents);

      // Filter to similar category sites
      const similarSites = domainScores
        .filter(site => {
          const siteCategory = WebsiteCategorization.categorizeWebsite(
            site.domain
          );
          return siteCategory.id === category.id && site.domain !== domain;
        })
        .slice(0, 10); // Top 10 similar sites

      // Calculate ranking
      const allSites = [
        ...similarSites,
        { domain, privacyScore: siteScore, category: category.name },
      ];
      allSites.sort((a, b) => b.privacyScore - a.privacyScore);
      const ranking = allSites.findIndex(site => site.domain === domain) + 1;

      const insight = this.generateInsight(
        ranking,
        allSites.length,
        category.name
      );

      return {
        currentSite: {
          domain,
          privacyScore: siteScore,
        },
        similarSites: similarSites.map(site => ({
          domain: site.domain,
          privacyScore: site.privacyScore,
          category: category.name,
        })),
        ranking,
        insight,
      };
    } catch (error) {
      console.error('Failed to compare similar sites:', error);
      throw error;
    }
  }

  /**
   * Get tracking events for a specific site
   */
  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => event.domain === domain);
  }

  /**
   * Calculate domain scores from events
   */
  private static async calculateDomainScores(
    events: TrackingEvent[]
  ): Promise<Array<{ domain: string; privacyScore: number }>> {
    const domainEvents: Record<string, TrackingEvent[]> = {};

    events.forEach(event => {
      if (!domainEvents[event.domain]) {
        domainEvents[event.domain] = [];
      }
      domainEvents[event.domain].push(event);
    });

    return Object.entries(domainEvents)
      .filter(([, events]) => events.length >= 3)
      .map(([domain, events]) => ({
        domain,
        privacyScore: calculatePrivacyScore(events, true).score,
      }));
  }

  /**
   * Generate similar sites insight
   */
  private static generateInsight(
    ranking: number,
    totalSites: number,
    category: string
  ): string {
    if (ranking === 1) {
      return `Best privacy among ${totalSites} similar ${category.toLowerCase()} sites`;
    } else if (ranking <= Math.ceil(totalSites * 0.3)) {
      return `Top ${Math.ceil((ranking / totalSites) * 100)}% privacy among ${category.toLowerCase()} sites`;
    } else if (ranking <= Math.ceil(totalSites * 0.7)) {
      return `Average privacy ranking among ${category.toLowerCase()} sites`;
    } else {
      return `Below average privacy - ranks ${ranking} of ${totalSites} ${category.toLowerCase()} sites`;
    }
  }
}
