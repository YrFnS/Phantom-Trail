/**
 * Centralized constants to eliminate magic numbers throughout the codebase
 */

export const TIMEOUTS = {
    /** Recovery timeout for circuit breaker */
    RECOVERY: 30_000,
    /** Rate limit window duration */
    RATE_LIMIT_WINDOW: 60_000,
    /** Message display timeout */
    MESSAGE_TIMEOUT: 5_000,
    /** Context check interval */
    CONTEXT_CHECK_INTERVAL: 2_000,
    /** Debounce delay for user input */
    DEBOUNCE_DELAY: 300,
} as const;

export const LIMITS = {
    /** Circuit breaker failure threshold before opening */
    FAILURE_THRESHOLD: 3,
    /** Max calls allowed in half-open state */
    HALF_OPEN_MAX_CALLS: 2,
    /** Maximum events in queue */
    EVENT_QUEUE_MAX: 50,
    /** Rate limit requests per minute */
    RATE_LIMIT_PER_MINUTE: 10,
    /** Events to display in UI */
    EVENTS_DISPLAY_LIMIT: 10,
    /** Network events limit */
    NETWORK_EVENTS_LIMIT: 50,
    /** Maximum retry attempts */
    MAX_RETRIES: 3,
} as const;

export const RISK_WEIGHTS = {
    LOW: 1,
    MEDIUM: 3,
    HIGH: 7,
    CRITICAL: 10,
} as const;

export const CACHE_DURATIONS = {
    /** AI analysis cache duration */
    AI_ANALYSIS: 5 * 60 * 1000, // 5 minutes
    /** Privacy score cache duration */
    PRIVACY_SCORE: 60 * 1000, // 1 minute
    /** Site data cache duration */
    SITE_DATA: 10 * 60 * 1000, // 10 minutes
} as const;

export const UI = {
    /** Animation durations in ms */
    ANIMATION: {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500,
    },
    /** Breakpoints for responsive design */
    BREAKPOINTS: {
        SM: 640,
        MD: 768,
        LG: 1024,
    },
} as const;

// Type exports for type-safe usage
export type TimeoutKey = keyof typeof TIMEOUTS;
export type LimitKey = keyof typeof LIMITS;
export type RiskWeight = keyof typeof RISK_WEIGHTS;
