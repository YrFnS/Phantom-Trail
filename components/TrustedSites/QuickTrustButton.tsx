import { useCallback, useEffect, useState } from 'react';
import {
  TrustedSitesManager,
  TrustLevel,
} from '../../lib/trusted-sites-manager';

interface QuickTrustButtonProps {
  domain: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Adds a personal site annotation. The historical component name is retained
 * for compatibility; this control does not change scores or monitoring.
 */
export function QuickTrustButton({
  domain,
  className = '',
  size = 'sm',
}: QuickTrustButtonProps) {
  const [isMarked, setIsMarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsMarked(await TrustedSitesManager.isTrustedSite(domain));
    } catch (error) {
      console.error('Failed to check site annotation:', error);
    }
  }, [domain]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isMarked) {
        await TrustedSitesManager.removeTrustedSite(domain);
        setIsMarked(false);
      } else {
        await TrustedSitesManager.addTrustedSite(
          domain,
          TrustLevel.PARTIAL_TRUST,
          'Added as a personal site annotation'
        );
        setIsMarked(true);
      }
    } catch (error) {
      console.error('Failed to update site annotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const buttonSize = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const iconSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={() => void handleToggle()}
      disabled={loading}
      className={`
        ${buttonSize}
        ${
          isMarked
            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }
        border border-[var(--border-primary)] rounded-md transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={
        isMarked
          ? 'Remove personal annotation; scores and monitoring are unchanged'
          : 'Add personal annotation; scores and monitoring are unchanged'
      }
    >
      <span className={`${iconSize} mr-1`}>
        {loading ? '…' : isMarked ? '★' : '☆'}
      </span>
      {isMarked ? 'Marked' : 'Mark'}
    </button>
  );
}
