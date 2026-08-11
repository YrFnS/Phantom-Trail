import { useEffect, useState } from 'react';
import { aiEngine } from '../../lib/ai-engine';
import type { RateLimitStatus as RateLimitStatusType } from '../../lib/ai';

interface RateLimitStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function RateLimitStatus({
  className = '',
  showDetails = false,
}: RateLimitStatusProps) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<RateLimitStatusType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const updateStatus = async () => {
      if (!mounted) return;

      try {
        const nextStatus = await aiEngine.getRateLimitStatus();
        if (!mounted) return;

        setStatus(nextStatus);
        setTimeRemaining(
          nextStatus.canMakeRequest
            ? 0
            : Math.max(
                0,
                nextStatus.retryAfter ||
                  nextStatus.resetTime - Date.now()
              )
        );
      } catch (error) {
        if (mounted) {
          console.error('Failed to get OpenRouter rate status:', error);
        }
      }
    };

    const initialize = async () => {
      try {
        const available = await aiEngine.isAvailable();
        if (!mounted) return;

        setIsAvailable(available);
        if (!available) return;

        await updateStatus();
        interval = setInterval(() => {
          void updateStatus();
        }, 1000);
      } catch (error) {
        if (!mounted) return;
        setIsAvailable(false);
        console.error('Failed to check OpenRouter opt-in status:', error);
      }
    };

    void initialize();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (isAvailable === null) return null;

  if (!isAvailable) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
        <div className="text-xs text-[var(--text-secondary)]">
          OpenRouter off
        </div>
        {showDetails && (
          <div className="text-[10px] text-[var(--text-muted)]">
            Requires explicit enablement and an API key
          </div>
        )}
      </div>
    );
  }

  if (!status) return null;

  const isLimited = !status.canMakeRequest;
  const isLowRequests = status.requestsRemaining <= 3;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          isLimited
            ? 'bg-red-400 animate-pulse'
            : isLowRequests
              ? 'bg-yellow-400'
              : 'bg-green-400'
        }`}
      />

      <div className="text-xs">
        {isLimited ? (
          <span className="text-red-400">
            OpenRouter summary limited{' '}
            {timeRemaining > 0 && `(${formatTime(timeRemaining)})`}
          </span>
        ) : (
          <span
            className={isLowRequests ? 'text-yellow-400' : 'text-green-400'}
          >
            OpenRouter enabled ({status.requestsRemaining} local requests left)
          </span>
        )}
      </div>

      {showDetails && (
        <div className="text-[10px] text-gray-500">
          {isLimited
            ? timeRemaining > 0
              ? `Local retry window: ${formatTime(timeRemaining)}`
              : 'Checking local rate state...'
            : `Local window resets in ${formatTime(
                Math.max(0, status.resetTime - Date.now())
              )}`}
        </div>
      )}
    </div>
  );
}
