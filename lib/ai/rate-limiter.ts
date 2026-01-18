export interface RateLimitStatus {
  canMakeRequest: boolean;
  requestsRemaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Enhanced rate limiting for AI API requests with exponential backoff
 */
export class RateLimiter {
  private static readonly DEFAULT_MAX_REQUESTS = 60; // Increased from 20 to 60
  private static readonly RATE_LIMIT_KEY = 'phantom_trail_rate_limit';
  private static readonly BACKOFF_KEY = 'phantom_trail_backoff';
  private static readonly MAX_BACKOFF_MS = 2 * 60 * 1000; // Reduced from 5 minutes to 2 minutes
  private static readonly MIN_BACKOFF_MS = 2000; // Minimum 2 seconds
  private static readonly SETTINGS_KEY = 'phantom_trail_settings';

  /**
   * Get max requests per minute from settings or default
   */
  private static async getMaxRequests(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      const settings = result[this.SETTINGS_KEY] || {};
      return settings.maxRequestsPerMinute || this.DEFAULT_MAX_REQUESTS;
    } catch {
      return this.DEFAULT_MAX_REQUESTS;
    }
  }

  /**
   * Check if we can make an AI request with detailed status
   */
  static async getStatus(): Promise<RateLimitStatus> {
    try {
      const [rateLimitResult, backoffResult, maxRequests] = await Promise.all([
        chrome.storage.session.get(this.RATE_LIMIT_KEY),
        chrome.storage.session.get(this.BACKOFF_KEY),
        this.getMaxRequests()
      ]);

      const rateLimit = rateLimitResult[this.RATE_LIMIT_KEY] || { 
        count: 0, 
        resetTime: 0 
      };
      
      const backoff = backoffResult[this.BACKOFF_KEY] || { 
        until: 0, 
        attempts: 0 
      };

      const now = Date.now();
      const oneMinute = 60 * 1000;

      // Reset counter if a minute has passed
      if (now > rateLimit.resetTime) {
        rateLimit.count = 0;
        rateLimit.resetTime = now + oneMinute;
      }

      // Check if we're in backoff period
      const inBackoff = now < backoff.until;
      const rateLimitExceeded = rateLimit.count >= maxRequests;

      return {
        canMakeRequest: !inBackoff && !rateLimitExceeded,
        requestsRemaining: Math.max(0, maxRequests - rateLimit.count),
        resetTime: rateLimit.resetTime,
        retryAfter: inBackoff ? backoff.until - now : undefined
      };
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
        console.error('Storage quota exceeded for rate limiting:', error);
      } else if (errorMessage.includes('InvalidAccessError')) {
        console.error('Storage access denied for rate limiting:', error);
      } else {
        console.error(`Rate limit check failed (${errorType}):`, error);
      }
      
      const maxRequests = await this.getMaxRequests();
      return {
        canMakeRequest: true,
        requestsRemaining: maxRequests,
        resetTime: Date.now() + 60 * 1000
      };
    }
  }

  /**
   * Check if we can make an AI request (simple boolean)
   */
  static async canMakeRequest(): Promise<boolean> {
    const status = await this.getStatus();
    return status.canMakeRequest;
  }

  /**
   * Record a successful AI request
   */
  static async recordRequest(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(this.RATE_LIMIT_KEY);
      const rateLimit = result[this.RATE_LIMIT_KEY] || { count: 0, resetTime: 0 };

      const now = Date.now();
      const oneMinute = 60 * 1000;

      // Reset counter if a minute has passed
      if (now > rateLimit.resetTime) {
        rateLimit.count = 1;
        rateLimit.resetTime = now + oneMinute;
      } else {
        rateLimit.count++;
      }

      await chrome.storage.session.set({
        [this.RATE_LIMIT_KEY]: rateLimit,
      });

      // Clear any backoff on successful request
      await this.clearBackoff();
    } catch (error) {
      console.error('Failed to record request:', error);
    }
  }

  /**
   * Record a rate limit error and implement exponential backoff
   */
  static async recordRateLimit(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(this.BACKOFF_KEY);
      const backoff = result[this.BACKOFF_KEY] || { until: 0, attempts: 0 };

      const now = Date.now();
      backoff.attempts++;
      
      // More conservative exponential backoff: 2s, 4s, 8s, 16s, 32s, up to 2 minutes
      const backoffMs = Math.min(
        Math.max(this.MIN_BACKOFF_MS, Math.pow(2, backoff.attempts) * 1000),
        this.MAX_BACKOFF_MS
      );
      
      backoff.until = now + backoffMs;

      await chrome.storage.session.set({
        [this.BACKOFF_KEY]: backoff,
      });

      console.warn(`Rate limited. Backing off for ${backoffMs}ms (attempt ${backoff.attempts})`);
    } catch (error) {
      console.error('Failed to record rate limit:', error);
    }
  }

  /**
   * Clear backoff state (called on successful request)
   */
  static async clearBackoff(): Promise<void> {
    try {
      await chrome.storage.session.remove(this.BACKOFF_KEY);
    } catch (error) {
      console.error('Failed to clear backoff:', error);
    }
  }

  /**
   * Reset rate limiting state (for debugging or manual reset)
   */
  static async resetRateLimit(): Promise<void> {
    try {
      await Promise.all([
        chrome.storage.session.remove(this.RATE_LIMIT_KEY),
        chrome.storage.session.remove(this.BACKOFF_KEY)
      ]);
      console.log('Rate limit state reset');
    } catch (error) {
      console.error('Failed to reset rate limit state:', error);
    }
  }

  /**
   * Get debug information about current rate limiting state
   */
  static async getDebugInfo(): Promise<{
    rateLimit: unknown;
    backoff: unknown;
    status: RateLimitStatus;
    maxRequests: number;
  }> {
    try {
      const [rateLimitResult, backoffResult, maxRequests, status] = await Promise.all([
        chrome.storage.session.get(this.RATE_LIMIT_KEY),
        chrome.storage.session.get(this.BACKOFF_KEY),
        this.getMaxRequests(),
        this.getStatus()
      ]);

      return {
        rateLimit: rateLimitResult[this.RATE_LIMIT_KEY],
        backoff: backoffResult[this.BACKOFF_KEY],
        status,
        maxRequests
      };
    } catch (error) {
      console.error('Failed to get debug info:', error);
      throw error;
    }
  }

  /**
   * Wait for rate limit to reset with optional callback for progress
   */
  static async waitForReset(onProgress?: (timeRemaining: number) => void): Promise<void> {
    const status = await this.getStatus();
    
    if (status.canMakeRequest) {
      return;
    }

    const waitTime = status.retryAfter || (status.resetTime - Date.now());
    
    if (waitTime <= 0) {
      return;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const endTime = startTime + waitTime;
      
      const checkInterval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
          clearInterval(checkInterval);
          resolve();
        } else if (onProgress) {
          onProgress(remaining);
        }
      }, 1000);
    });
  }
}
