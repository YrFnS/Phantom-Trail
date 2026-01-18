import React, { useState, useEffect, useCallback } from 'react';
import { TrustedSitesManager, TrustLevel } from '../../lib/trusted-sites-manager';

interface QuickTrustButtonProps {
  domain: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const QuickTrustButton: React.FC<QuickTrustButtonProps> = ({ 
  domain, 
  className = '',
  size = 'sm'
}) => {
  const [isTrusted, setIsTrusted] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkTrustStatus = useCallback(async () => {
    try {
      const trusted = await TrustedSitesManager.isTrustedSite(domain);
      setIsTrusted(trusted);
    } catch (error) {
      console.error('Failed to check trust status:', error);
    }
  }, [domain]);

  useEffect(() => {
    checkTrustStatus();
  }, [checkTrustStatus]);

  const handleToggleTrust = async () => {
    setLoading(true);
    try {
      if (isTrusted) {
        await TrustedSitesManager.removeTrustedSite(domain);
        setIsTrusted(false);
      } else {
        await TrustedSitesManager.addTrustedSite(
          domain, 
          TrustLevel.PARTIAL_TRUST,
          'Added via quick trust button'
        );
        setIsTrusted(true);
      }
    } catch (error) {
      console.error('Failed to toggle trust:', error);
    } finally {
      setLoading(false);
    }
  };

  const buttonSize = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
  const iconSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={handleToggleTrust}
      disabled={loading}
      className={`
        ${buttonSize}
        ${isTrusted 
          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        border border-gray-300 rounded-md transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isTrusted ? 'Remove from trusted sites' : 'Add to trusted sites'}
    >
      <span className={`${iconSize} mr-1`}>
        {loading ? '⏳' : isTrusted ? '🛡️' : '🔒'}
      </span>
      {isTrusted ? 'Trusted' : 'Trust'}
    </button>
  );
};
