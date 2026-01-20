import { BaseStorage } from './base-storage';

/**
 * Manages sync-related storage operations
 */
export class SyncStorage {
  private static readonly NON_SYNCABLE_KEYS = [
    'phantom_trail_events',
    'phantom_trail_daily_snapshots', 
    'phantom_trail_weekly_reports',
    'ai_cache',
    'session_data',
    'temp_data'
  ];

  /**
   * Check if a key should be synced across devices
   */
  static isSyncableKey(key: string): boolean {
    return !this.NON_SYNCABLE_KEYS.some(nonSyncKey => 
      key.startsWith(nonSyncKey)
    );
  }

  /**
   * Get non-syncable keys list
   */
  static getNonSyncableKeys(): string[] {
    return [...this.NON_SYNCABLE_KEYS];
  }

  /**
   * Get syncable data only
   */
  static async getSyncableData(): Promise<Record<string, unknown>> {
    try {
      const allData = await BaseStorage.getAllData();
      const syncableData: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(allData)) {
        if (this.isSyncableKey(key)) {
          syncableData[key] = value;
        }
      }
      
      return syncableData;
    } catch (error) {
      console.error('Failed to get syncable data:', error);
      return {};
    }
  }

  /**
   * Set syncable data (filters out non-syncable keys)
   */
  static async setSyncableData(data: Record<string, unknown>): Promise<void> {
    try {
      const syncableData: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (this.isSyncableKey(key)) {
          syncableData[key] = value;
        }
      }
      
      if (Object.keys(syncableData).length > 0) {
        await BaseStorage.setMultiple(syncableData);
      }
    } catch (error) {
      console.error('Failed to set syncable data:', error);
      throw new Error('Failed to set syncable data');
    }
  }

  /**
   * Get session data (not implemented)
   */
  static async getSessionData(): Promise<unknown> {
    return null;
  }

  /**
   * Set session data (not implemented)
   */
  static async setSessionData(): Promise<void> {
    // Not implemented
  }
}
