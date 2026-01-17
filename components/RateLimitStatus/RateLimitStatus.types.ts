export interface RateLimitStatusProps {
  className?: string;
  showDetails?: boolean;
}

export interface RateLimitDisplayState {
  status: 'available' | 'limited' | 'low' | 'unknown';
  requestsRemaining: number;
  timeUntilReset: number;
  retryAfter?: number;
}