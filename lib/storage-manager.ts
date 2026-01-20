import { BaseStorage } from './storage/base-storage';
import { SettingsStorage } from './storage/settings-storage';
import { EventsStorage } from './storage/events-storage';
import { ReportsStorage } from './storage/reports-storage';
import { SyncStorage } from './storage/sync-storage';

/**
 * Legacy StorageManager for backward compatibility
 * @deprecated Use specific storage classes instead
 */
export class StorageManager {
  // Settings
  static getSettings = SettingsStorage.getSettings;
  static saveSettings = SettingsStorage.saveSettings;
  
  // Events
  static getRecentEvents = EventsStorage.getRecentEvents;
  static getEventsByDateRange = EventsStorage.getEventsByDateRange;
  static addEvent = EventsStorage.addEvent;
  static cleanupOldEvents = EventsStorage.cleanupOldEvents;
  static clearEvents = EventsStorage.clearEvents;
  static getTrackingEvents = EventsStorage.getTrackingEvents;
  static setTrackingEvents = EventsStorage.setTrackingEvents;
  static addTrackingEvent = EventsStorage.addEvent;
  
  // Reports
  static storeDailySnapshot = ReportsStorage.storeDailySnapshot;
  static getDailySnapshots = ReportsStorage.getDailySnapshots;
  static storeWeeklyReport = ReportsStorage.storeWeeklyReport;
  static getWeeklyReports = ReportsStorage.getWeeklyReports;
  static migrateAndCleanData = ReportsStorage.migrateAndCleanData;
  
  // Base operations
  static get = BaseStorage.get;
  static set = BaseStorage.set;
  static remove = BaseStorage.remove;
  static getMultiple = BaseStorage.getMultiple;
  static setMultiple = BaseStorage.setMultiple;
  static getAllData = BaseStorage.getAllData;
  static getStorageInfo = BaseStorage.getStorageInfo;
  
  // Sync operations
  static getSyncableData = SyncStorage.getSyncableData;
  static setSyncableData = SyncStorage.setSyncableData;
  static isSyncableKey = SyncStorage.isSyncableKey;
  static getNonSyncableKeys = SyncStorage.getNonSyncableKeys;
  static getSessionData = SyncStorage.getSessionData;
  static setSessionData = SyncStorage.setSessionData;
  
  // Initialize defaults
  static initializeDefaults = SettingsStorage.initializeDefaults;
}
