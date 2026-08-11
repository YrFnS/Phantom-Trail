import { BaseStorage } from './base-storage';
import type { P2PSettings } from '../types';
import {
  DEFAULT_P2P_SETTINGS,
  normalizeP2PSettings,
} from '../p2p-consent.mts';

/**
 * Stores versioned P2P consent and transport settings.
 */
export class P2PStorage extends BaseStorage {
  static readonly KEY = 'p2pSettings';

  static async getSettings(): Promise<P2PSettings> {
    const result = await chrome.storage.local.get([this.KEY]);
    const normalized = normalizeP2PSettings(
      result[this.KEY] || DEFAULT_P2P_SETTINGS
    );
    if (JSON.stringify(result[this.KEY]) !== JSON.stringify(normalized)) {
      await chrome.storage.local.set({ [this.KEY]: normalized });
    }
    return normalized;
  }

  static async saveSettings(settings: P2PSettings): Promise<P2PSettings> {
    const normalized = normalizeP2PSettings(settings);
    await chrome.storage.local.set({ [this.KEY]: normalized });
    return normalized;
  }
}
