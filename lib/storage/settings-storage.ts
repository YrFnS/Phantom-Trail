import type { ExtensionSettings } from '../types';
import { BaseStorage } from './base-storage';
import { DataProtectionStorage } from './data-protection-storage';
import { OpenRouterCredentialStorage } from './openrouter-credential-storage';

/**
 * Manages non-secret extension settings.
 *
 * P3 stores OpenRouter credentials separately. A legacy credential embedded in
 * this object is migrated to session-only credential storage and removed from
 * the persisted settings document.
 */
export class SettingsStorage {
  private static readonly SETTINGS_KEY = 'phantom_trail_settings';

  private static readonly DEFAULT_SETTINGS: ExtensionSettings = {
    enableAI: false,
    enableNotifications: false,
    riskThreshold: 'medium',
    enablePrivacyPredictions: false,
  };

  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      const raw = result[this.SETTINGS_KEY];
      if (!raw || typeof raw !== 'object') {
        return { ...this.DEFAULT_SETTINGS };
      }

      const candidate = raw as ExtensionSettings;
      const legacyCredential = candidate.openRouterApiKey;
      const sanitized = this.sanitizeSettings(candidate);

      if (legacyCredential) {
        await OpenRouterCredentialStorage.migrateLegacyCredential(
          legacyCredential
        );
      }

      if (
        legacyCredential ||
        JSON.stringify(candidate) !== JSON.stringify(sanitized)
      ) {
        await chrome.storage.local.set({ [this.SETTINGS_KEY]: sanitized });
      }

      return sanitized;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return { ...this.DEFAULT_SETTINGS };
    }
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.SETTINGS_KEY]: this.sanitizeSettings(settings),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  static async initializeDefaults(): Promise<void> {
    const existing = await BaseStorage.get(this.SETTINGS_KEY);
    if (!existing) {
      await this.saveSettings({ ...this.DEFAULT_SETTINGS });
    } else {
      await this.getSettings();
    }

    await DataProtectionStorage.initializeDefaults();
    await this.initializeBadgeDefaults();
  }

  private static sanitizeSettings(
    settings: ExtensionSettings
  ): ExtensionSettings {
    const {
      openRouterApiKey: _legacyCredential,
      ...nonSecretSettings
    } = settings;

    return {
      enableAI: nonSecretSettings.enableAI === true,
      enableNotifications: nonSecretSettings.enableNotifications === true,
      riskThreshold:
        nonSecretSettings.riskThreshold === 'low' ||
        nonSecretSettings.riskThreshold === 'high' ||
        nonSecretSettings.riskThreshold === 'critical'
          ? nonSecretSettings.riskThreshold
          : 'medium',
      aiModel: nonSecretSettings.aiModel,
      notifications: nonSecretSettings.notifications,
      enablePrivacyPredictions:
        nonSecretSettings.enablePrivacyPredictions === true,
    };
  }

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
