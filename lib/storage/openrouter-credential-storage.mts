const LOCAL_KEY = 'phantom_trail_openrouter_key';
const SESSION_KEY = 'phantom_trail_openrouter_key';

export interface OpenRouterCredentialState {
  configured: boolean;
  persistence: 'none' | 'session' | 'local';
}

/**
 * Keeps the OpenRouter credential outside the general settings document.
 * Session-only storage is the default; local persistence requires explicit
 * user selection in the Data & Privacy settings.
 */
export class OpenRouterCredentialStorage {
  private static volatileCredential = '';

  static async getCredential(): Promise<string> {
    try {
      const sessionValue = await chrome.storage.session?.get(SESSION_KEY);
      const sessionCredential = sessionValue?.[SESSION_KEY];
      if (typeof sessionCredential === 'string' && sessionCredential.trim()) {
        return sessionCredential.trim();
      }
    } catch {
      // Fall back to the in-memory copy when session storage is unavailable.
    }

    if (this.volatileCredential) return this.volatileCredential;

    try {
      const localValue = await chrome.storage.local.get(LOCAL_KEY);
      const localCredential = localValue[LOCAL_KEY];
      return typeof localCredential === 'string' ? localCredential.trim() : '';
    } catch {
      return '';
    }
  }

  static async getState(): Promise<OpenRouterCredentialState> {
    try {
      const sessionValue = await chrome.storage.session?.get(SESSION_KEY);
      if (
        typeof sessionValue?.[SESSION_KEY] === 'string' &&
        sessionValue[SESSION_KEY].trim()
      ) {
        return { configured: true, persistence: 'session' };
      }
    } catch {
      if (this.volatileCredential) {
        return { configured: true, persistence: 'session' };
      }
    }

    if (this.volatileCredential) {
      return { configured: true, persistence: 'session' };
    }

    try {
      const localValue = await chrome.storage.local.get(LOCAL_KEY);
      if (
        typeof localValue[LOCAL_KEY] === 'string' &&
        localValue[LOCAL_KEY].trim()
      ) {
        return { configured: true, persistence: 'local' };
      }
    } catch {
      // Return the empty state below.
    }

    return { configured: false, persistence: 'none' };
  }

  static async setCredential(
    credential: string,
    rememberAcrossRestarts: boolean
  ): Promise<void> {
    const normalized = credential.trim();
    if (!normalized) {
      await this.clearCredential();
      return;
    }

    if (rememberAcrossRestarts) {
      await chrome.storage.local.set({ [LOCAL_KEY]: normalized });
      await this.removeSessionCredential();
      this.volatileCredential = '';
      return;
    }

    await chrome.storage.local.remove(LOCAL_KEY);
    this.volatileCredential = normalized;
    try {
      await chrome.storage.session?.set({ [SESSION_KEY]: normalized });
    } catch {
      // The volatile copy intentionally avoids silently falling back to disk.
    }
  }

  static async migrateLegacyCredential(
    credential: string | undefined
  ): Promise<boolean> {
    const normalized = credential?.trim();
    if (!normalized) return false;
    await this.setCredential(normalized, false);
    return true;
  }

  static async clearCredential(): Promise<void> {
    this.volatileCredential = '';
    await Promise.allSettled([
      chrome.storage.local.remove(LOCAL_KEY),
      this.removeSessionCredential(),
    ]);
  }

  static getStorageKeys(): { local: string; session: string } {
    return { local: LOCAL_KEY, session: SESSION_KEY };
  }

  private static async removeSessionCredential(): Promise<void> {
    try {
      await chrome.storage.session?.remove(SESSION_KEY);
    } catch {
      // Session storage can be unavailable in test or older browser contexts.
    }
  }
}
