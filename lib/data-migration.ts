import { ReportsStorage } from './storage/reports-storage';

/**
 * Data migration and cleanup utilities
 */
export class DataMigration {
  private static readonly MIGRATION_VERSION_KEY =
    'phantom_trail_migration_version';
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Run all necessary data migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentMigrationVersion();

      if (currentVersion !== this.CURRENT_VERSION) {
        console.log(
          `Running data migration from ${currentVersion} to ${this.CURRENT_VERSION}`
        );

        // Run the reports data cleanup
        await ReportsStorage.migrateAndCleanData();

        // Update migration version
        await chrome.storage.local.set({
          [this.MIGRATION_VERSION_KEY]: this.CURRENT_VERSION,
        });

        console.log('Data migration completed successfully');
      }
    } catch (error) {
      console.error('Data migration failed:', error);
      // Don't throw - extension should still work even if migration fails
    }
  }

  /**
   * Get current migration version
   */
  private static async getCurrentMigrationVersion(): Promise<string> {
    try {
      const result = await chrome.storage.local.get(this.MIGRATION_VERSION_KEY);
      return result[this.MIGRATION_VERSION_KEY] || '0.0.0';
    } catch (error) {
      console.error('Failed to get migration version:', error);
      return '0.0.0';
    }
  }

  /**
   * Force clean all corrupted data (emergency use)
   */
  static async forceCleanAllData(): Promise<void> {
    try {
      console.log('Force cleaning all data...');

      await ReportsStorage.migrateAndCleanData();

      // Reset migration version to force re-migration
      await chrome.storage.local.set({
        [this.MIGRATION_VERSION_KEY]: this.CURRENT_VERSION,
      });

      console.log('Force data cleanup completed');
    } catch (error) {
      console.error('Force data cleanup failed:', error);
      throw error;
    }
  }
}
