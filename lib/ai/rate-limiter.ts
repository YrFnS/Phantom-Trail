/**
 * Rate limiting for AI API requests
 */
export class RateLimiter {
  private static readonly MAX_REQUESTS_PER_MINUTE = 10;
  private static readonly RATE_LIMIT_KEY = 'phantom_trail_rate_limit';

  /**
   * Check if we can make an AI request (rate limiting)
   */
  static async canMakeRequest(): Promise<boolean> {
    try {
      const result = await chrome.storage.session.get(this.RATE_LIMIT_KEY);
      const rateLimit = result[this.RATE_LIMIT_KEY] || { count: 0, resetTime: 0 };

      const now = Date.now();
      const oneMinute = 60 * 1000;

      // Reset counter if a minute has passed
      if (now > rateLimit.resetTime) {
        rateLimit.count = 0;
        rateLimit.resetTime = now + oneMinute;
      }

      return rateLimit.count < this.MAX_REQUESTS_PER_MINUTE;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow request if check fails
    }
  }

  /**
   * Record an AI request for rate limiting
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
    } catch (error) {
      console.error('Failed to record request:', error);
    }
  }
}
