import { format, startOfWeek } from 'date-fns';
import { StorageManager } from './storage-manager';
import { calculatePrivacyScore } from './privacy-score';
import type { 
  TrendData, 
  DailySnapshot, 
  WeeklyReport, 
  Anomaly,
  RiskLevel,
  TrackerType 
} from './types';

/**
 * Privacy trends analysis and data processing engine
 */
export class PrivacyTrends {
  /**
   * Calculate daily privacy trends for the specified number of days
   */
  static async calculateDailyTrends(days: number = 30): Promise<TrendData[]> {
    try {
      const snapshots = await StorageManager.getDailySnapshots(days);
      
      return snapshots.map(snapshot => {
        // Ensure eventCounts exists and has required properties
        const eventCounts = snapshot.eventCounts || {
          total: 0,
          byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
          byType: { advertising: 0, analytics: 0, social: 0, fingerprinting: 0, cryptomining: 0, unknown: 0 }
        };
        
        return {
          date: snapshot.date,
          privacyScore: snapshot.privacyScore || 100,
          trackingEvents: eventCounts.total || 0,
          riskDistribution: eventCounts.byRisk || { low: 0, medium: 0, high: 0, critical: 0 },
          topTrackers: (snapshot.topDomains || []).slice(0, 5).map(d => d?.domain || 'unknown')
        };
      });
    } catch (error) {
      console.error('Failed to calculate daily trends:', error);
      return [];
    }
  }

  /**
   * Generate weekly privacy report
   */
  static async getWeeklyReport(): Promise<WeeklyReport | null> {
    try {
      const reports = await StorageManager.getWeeklyReports(2);
      if (reports.length === 0) return null;
      
      const currentWeek = reports[reports.length - 1];
      const previousWeek = reports.length > 1 ? reports[reports.length - 2] : null;
      
      const scoreChange = previousWeek 
        ? currentWeek.averageScore - previousWeek.averageScore 
        : 0;
      
      return {
        ...currentWeek,
        scoreChange
      };
    } catch (error) {
      console.error('Failed to get weekly report:', error);
      return null;
    }
  }

  /**
   * Detect anomalies in privacy patterns
   */
  static async detectAnomalies(): Promise<Anomaly[]> {
    try {
      const trends = await this.calculateDailyTrends(30);
      if (trends.length < 7) return [];
      
      const anomalies: Anomaly[] = [];
      const scores = trends.map(t => t.privacyScore || 100);
      const events = trends.map(t => t.trackingEvents || 0);
      
      // Calculate baselines (7-day moving average)
      for (let i = 6; i < trends.length; i++) {
        const scoreBaseline = this.calculateMovingAverage(scores.slice(i-6, i+1), 7)[6];
        const eventBaseline = this.calculateMovingAverage(events.slice(i-6, i+1), 7)[6];
        
        const trend = trends[i];
        const currentScore = trend.privacyScore || 100;
        const currentEvents = trend.trackingEvents || 0;
        const scoreDeviation = Math.abs(currentScore - scoreBaseline);
        
        // Detect significant score drops
        if (currentScore < scoreBaseline - 15) {
          anomalies.push({
            date: trend.date,
            type: 'score_drop',
            severity: scoreDeviation > 25 ? 'high' : 'medium',
            description: `Privacy score dropped significantly to ${currentScore}`,
            value: currentScore,
            baseline: scoreBaseline
          });
        }
        
        // Detect tracking spikes
        if (currentEvents > eventBaseline * 2) {
          anomalies.push({
            date: trend.date,
            type: 'tracking_spike',
            severity: currentEvents > eventBaseline * 3 ? 'high' : 'medium',
            description: `Unusual tracking activity: ${currentEvents} events`,
            value: currentEvents,
            baseline: eventBaseline
          });
        }
      }
      
      return anomalies.slice(-10); // Return last 10 anomalies
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Generate daily snapshot from current events
   */
  static async generateDailySnapshot(date?: Date): Promise<DailySnapshot> {
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    try {
      // Get events for the day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayEvents = await StorageManager.getEventsByDateRange(startOfDay, endOfDay);
      
      // Calculate privacy score
      const privacyScore = dayEvents.length > 0 
        ? calculatePrivacyScore(dayEvents, true).score 
        : 100;
      
      // Count events by risk and type
      const byRisk: Record<RiskLevel, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      
      const byType: Record<TrackerType, number> = {
        advertising: 0,
        analytics: 0,
        social: 0,
        fingerprinting: 0,
        cryptomining: 0,
        unknown: 0
      };
      
      const domainCounts: Record<string, number> = {};
      
      dayEvents.forEach(event => {
        byRisk[event.riskLevel]++;
        byType[event.trackerType]++;
        domainCounts[event.domain] = (domainCounts[event.domain] || 0) + 1;
      });
      
      // Get top domains
      const topDomains = Object.entries(domainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));
      
      return {
        date: dateStr,
        privacyScore,
        eventCounts: {
          total: dayEvents.length,
          byRisk,
          byType
        },
        topDomains
      };
    } catch (error) {
      console.error('Failed to generate daily snapshot:', error);
      return {
        date: dateStr,
        privacyScore: 100,
        eventCounts: {
          total: 0,
          byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
          byType: { advertising: 0, analytics: 0, social: 0, fingerprinting: 0, cryptomining: 0, unknown: 0 }
        },
        topDomains: []
      };
    }
  }

  /**
   * Generate weekly report from daily snapshots
   */
  static async generateWeeklyReport(weekStart?: Date): Promise<WeeklyReport> {
    const startDate = weekStart || startOfWeek(new Date());
    const weekStartStr = format(startDate, 'yyyy-MM-dd');
    
    try {
      // Get snapshots for the week
      const weekSnapshots: DailySnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const snapshot = await this.generateDailySnapshot(date);
        weekSnapshots.push(snapshot);
      }
      
      // Calculate average score
      const scores = weekSnapshots.map(s => s.privacyScore);
      const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      // Get all unique trackers from the week
      const allTrackers = new Set<string>();
      const allSites = new Set<string>();
      
      weekSnapshots.forEach(snapshot => {
        snapshot.topDomains.forEach(({ domain }) => {
          allTrackers.add(domain);
          allSites.add(domain);
        });
      });
      
      // Compare with previous week (simplified)
      const previousWeekReports = await StorageManager.getWeeklyReports(2);
      const previousWeek = previousWeekReports.length > 0 ? previousWeekReports[previousWeekReports.length - 1] : null;
      
      const newTrackers = previousWeek 
        ? Array.from(allTrackers).filter(t => !previousWeek.newTrackers.includes(t)).slice(0, 5)
        : Array.from(allTrackers).slice(0, 5);
      
      return {
        weekStart: weekStartStr,
        averageScore,
        scoreChange: 0, // Will be calculated when comparing weeks
        newTrackers,
        improvedSites: [], // Simplified for now
        riskySites: Array.from(allSites).slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      return {
        weekStart: weekStartStr,
        averageScore: 100,
        scoreChange: 0,
        newTrackers: [],
        improvedSites: [],
        riskySites: []
      };
    }
  }

  /**
   * Calculate moving average for trend smoothing
   */
  private static calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      const average = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(Math.round(average * 100) / 100);
    }
    
    return result;
  }

  /**
   * Initialize trend tracking (call once on extension install)
   */
  static async initializeTrendTracking(): Promise<void> {
    try {
      // Generate snapshot for today if it doesn't exist
      const today = format(new Date(), 'yyyy-MM-dd');
      const snapshots = await StorageManager.getDailySnapshots(1);
      
      if (snapshots.length === 0 || snapshots[0].date !== today) {
        const todaySnapshot = await this.generateDailySnapshot();
        await StorageManager.storeDailySnapshot(todaySnapshot);
      }
      
      console.log('Privacy trend tracking initialized');
    } catch (error) {
      console.error('Failed to initialize trend tracking:', error);
    }
  }
}
