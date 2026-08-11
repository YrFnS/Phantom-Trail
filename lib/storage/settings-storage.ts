import type { ExtensionSettings } from '../types';
import { BaseStorage } from './base-storage';

/**
 * Manages extension settings storage.
 *
 * Networked and unvalidated features remain opt-in while Phantom Trail is an
 * experimental prototype.
 */
export class SettingsStorage {
  private static readonly SETTINGS_KEY = 'phantom_trail_settings';

  private static readonly DEFAULT_SETTINGS: ExtensionSettings = {
    enableAI: false,
    enableNotifications: false,
    riskThreshold: 'medium',
    enablePrivacyPredictions: false,
  };

  /**
   * Get extension settings from storage.
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      return result[this.SETTINGS_KEY] || { ...this.DEFAULT_SETTINGS };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return { ...this.DEFAULT_SETTINGS };
    }
  }

  /**
   * Save extension settings to storage.
   */
  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.SETTINGS_KEY]: settings,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Initialize default settings if none exist.
   */
  static async initializeDefaults(): Promise<void> {
    const existing = await BaseStorage.get(this.SETTINGS_KEY);
    if (!existing) {
      await this.saveSettings({ ...this.DEFAULT_SETTINGS });
    }

    await this.initializeBadgeDefaults();
  }

  /**
   * Initialize badge settings separately to avoid circular imports.
   */
  private static async initializeBadgeDefaults(): Promise<void> {
    try {
      const badgeKey = 'phantom-trail-badge-settings';
      const existing = await BaseStorage.get(badgeKey);
      if (!existing) {
        await BaseStorage.set(badgeKey, {
          enabled: false,
          style: 'grade',
          showScore: false,
          showGrade: true,
          colorScheme: 'traffic-light',
          updateFrequency: 'realtime',
          showOnlyRisks: false,
        });
      }
    } catch (error) {
      console.error('Failed to initialize badge defaults:', error);
    }
  }
}
