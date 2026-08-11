import type { DataProtectionSettings } from '../types';
import {
  DEFAULT_DATA_PROTECTION_SETTINGS,
  normalizeDataProtectionSettings,
} from '../data-protection-policy.mts';

export interface StorageAreaInventory {
  area: 'local' | 'session' | 'sync';
  keys: string[];
  keyCount: number;
  bytesInUse: number | null;
  available: boolean;
}

export interface StorageInventory {
  generatedAt: number;
  areas: StorageAreaInventory[];
  totalKeys: number;
  totalKnownBytes: number;
}

/**
 * Stores the active data-minimization policy separately from product settings.
 */
export class DataProtectionStorage {
  static readonly KEY = 'phantom_trail_data_protection';

  static async getSettings(): Promise<DataProtectionSettings> {
    try {
      const result = await chrome.storage.local.get(this.KEY);
      const normalized = normalizeDataProtectionSettings(result[this.KEY]);
      if (JSON.stringify(result[this.KEY]) !== JSON.stringify(normalized)) {
        await chrome.storage.local.set({ [this.KEY]: normalized });
      }
      return normalized;
    } catch (error) {
      console.error('Failed to read data-protection settings:', error);
      return { ...DEFAULT_DATA_PROTECTION_SETTINGS };
    }
  }

  static async saveSettings(
    settings: DataProtectionSettings
  ): Promise<DataProtectionSettings> {
    const normalized = normalizeDataProtectionSettings(settings);
    await chrome.storage.local.set({ [this.KEY]: normalized });
    return normalized;
  }

  static async initializeDefaults(): Promise<void> {
    const result = await chrome.storage.local.get(this.KEY);
    if (!result[this.KEY]) {
      await chrome.storage.local.set({
        [this.KEY]: { ...DEFAULT_DATA_PROTECTION_SETTINGS },
      });
    }
  }

  static async getStorageInventory(): Promise<StorageInventory> {
    const areas = await Promise.all([
      this.inspectArea('local', chrome.storage.local),
      this.inspectArea('session', chrome.storage.session),
      this.inspectArea('sync', chrome.storage.sync),
    ]);

    return {
      generatedAt: Date.now(),
      areas,
      totalKeys: areas.reduce((total, area) => total + area.keyCount, 0),
      totalKnownBytes: areas.reduce(
        (total, area) => total + (area.bytesInUse || 0),
        0
      ),
    };
  }

  private static async inspectArea(
    area: StorageAreaInventory['area'],
    storageArea: chrome.storage.StorageArea | undefined
  ): Promise<StorageAreaInventory> {
    if (!storageArea) {
      return {
        area,
        keys: [],
        keyCount: 0,
        bytesInUse: null,
        available: false,
      };
    }

    try {
      const values = await storageArea.get(null);
      const keys = Object.keys(values).sort();
      let bytesInUse: number | null = null;
      try {
        bytesInUse = await storageArea.getBytesInUse(null);
      } catch {
        // Some Chromium storage-area implementations do not expose byte counts.
      }

      return {
        area,
        keys,
        keyCount: keys.length,
        bytesInUse,
        available: true,
      };
    } catch {
      return {
        area,
        keys: [],
        keyCount: 0,
        bytesInUse: null,
        available: false,
      };
    }
  }
}
