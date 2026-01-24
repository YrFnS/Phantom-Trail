import { BaseStorage } from './base-storage';
import type { P2PSettings } from '../types';

/**
 * Storage wrapper for P2P privacy network settings
 */
export class P2PStorage extends BaseStorage {
  private static readonly KEY = 'p2pSettings';

  /**
   * Get P2P settings from storage
   */
  static async getSettings(): Promise<P2PSettings> {
    const result = await chrome.storage.local.get([this.KEY]);
    return (
      result[this.KEY] || {
        joinPrivacyNetwork: false,
        shareAnonymousData: false,
        shareRegionalData: false,
        maxConnections: 10,
        autoReconnect: true,
      }
    );
  }

  /**
   * Save P2P settings to storage
   */
  static async saveSettings(settings: P2PSettings): Promise<void> {
    await chrome.storage.local.set({ [this.KEY]: settings });
  }
}
