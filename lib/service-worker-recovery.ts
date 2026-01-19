/**
 * Service Worker Recovery Utility
 * Handles service worker context invalidation and recovery
 */

export class ServiceWorkerRecovery {
  private static isRecovering = false;
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;
  private static readonly RECOVERY_DELAY_BASE = 1000;

  /**
   * Check if the service worker context is valid
   */
  static isContextValid(): boolean {
    try {
      // Multiple checks to ensure context is truly valid
      return !!(
        chrome?.runtime?.id &&
        chrome?.storage?.local &&
        chrome?.tabs?.query
      );
    } catch {
      return false;
    }
  }

  /**
   * Attempt to recover from context invalidation
   */
  static async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering) {
      return false;
    }

    this.isRecovering = true;
    console.log('[Phantom Trail] Attempting service worker recovery...');

    try {
      for (let attempt = 0; attempt < this.MAX_RECOVERY_ATTEMPTS; attempt++) {
        // Wait with exponential backoff
        if (attempt > 0) {
          const delay = Math.min(
            this.RECOVERY_DELAY_BASE * Math.pow(2, attempt - 1),
            5000
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Check if context is now valid
        if (this.isContextValid()) {
          console.log(`[Phantom Trail] Service worker recovered after ${attempt + 1} attempts`);
          this.isRecovering = false;
          return true;
        }

        console.warn(`[Phantom Trail] Recovery attempt ${attempt + 1} failed`);
      }

      console.error('[Phantom Trail] Service worker recovery failed after all attempts');
      this.isRecovering = false;
      return false;
    } catch (error) {
      console.error('[Phantom Trail] Error during service worker recovery:', error);
      this.isRecovering = false;
      return false;
    }
  }

  /**
   * Execute a function with automatic recovery on context invalidation
   */
  static async withRecovery<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T | null> {
    try {
      // Check context before operation
      if (!this.isContextValid()) {
        console.warn(`[Phantom Trail] Context invalid before ${operationName}, attempting recovery`);
        const recovered = await this.attemptRecovery();
        if (!recovered) {
          throw new Error('Service worker context recovery failed');
        }
      }

      // Execute operation
      return await operation();
    } catch (error) {
      const errorMessage = String(error);
      
      // Check if it's a context invalidation error
      if (
        errorMessage.includes('Extension context invalidated') ||
        errorMessage.includes('Could not establish connection') ||
        errorMessage.includes('The message port closed before a response was received')
      ) {
        console.warn(`[Phantom Trail] Context invalidated during ${operationName}, attempting recovery`);
        
        const recovered = await this.attemptRecovery();
        if (recovered) {
          // Retry operation once after recovery
          try {
            return await operation();
          } catch (retryError) {
            console.error(`[Phantom Trail] ${operationName} failed after recovery:`, retryError);
            return null;
          }
        }
      }

      console.error(`[Phantom Trail] ${operationName} failed:`, error);
      return null;
    }
  }

  /**
   * Wrap Chrome API calls with error handling
   */
  static async safeChrome<T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T | null> {
    return this.withRecovery(apiCall, `Chrome API: ${apiName}`);
  }
}