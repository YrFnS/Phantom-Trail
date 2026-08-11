import React, { useState, useEffect, useCallback } from 'react';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import type {
  CommunityStats,
  EvidenceCoverageConfidence,
} from '../../lib/types';
import { P2PStorage } from '../../lib/storage/p2p-storage';
import { hasCurrentP2PConsent } from '../../lib/p2p-consent.mts';

interface CommunityInsightsProps {
  userScore: number | null;
  userGrade: string;
  userConfidence: EvidenceCoverageConfidence;
}

export const CommunityInsights: React.FC<CommunityInsightsProps> = ({
  userScore,
  userGrade,
  userConfidence,
}) => {
  const [network] = useState(() => P2PPrivacyNetwork.getInstance());
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(
    null
  );
  const [networkStatus, setNetworkStatus] = useState<string>('Disabled');
  const [isEnabled, setIsEnabled] = useState(false);
  const [consentCurrent, setConsentCurrent] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateNetworkStatus = useCallback(() => {
    try {
      setNetworkStatus(network.getNetworkStatus());
      setCommunityStats(
        network.isNetworkActive() ? network.getCommunityStats() : null
      );
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  }, [network]);

  const loadP2PSettings = useCallback(async () => {
    try {
      const settings = await P2PStorage.getSettings();
      const hasConsent = hasCurrentP2PConsent(settings);
      setConsentCurrent(hasConsent);
      setIsEnabled(hasConsent && settings.joinPrivacyNetwork);

      if (hasConsent && settings.joinPrivacyNetwork) {
        await network.initializeNetwork();
      }

      updateNetworkStatus();
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  }, [network, updateNetworkStatus]);

  useEffect(() => {
    void loadP2PSettings();
    const interval = setInterval(updateNetworkStatus, 10000);
    return () => clearInterval(interval);
  }, [loadP2PSettings, updateNetworkStatus]);

  const disableP2PNetwork = async () => {
    setLoading(true);
    try {
      const current = await P2PStorage.getSettings();
      await P2PStorage.saveSettings({
        ...current,
        joinPrivacyNetwork: false,
        shareAnonymousData: false,
        shareRegionalData: false,
      });
      await network.disconnectFromNetwork();
      setIsEnabled(false);
      setCommunityStats(null);
      setNetworkStatus('Disabled');
    } catch (error) {
      console.error('Failed to disable P2P network:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-primary)] font-medium">
            Community Network
          </h3>
          <span className="text-[10px] uppercase tracking-wide text-[var(--warning)]">
            Experimental
          </span>
        </div>

        <p className="text-[var(--text-secondary)] text-sm mb-4">
          The peer transport is disabled. Connection and sharing can only be
          enabled from Settings → P2P after reviewing the canonical aggregate
          payload and acknowledging the current versioned disclosure.
        </p>

        <div className="bg-[var(--bg-secondary)] border border-[var(--warning)]/30 rounded p-3 mb-4">
          <ul className="text-[var(--text-secondary)] text-xs space-y-1">
            <li>• Peer identity and submitted data are not authenticated.</li>
            <li>• Domain-reputation exchange was removed in P3.</li>
            <li>• Connection and aggregate sharing are separate choices.</li>
            <li>• N/A is never converted to zero or shared as a score.</li>
            <li>• WebRTC and signalling metadata can be exposed.</li>
          </ul>
        </div>

        <div className="text-xs text-[var(--text-secondary)]">
          Consent status:{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {consentCurrent ? 'acknowledged; connection disabled' : 'not acknowledged'}
          </span>
        </div>
      </div>
    );
  }

  const connectedPeers =
    communityStats?.connectedPeers ?? network.getConnectedPeerCount();
  const sampleCount = communityStats
    ? Object.values(communityStats.scoreDistribution).reduce(
        (total, count) => total + count,
        0
      )
    : 0;

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-primary)] font-medium">
          Community Network
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-[var(--warning)]">
          Experimental
        </span>
      </div>

      <div className="text-[var(--text-secondary)] text-sm mb-3">
        {networkStatus}
      </div>

      <div className="p-2 mb-4 text-xs rounded border border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--text-secondary)]">
        Peer values are self-reported and unverified. They do not establish
        website reputation, population percentiles, or tool adoption rates.
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3">
          <div className="text-[10px] text-[var(--text-secondary)] mb-1">
            Local evidence index
          </div>
          <div className="text-[var(--accent-primary)] font-medium">
            {userScore === null ? 'N/A' : `${userGrade} (${userScore})`}
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-1">
            {userScore === null
              ? 'insufficient evidence'
              : `${userConfidence} coverage confidence`}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3">
          <div className="text-[10px] text-[var(--text-secondary)] mb-1">
            Connected peers
          </div>
          <div className="text-[var(--text-primary)] font-medium">
            {connectedPeers}
          </div>
        </div>
      </div>

      {communityStats && sampleCount > 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[var(--text-secondary)] text-sm">
              Contributing estimated samples
            </span>
            <span className="text-[var(--text-primary)]">{sampleCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)] text-sm">
              Unverified sample average
            </span>
            <span className="text-[var(--text-primary)]">
              {Math.round(communityStats.averageScore)}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3 mb-4 text-xs text-[var(--text-secondary)]">
          No valid estimated peer samples have been received in this session.
        </div>
      )}

      <button
        onClick={() => void disableP2PNetwork()}
        disabled={loading}
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
      >
        {loading ? 'Disconnecting...' : 'Leave Network'}
      </button>
    </div>
  );
};
