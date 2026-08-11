import { format, startOfWeek } from 'date-fns';
import { calculatePrivacyScore } from './privacy-score';
import { ReportsStorage } from './storage/reports-storage';
import { EventsStorage } from './storage/events-storage';

import type {
  TrendData,
  DailySnapshot,
  WeeklyReport,
  Anomaly,
  RiskLevel,
  TrackerType,
} from './types';

/**
 * Processes stored prototype snapshots.
 * Historical API names are retained for compatibility.
 */
export class PrivacyTrends {
  static async calculateDailyTrends(days: number = 30): Promise<TrendData[]> {
    try {
      const snapshots = await ReportsStorage.getDailySnapshots(days);

      return snapshots.map(snapshot => {
        const eventCounts = snapshot.eventCounts || {
          total: 0,
          byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
          byType: {
            advertising: 0,
            analytics: 0,
            social: 0,
            fingerprinting: 0,
            cryptomining: 0,
            unknown: 0,
          },
        };

        return {
          date: snapshot.date,
          privacyScore: snapshot.privacyScore ?? 100,
          trackingEvents: eventCounts.total || 0,
          riskDistribution: eventCounts.byRisk || {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
          },
          topTrackers: (snapshot.topDomains || [])
            .slice(0, 5)
            .map(item => item?.domain || 'unknown'),
        };
      });
    } catch (error) {
      console.error('Failed to calculate heuristic history:', error);
      return [];
    }
  }

  static async getWeeklyReport(): Promise<WeeklyReport | null> {
    try {
      const reports = await ReportsStorage.getWeeklyReports(2);
      if (reports.length === 0) return null;

      const currentWeek = reports[reports.length - 1];
      const previousWeek =
        reports.length > 1 ? reports[reports.length - 2] : null;

      return {
        ...currentWeek,
        scoreChange: previousWeek
          ? currentWeek.averageScore - previousWeek.averageScore
          : 0,
      };
    } catch (error) {
      console.error('Failed to get prototype weekly aggregation:', error);
      return null;
    }
  }

  /**
   * Apply simple moving-average deviation rules to stored snapshots.
   * Returned items are threshold matches, not verified incidents or anomalies.
   */
  static async detectAnomalies(): Promise<Anomaly[]> {
    try {
      const trends = await this.calculateDailyTrends(30);
      if (trends.length < 7) return [];

      const deviations: Anomaly[] = [];
      const scores = trends.map(trend => trend.privacyScore ?? 100);
      const events = trends.map(trend => trend.trackingEvents || 0);

      for (let index = 6; index < trends.length; index++) {
        const scoreBaseline = this.calculateMovingAverage(
          scores.slice(index - 6, index + 1),
          7
        )[6];
        const eventBaseline = this.calculateMovingAverage(
          events.slice(index - 6, index + 1),
          7
        )[6];

        const trend = trends[index];
        const currentScore = trend.privacyScore ?? 100;
        const currentEvents = trend.trackingEvents || 0;
        const scoreDeviation = Math.abs(currentScore - scoreBaseline);

        if (currentScore < scoreBaseline - 15) {
          deviations.push({
            date: trend.date,
            type: 'score_drop',
            severity: scoreDeviation > 25 ? 'high' : 'medium',
            description: `Experimental heuristic (${currentScore}) fell more than 15 points below its seven-day moving average (${scoreBaseline})`,
            value: currentScore,
            baseline: scoreBaseline,
          });
        }

        if (eventBaseline > 0 && currentEvents > eventBaseline * 2) {
          deviations.push({
            date: trend.date,
            type: 'tracking_spike',
            severity: currentEvents > eventBaseline * 3 ? 'high' : 'medium',
            description: `Recorded signal count (${currentEvents}) exceeded twice its seven-day moving average (${eventBaseline})`,
            value: currentEvents,
            baseline: eventBaseline,
          });
        }
      }

      return deviations.slice(-10);
    } catch (error) {
      console.error('Failed to calculate snapshot deviations:', error);
      return [];
    }
  }

  static async generateDailySnapshot(date?: Date): Promise<DailySnapshot> {
    const targetDate = date || new Date();
    const dateString = format(targetDate, 'yyyy-MM-dd');

    try {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayEvents = await EventsStorage.getEventsByDateRange(
        startOfDay,
        endOfDay
      );
      const privacyScore =
        dayEvents.length > 0
          ? calculatePrivacyScore(dayEvents, true).score
          : 100;

      const byRisk: Record<RiskLevel, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      const byType: Record<TrackerType, number> = {
        advertising: 0,
        analytics: 0,
        social: 0,
        fingerprinting: 0,
        cryptomining: 0,
        unknown: 0,
      };
      const domainCounts: Record<string, number> = {};

      for (const event of dayEvents) {
        byRisk[event.riskLevel]++;
        byType[event.trackerType]++;
        const domain = event.domain || 'unknown';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }

      const topDomains = Object.entries(domainCounts)
        .sort(([, first], [, second]) => second - first)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      return {
        date: dateString,
        privacyScore,
        eventCounts: {
          total: dayEvents.length,
          byRisk,
          byType,
        },
        topDomains,
      };
    } catch (error) {
      console.error('Failed to generate prototype daily snapshot:', error);
      return this.getEmptySnapshot(dateString);
    }
  }

  static async generateWeeklyReport(weekStart?: Date): Promise<WeeklyReport> {
    const startDate = weekStart || startOfWeek(new Date());
    const weekStartString = format(startDate, 'yyyy-MM-dd');

    try {
      const weekSnapshots: DailySnapshot[] = [];
      for (let index = 0; index < 7; index++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        weekSnapshots.push(await this.generateDailySnapshot(date));
      }

      const scores = weekSnapshots.map(snapshot => snapshot.privacyScore);
      const averageScore = Math.round(
        scores.reduce((total, score) => total + score, 0) / scores.length
      );

      const allDomainLabels = new Set<string>();
      weekSnapshots.forEach(snapshot => {
        snapshot.topDomains.forEach(({ domain }) => {
          allDomainLabels.add(domain);
        });
      });

      const previousReports = await ReportsStorage.getWeeklyReports(2);
      const previousReport =
        previousReports.length > 0
          ? previousReports[previousReports.length - 1]
          : null;
      const newDomainLabels = previousReport
        ? Array.from(allDomainLabels)
            .filter(domain => !previousReport.newTrackers.includes(domain))
            .slice(0, 5)
        : Array.from(allDomainLabels).slice(0, 5);

      return {
        weekStart: weekStartString,
        averageScore,
        scoreChange: 0,
        newTrackers: newDomainLabels,
        improvedSites: [],
        riskySites: [],
      };
    } catch (error) {
      console.error('Failed to generate prototype weekly aggregation:', error);
      return {
        weekStart: weekStartString,
        averageScore: 100,
        scoreChange: 0,
        newTrackers: [],
        improvedSites: [],
        riskySites: [],
      };
    }
  }

  private static calculateMovingAverage(
    data: number[],
    window: number
  ): number[] {
    return data.map((_, index) => {
      const start = Math.max(0, index - window + 1);
      const slice = data.slice(start, index + 1);
      const average =
        slice.reduce((total, value) => total + value, 0) / slice.length;
      return Math.round(average * 100) / 100;
    });
  }

  static async initializeTrendTracking(): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const snapshots = await ReportsStorage.getDailySnapshots(1);

      if (snapshots.length === 0 || snapshots[0].date !== today) {
        await ReportsStorage.storeDailySnapshot(
          await this.generateDailySnapshot()
        );
      }

      console.log('Prototype heuristic snapshot tracking initialized');
    } catch (error) {
      console.error('Failed to initialize prototype snapshot tracking:', error);
    }
  }

  private static getEmptySnapshot(date: string): DailySnapshot {
    return {
      date,
      privacyScore: 100,
      eventCounts: {
        total: 0,
        byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: {
          advertising: 0,
          analytics: 0,
          social: 0,
          fingerprinting: 0,
          cryptomining: 0,
          unknown: 0,
        },
      },
      topDomains: [],
    };
  }
}
