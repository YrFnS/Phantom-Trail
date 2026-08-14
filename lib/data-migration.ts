import { ReportsStorage } from './storage/reports-storage';
import { SettingsStorage } from './storage/settings-storage';
import { DataProtectionStorage } from './storage/data-protection-storage';
import { EventsStorage } from './storage/events-storage';
import { isControlledBrowserShutdown } from './browser-lifecycle-errors.mts';

/**
 * Versioned compatibility and minimization migrations.
 */
export class DataMigration {
  private static readonly MIGRATION_VERSION_KEY =
    'phantom_trail_migration_version';
  private static readonly CURRENT_VERSION = '3.0.0-p3';

  static async runMigrations(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentMigrationVersion();
      if (currentVersion === this.CURRENT_VERSION) {
        // Reapply the active retention policy even after migration completion.
        await EventsStorage.reapplyProtectionPolicy();
        return;
      }

      console.log(
        `[Phantom Trail] Running local migration from ${currentVersion} to ${this.CURRENT_VERSION}`
      );

      await SettingsStorage.initializeDefaults();
      await DataProtectionStorage.initializeDefaults();
      await ReportsStorage.migrateAndCleanData();
      const eventResult = await EventsStorage.reapplyProtectionPolicy();

      await chrome.storage.local.set({
        [this.MIGRATION_VERSION_KEY]: this.CURRENT_VERSION,
      });

      console.log(
        `[Phantom Trail] Migration completed; ${eventResult.changedRows} event rows minimized and ${eventResult.removedByRetention} expired rows removed`
      );
    } catch (error) {
      if (!isControlledBrowserShutdown(error)) {
        console.error('[Phantom Trail] Local data migration failed:', error);
      }
      // The extension remains usable with in-memory defaults if migration fails.
    }
  }

  private static async getCurrentMigrationVersion(): Promise<string> {
    try {
      const result = await chrome.storage.local.get(this.MIGRATION_VERSION_KEY);
      return result[this.MIGRATION_VERSION_KEY] || '0.0.0';
    } catch (error) {
      if (!isControlledBrowserShutdown(error)) {
        console.error('Failed to get migration version:', error);
      }
      return '0.0.0';
    }
  }

  /**
   * Re-run non-destructive validation and minimization. Complete deletion is
   * implemented by DataDeletionService and requires explicit confirmation.
   */
  static async forceCleanAllData(): Promise<void> {
    await SettingsStorage.getSettings();
    await ReportsStorage.migrateAndCleanData();
    await EventsStorage.reapplyProtectionPolicy();
    await chrome.storage.local.set({
      [this.MIGRATION_VERSION_KEY]: this.CURRENT_VERSION,
    });
  }
}
