import { format, startOfWeek } from 'date-fns';
import { calculatePrivacyScore } from './privacy-score';
import { ReportsStorage } from './storage/reports-storage';
import { EventsStorage } from './storage/events-storage';
import {
  getDisplayDomain,
  getEventOccurrenceCount,
} from './event-attribution.mts';
import type {
  TrendData,
  DailySnapshot,
  WeeklyReport,
  Anomaly,
  RiskLevel,
  TrackerType,
} from './types';

/**
 * Processes stored evidence-index snapshots. Unknown days remain null and are
 * never converted to 100 or zero.
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
          privacyScore: snapshot.privacyScore ?? null,
          scoreStatus:
            snapshot.scoreStatus ||
            (snapshot.privacyScore === null
              ? 'insufficient-evidence'
              : 'estimated'),
          scoreConfidence:
            snapshot.scoreConfidence ||
            (snapshot.privacyScore === null ? 'none' : 'low'),
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
      console.error('Failed to calculate evidence-index history:', error);
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
      const scoreChange =
        previousWeek &&
        currentWeek.averageScore !== null &&
        previousWeek.averageScore !== null
          ? currentWeek.averageScore - previousWeek.averageScore
          : null;

      return {
        ...currentWeek,
        scoreChange,
      };
    } catch (error) {
      console.error('Failed to get weekly evidence aggregation:', error);
      return null;
    }
  }

  /**
   * Apply simple deviation rules only to numeric estimated snapshots. Unknown
   * days are omitted rather than treated as favorable or poor values.
   */
  static async detectAnomalies(): Promise<Anomaly[]> {
    try {
      const trends = await this.calculateDailyTrends(30);
      if (trends.length < 7) return [];

      const deviations: Anomaly[] = [];
      const events = trends.map(trend => trend.trackingEvents || 0);

      for (let index = 6; index < trends.length; index += 1) {
        const trend = trends[index];
        const currentScore = trend.privacyScore;
        const currentEvents = trend.trackingEvents || 0;
        const eventBaseline = this.averageNumbers(
          events.slice(index - 6, index + 1)
        );

        if (currentScore !== null) {
          const scoreWindow = trends
            .slice(index - 6, index + 1)
            .map(item => item.privacyScore)
            .filter((value): value is number => value !== null);

          if (scoreWindow.length >= 3) {
            const scoreBaseline = this.averageNumbers(scoreWindow);
            const scoreDeviation = Math.abs(currentScore - scoreBaseline);

            if (currentScore < scoreBaseline - 15) {
              deviations.push({
                date: trend.date,
                type: 'score_drop',
                severity: scoreDeviation > 25 ? 'high' : 'medium',
                description: `Estimated evidence index (${currentScore}) fell more than 15 points below the average of ${scoreWindow.length} numeric snapshots (${scoreBaseline})`,
                value: currentScore,
                baseline: scoreBaseline,
              });
            }
          }
        }

        if (eventBaseline > 0 && currentEvents > eventBaseline * 2) {
          deviations.push({
            date: trend.date,
            type: 'tracking_spike',
            severity: currentEvents > eventBaseline * 3 ? 'high' : 'medium',
            description: `Recorded occurrence count (${currentEvents}) exceeded twice its seven-day moving average (${eventBaseline})`,
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
      const score = calculatePrivacyScore(dayEvents, true);

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
      let occurrenceCount = 0;

      for (const event of dayEvents) {
        const occurrences = getEventOccurrenceCount(event);
        occurrenceCount += occurrences;
        byRisk[event.riskLevel] += occurrences;
        byType[event.trackerType] += occurrences;
        const domain = getDisplayDomain(event) || 'unknown';
        domainCounts[domain] = (domainCounts[domain] || 0) + occurrences;
      }

      const topDomains = Object.entries(domainCounts)
        .sort(([, first], [, second]) => second - first)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      return {
        date: dateString,
        privacyScore: score.score,
        scoreStatus: score.status,
        scoreConfidence: score.confidence,
        eventCounts: {
          total: occurrenceCount,
          byRisk,
          byType,
        },
        topDomains,
      };
    } catch (error) {
      console.error('Failed to generate daily evidence snapshot:', error);
      return this.getEmptySnapshot(dateString);
    }
  }

  static async generateWeeklyReport(weekStart?: Date): Promise<WeeklyReport> {
    const startDate = weekStart || startOfWeek(new Date());
    const weekStartString = format(startDate, 'yyyy-MM-dd');

    try {
      const weekSnapshots: DailySnapshot[] = [];
      for (let index = 0; index < 7; index += 1) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        weekSnapshots.push(await this.generateDailySnapshot(date));
      }

      const numericScores = weekSnapshots
        .map(snapshot => snapshot.privacyScore)
        .filter((score): score is number => score !== null);
      const averageScore =
        numericScores.length > 0
          ? Math.round(
              numericScores.reduce((total, score) => total + score, 0) /
                numericScores.length
            )
          : null;
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
        scoreChange: null,
        newTrackers: newDomainLabels,
        improvedSites: [],
        riskySites: [],
      };
    } catch (error) {
      console.error('Failed to generate weekly evidence aggregation:', error);
      return {
        weekStart: weekStartString,
        averageScore: null,
        scoreChange: null,
        newTrackers: [],
        improvedSites: [],
        riskySites: [],
      };
    }
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

      console.log('Evidence-index snapshot tracking initialized');
    } catch (error) {
      console.error('Failed to initialize evidence snapshot tracking:', error);
    }
  }

  private static averageNumbers(values: number[]): number {
    if (values.length === 0) return 0;
    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return Math.round(average * 100) / 100;
  }

  private static getEmptySnapshot(date: string): DailySnapshot {
    return {
      date,
      privacyScore: null,
      scoreStatus: 'insufficient-evidence',
      scoreConfidence: 'none',
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
