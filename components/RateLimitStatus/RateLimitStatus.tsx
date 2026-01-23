import { useState, useEffect } from 'react';
import { AIEngine } from '../../lib/ai-engine';
import type { RateLimitStatus as RateLimitStatusType } from '../../lib/ai';

interface RateLimitStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function RateLimitStatus({
  className = '',
  showDetails = false,
}: RateLimitStatusProps) {
  const [status, setStatus] = useState<RateLimitStatusType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    const updateStatus = async () => {
      if (!mounted) return;

      try {
        const rateLimitStatus = await AIEngine.getRateLimitStatus();
        if (!mounted) return;

        setStatus(rateLimitStatus);

        if (!rateLimitStatus.canMakeRequest) {
          const remaining =
            rateLimitStatus.retryAfter ||
            rateLimitStatus.resetTime - Date.now();
          setTimeRemaining(Math.max(0, remaining));
        } else {
          setTimeRemaining(0);
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to get rate limit status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!status) {
    return null;
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const isLimited = !status.canMakeRequest;
  const isLowRequests = status.requestsRemaining <= 3;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <div
        className={`w-2 h-2 rounded-full ${
          isLimited
            ? 'bg-red-400 animate-pulse'
            : isLowRequests
              ? 'bg-yellow-400'
              : 'bg-green-400'
        }`}
      />

      {/* Status Text */}
      <div className="text-xs">
        {isLimited ? (
          <span className="text-red-400">
            AI Limited {timeRemaining > 0 && `(${formatTime(timeRemaining)})`}
          </span>
        ) : (
          <span
            className={isLowRequests ? 'text-yellow-400' : 'text-green-400'}
          >
            AI Ready ({status.requestsRemaining} left)
          </span>
        )}
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="text-[10px] text-gray-500">
          {isLimited
            ? timeRemaining > 0
              ? `Retry in ${formatTime(timeRemaining)}`
              : 'Checking availability...'
            : `Resets ${formatTime(Math.max(0, status.resetTime - Date.now()))}`}
        </div>
      )}
    </div>
  );
}
