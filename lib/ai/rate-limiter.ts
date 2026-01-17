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
  private static readonly MAX_REQUESTS_PER_MINUTE = 20; // Increased from 10
  private static readonly RATE_LIMIT_KEY = 'phantom_trail_rate_limit';
  private static readonly BACKOFF_KEY = 'phantom_trail_backoff';
  private static readonly MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max

  /**
   * Check if we can make an AI request with detailed status
   */
  static async getStatus(): Promise<RateLimitStatus> {
    try {
      const [rateLimitResult, backoffResult] = await Promise.all([
        chrome.storage.session.get(this.RATE_LIMIT_KEY),
        chrome.storage.session.get(this.BACKOFF_KEY)
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
      const rateLimitExceeded = rateLimit.count >= this.MAX_REQUESTS_PER_MINUTE;

      return {
        canMakeRequest: !inBackoff && !rateLimitExceeded,
        requestsRemaining: Math.max(0, this.MAX_REQUESTS_PER_MINUTE - rateLimit.count),
        resetTime: rateLimit.resetTime,
        retryAfter: inBackoff ? backoff.until - now : undefined
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return {
        canMakeRequest: true,
        requestsRemaining: this.MAX_REQUESTS_PER_MINUTE,
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
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, up to 5 minutes
      const backoffMs = Math.min(
        Math.pow(2, backoff.attempts - 1) * 1000,
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
