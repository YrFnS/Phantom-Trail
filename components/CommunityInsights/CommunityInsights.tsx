import React, { useState, useEffect, useCallback } from 'react';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import { CommunityStats, P2PSettings } from '../../lib/types';
import { P2PStorage } from '../../lib/storage/p2p-storage';

interface CommunityInsightsProps {
  userScore: number;
  userGrade: string;
}

export const CommunityInsights: React.FC<CommunityInsightsProps> = ({
  userScore,
  userGrade,
}) => {
  const [network] = useState(() => P2PPrivacyNetwork.getInstance());
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(
    null
  );
  const [networkStatus, setNetworkStatus] = useState<string>('Disabled');
  const [isEnabled, setIsEnabled] = useState(false);
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
      setIsEnabled(settings.joinPrivacyNetwork);

      if (settings.joinPrivacyNetwork) {
        await network.initializeNetwork();
      }

      updateNetworkStatus();
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  }, [network, updateNetworkStatus]);

  useEffect(() => {
    loadP2PSettings();

    const interval = setInterval(updateNetworkStatus, 10000);
    return () => clearInterval(interval);
  }, [loadP2PSettings, updateNetworkStatus]);

  const enableP2PNetwork = async () => {
    setLoading(true);
    try {
      const settings: P2PSettings = {
        joinPrivacyNetwork: true,
        shareAnonymousData: true,
        shareRegionalData: false,
        maxConnections: 10,
        autoReconnect: true,
      };

      await P2PStorage.saveSettings(settings);
      await network.initializeNetwork();

      setIsEnabled(true);
      updateNetworkStatus();
    } catch (error) {
      console.error('Failed to enable P2P network:', error);
    } finally {
      setLoading(false);
    }
  };

  const disableP2PNetwork = async () => {
    setLoading(true);
    try {
      const settings: P2PSettings = {
        joinPrivacyNetwork: false,
        shareAnonymousData: false,
        shareRegionalData: false,
        maxConnections: 10,
        autoReconnect: true,
      };

      await P2PStorage.saveSettings(settings);
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
          Join an experimental peer-to-peer transport for exchanging aggregate
          privacy samples. This is not a verified reputation service or a
          representative community benchmark.
        </p>

        <div className="bg-[var(--bg-secondary)] border border-[var(--warning)]/30 rounded p-3 mb-4">
          <h4 className="text-[var(--warning)] text-sm font-medium mb-2">
            Before joining
          </h4>
          <ul className="text-[var(--text-secondary)] text-xs space-y-1">
            <li>• Peer identity and submitted data are not authenticated.</li>
            <li>
              • Shared fields can include score, grade, counts, categories, and
              optional broad region.
            </li>
            <li>• Connected peers must be treated as untrusted.</li>
            <li>
              • No adoption percentages or peer percentiles are verified.
            </li>
          </ul>
        </div>

        <button
          onClick={enableP2PNetwork}
          disabled={loading}
          className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Connecting...' : 'Join Experimental Network'}
        </button>
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
            Local heuristic score
          </div>
          <div className="text-[var(--accent-primary)] font-medium">
            {userGrade} ({userScore})
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
              Contributing samples
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
          No valid peer samples have been received in this session.
        </div>
      )}

      <button
        onClick={disableP2PNetwork}
        disabled={loading}
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
      >
        {loading ? 'Disconnecting...' : 'Leave Network'}
      </button>
    </div>
  );
};
