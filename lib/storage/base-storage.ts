/**
 * Base storage operations for Chrome extension
 */
export class BaseStorage {
  /**
   * Get data from storage
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in storage
   */
  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
      throw new Error(`Failed to set ${key}`);
    }
  }

  /**
   * Remove data from storage
   */
  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw new Error(`Failed to remove ${key}`);
    }
  }

  /**
   * Get multiple keys from storage
   */
  static async getMultiple(keys: string[]): Promise<Record<string, unknown>> {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Failed to get multiple keys:', error);
      return {};
    }
  }

  /**
   * Set multiple items in storage
   */
  static async setMultiple(items: Record<string, unknown>): Promise<void> {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('Failed to set multiple items:', error);
      throw new Error('Failed to set multiple items');
    }
  }

  /**
   * Get all data from storage
   */
  static async getAllData(): Promise<Record<string, unknown>> {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      console.error('Failed to get all data:', error);
      return {};
    }
  }

  /**
   * Get storage usage info
   */
  static async getStorageInfo(): Promise<{
    bytesInUse: number;
    quota: number;
  }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      return { bytesInUse, quota: chrome.storage.local.QUOTA_BYTES };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { bytesInUse: 0, quota: 0 };
    }
  }
}
