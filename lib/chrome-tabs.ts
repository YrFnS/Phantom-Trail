/**
 * Chrome Tabs API wrapper for type safety and error handling
 */
export class ChromeTabs {
  /**
   * Get active tab in current window
   */
  static async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tabs[0] || null;
    } catch (error) {
      console.error('[Chrome Tabs] Failed to get active tab:', error);
      return null;
    }
  }

  /**
   * Get tab by ID
   */
  static async getTab(tabId: number): Promise<chrome.tabs.Tab | null> {
    try {
      return await chrome.tabs.get(tabId);
    } catch (error) {
      console.error('[Chrome Tabs] Failed to get tab:', error);
      return null;
    }
  }

  /**
   * Send message to tab
   */
  static async sendMessage<T = unknown>(
    tabId: number,
    message: unknown
  ): Promise<T | null> {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('[Chrome Tabs] Failed to send message:', error);
      return null;
    }
  }

  /**
   * Query tabs
   */
  static async queryTabs(
    queryInfo: chrome.tabs.QueryInfo
  ): Promise<chrome.tabs.Tab[]> {
    try {
      return await chrome.tabs.query(queryInfo);
    } catch (error) {
      console.error('[Chrome Tabs] Failed to query tabs:', error);
      return [];
    }
  }

  /**
   * Create new tab
   */
  static async createTab(
    createProperties: chrome.tabs.CreateProperties
  ): Promise<chrome.tabs.Tab | null> {
    try {
      return await chrome.tabs.create(createProperties);
    } catch (error) {
      console.error('[Chrome Tabs] Failed to create tab:', error);
      return null;
    }
  }
}
