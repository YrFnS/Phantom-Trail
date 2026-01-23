import { ExportService } from './export-service';

import { EventsStorage } from './storage/events-storage';

export interface ExportScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'json' | 'pdf';
  deliveryMethod: 'download' | 'email' | 'cloud';
  emailAddress?: string;
  cloudService?: 'google-drive' | 'dropbox';
  dataRange: number; // days of data to include
  includeAnalysis: boolean;
}

export interface ExportSchedule {
  id: string;
  config: ExportScheduleConfig;
  nextExecution: Date;
  lastExecution?: Date;
  status: 'active' | 'paused' | 'error';
  errorMessage?: string;
}

export interface ExportHistoryEntry {
  scheduleId: string;
  executionTime: Date;
  status: 'success' | 'error';
  fileSize?: number;
  errorMessage?: string;
  deliveryMethod: string;
}

const STORAGE_KEY = 'phantom-trail-export-schedules';
const HISTORY_KEY = 'phantom-trail-export-history';

export class ExportScheduler {
  static async scheduleExport(config: ExportScheduleConfig): Promise<string> {
    const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const nextExecution = this.calculateNextExecution(config.frequency);

    const schedule: ExportSchedule = {
      id: scheduleId,
      config,
      nextExecution,
      status: 'active',
    };

    // Save schedule
    await this.saveSchedule(schedule);

    // Create Chrome alarm
    await this.createAlarm(schedule);

    return scheduleId;
  }

  static async cancelSchedule(scheduleId: string): Promise<void> {
    // Remove Chrome alarm
    await chrome.alarms.clear(`export-schedule-${scheduleId}`);

    // Remove from storage
    const schedules = await this.getSchedules();
    delete schedules[scheduleId];
    await chrome.storage.local.set({ [STORAGE_KEY]: schedules });
  }

  static async getActiveSchedules(): Promise<ExportSchedule[]> {
    const schedules = await this.getSchedules();
    return Object.values(schedules).filter(s => s.status === 'active');
  }

  static async executeScheduledExport(scheduleId: string): Promise<void> {
    try {
      const schedule = await this.getSchedule(scheduleId);
      if (!schedule) {
        console.error(`Schedule ${scheduleId} not found`);
        return;
      }

      // Import required modules dynamically to avoid circular dependencies
      // const { EventsStorage } = await import('./storage/events-storage');
      // const { ExportService } = await import('./export-service');

      // Get data for the specified range
      const events = await EventsStorage.getRecentEvents(
        schedule.config.dataRange * 24
      ); // Convert days to hours

      // Generate export
      const exportData = await ExportService.generateExport(
        events,
        schedule.config.format
      );

      // Deliver export
      await this.deliverExport(exportData, schedule.config);

      // Update schedule status and history
      await this.updateScheduleStatus(scheduleId, 'active');
      await this.addHistoryEntry({
        scheduleId,
        executionTime: new Date(),
        status: 'success',
        fileSize: exportData.size,
        deliveryMethod: schedule.config.deliveryMethod,
      });

      // Schedule next execution
      const updatedSchedule = {
        ...schedule,
        lastExecution: new Date(),
        nextExecution: this.calculateNextExecution(schedule.config.frequency),
      };
      await this.saveSchedule(updatedSchedule);
      await this.createAlarm(updatedSchedule);
    } catch (error) {
      console.error(`Scheduled export failed for ${scheduleId}:`, error);
      await this.updateScheduleStatus(
        scheduleId,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.addHistoryEntry({
        scheduleId,
        executionTime: new Date(),
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        deliveryMethod: 'unknown',
      });
    }
  }

  static async updateSchedule(
    scheduleId: string,
    config: ExportScheduleConfig
  ): Promise<void> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);

    const updatedSchedule: ExportSchedule = {
      ...schedule,
      config,
      nextExecution: this.calculateNextExecution(config.frequency),
    };

    await this.saveSchedule(updatedSchedule);
    await this.createAlarm(updatedSchedule);
  }

  private static async getSchedules(): Promise<Record<string, ExportSchedule>> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
  }

  private static async getSchedule(
    scheduleId: string
  ): Promise<ExportSchedule | null> {
    const schedules = await this.getSchedules();
    return schedules[scheduleId] || null;
  }

  private static async saveSchedule(schedule: ExportSchedule): Promise<void> {
    const schedules = await this.getSchedules();
    schedules[schedule.id] = schedule;
    await chrome.storage.local.set({ [STORAGE_KEY]: schedules });
  }

  private static async createAlarm(schedule: ExportSchedule): Promise<void> {
    const alarmName = `export-schedule-${schedule.id}`;

    // Clear existing alarm
    await chrome.alarms.clear(alarmName);

    // Create new alarm
    await chrome.alarms.create(alarmName, {
      when: schedule.nextExecution.getTime(),
      periodInMinutes: this.getIntervalMinutes(schedule.config.frequency),
    });
  }

  private static calculateNextExecution(
    frequency: ExportScheduleConfig['frequency']
  ): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'daily':
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM
        break;
      case 'weekly':
        next.setDate(now.getDate() + (7 - now.getDay() + 1)); // Next Monday
        next.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(now.getMonth() + 1, 1); // First of next month
        next.setHours(9, 0, 0, 0);
        break;
    }

    return next;
  }

  private static getIntervalMinutes(
    frequency: ExportScheduleConfig['frequency']
  ): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60; // 1 day
      case 'weekly':
        return 7 * 24 * 60; // 1 week
      case 'monthly':
        return 30 * 24 * 60; // 30 days (approximate)
    }
  }

  private static generateScheduledFilename(schedule: ExportSchedule): string {
    const date = new Date().toISOString().split('T')[0];
    const frequency = schedule.config.frequency;
    const format = schedule.config.format;
    return `phantom-trail-${frequency}-${date}.${format}`;
  }

  private static async deliverExport(
    exportData: Blob,
    config: ExportScheduleConfig
  ): Promise<void> {
    switch (config.deliveryMethod) {
      case 'download':
        await this.triggerAutoDownload(exportData, config);
        break;
      case 'email':
        // Email delivery not implemented in this phase
        console.warn('Email delivery not yet implemented');
        break;
      case 'cloud':
        // Cloud delivery not implemented in this phase
        console.warn('Cloud delivery not yet implemented');
        break;
    }
  }

  private static async triggerAutoDownload(
    data: Blob,
    config: ExportScheduleConfig
  ): Promise<void> {
    const url = URL.createObjectURL(data);
    const filename = `phantom-trail-exports/${this.generateScheduledFilename({ id: '', config, nextExecution: new Date(), status: 'active' })}`;

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false,
    });
  }

  private static async updateScheduleStatus(
    scheduleId: string,
    status: ExportSchedule['status'],
    errorMessage?: string
  ): Promise<void> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) return;

    schedule.status = status;
    if (errorMessage) {
      schedule.errorMessage = errorMessage;
    } else {
      delete schedule.errorMessage;
    }

    await this.saveSchedule(schedule);
  }

  private static async addHistoryEntry(
    entry: ExportHistoryEntry
  ): Promise<void> {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    const history: ExportHistoryEntry[] = result[HISTORY_KEY] || [];

    history.unshift(entry);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(100);
    }

    await chrome.storage.local.set({ [HISTORY_KEY]: history });
  }

  static async getExportHistory(): Promise<ExportHistoryEntry[]> {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    return result[HISTORY_KEY] || [];
  }
}
