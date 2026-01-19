/**
 * Chrome Storage API wrapper for type safety and error handling
 */
export class ChromeStorage {
  /**
   * Get data from chrome.storage.local
   */
  static async getLocal<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[Chrome Storage] Failed to get local data:', error);
      return null;
    }
  }

  /**
   * Set data in chrome.storage.local
   */
  static async setLocal<T>(key: string, value: T): Promise<boolean> {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('[Chrome Storage] Failed to set local data:', error);
      return false;
    }
  }

  /**
   * Get data from chrome.storage.session
   */
  static async getSession<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.session.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[Chrome Storage] Failed to get session data:', error);
      return null;
    }
  }

  /**
   * Set data in chrome.storage.session
   */
  static async setSession<T>(key: string, value: T): Promise<boolean> {
    try {
      await chrome.storage.session.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('[Chrome Storage] Failed to set session data:', error);
      return false;
    }
  }

  /**
   * Get data from chrome.storage.sync
   */
  static async getSync<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[Chrome Storage] Failed to get sync data:', error);
      return null;
    }
  }

  /**
   * Set data in chrome.storage.sync
   */
  static async setSync<T>(key: string, value: T): Promise<boolean> {
    try {
      await chrome.storage.sync.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('[Chrome Storage] Failed to set sync data:', error);
      return false;
    }
  }

  /**
   * Remove data from chrome.storage.local
   */
  static async removeLocal(key: string): Promise<boolean> {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('[Chrome Storage] Failed to remove local data:', error);
      return false;
    }
  }

  /**
   * Listen for storage changes
   */
  static onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void
  ): void {
    chrome.storage.onChanged.addListener(callback);
  }
}
