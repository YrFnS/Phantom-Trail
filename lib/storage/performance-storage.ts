import { BaseStorage } from './base-storage';

export type PerformanceMode = 'high' | 'balanced' | 'battery';

/**
 * Storage wrapper for performance settings
 */
export class PerformanceStorage extends BaseStorage {
  private static readonly KEY = 'performanceMode';

  /**
   * Get performance mode from storage
   */
  static async getMode(): Promise<PerformanceMode> {
    const result = await chrome.storage.local.get([this.KEY]);
    return result[this.KEY] || 'balanced';
  }

  /**
   * Save performance mode to storage
   */
  static async saveMode(mode: PerformanceMode): Promise<void> {
    await chrome.storage.local.set({ [this.KEY]: mode });
  }
}
