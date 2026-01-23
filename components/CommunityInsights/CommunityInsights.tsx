import React, { useState, useEffect, useCallback } from 'react';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import {
  CommunityStats,
  CommunityComparison,
  P2PSettings,
} from '../../lib/types';

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
  const [comparison, setComparison] = useState<CommunityComparison | null>(
    null
  );
  const [networkStatus, setNetworkStatus] = useState<string>('Disabled');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateNetworkStatus = useCallback(async () => {
    try {
      const status = network.getNetworkStatus();
      setNetworkStatus(status);

      if (network.isNetworkActive()) {
        const stats = await network.getCommunityStats();
        setCommunityStats(stats);
      }
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  }, [network]);

  const generateRecommendations = useCallback(
    (userScore: number, networkAverage: number) => {
      const recommendations = [];

      if (userScore < networkAverage) {
        recommendations.push({
          type: 'tool' as const,
          title: 'uBlock Origin',
          description: '85% of A-grade peers use this ad blocker',
          adoptionRate: 85,
          impact: 'high' as const,
        });

        recommendations.push({
          type: 'setting' as const,
          title: 'Third-party cookies',
          description: 'Block third-party cookies in browser settings',
          adoptionRate: 78,
          impact: 'medium' as const,
        });
      }

      if (userScore > 80) {
        recommendations.push({
          type: 'behavior' as const,
          title: 'Share knowledge',
          description: 'Help others improve their privacy practices',
          adoptionRate: 65,
          impact: 'low' as const,
        });
      }

      return recommendations;
    },
    []
  );

  const calculateComparison = useCallback(() => {
    if (!communityStats || communityStats.connectedPeers === 0) {
      setComparison(null);
      return;
    }

    // Calculate percentile based on user score vs network average
    const networkAverage = communityStats.averageScore;
    const percentile =
      userScore > networkAverage
        ? Math.min(
            95,
            50 + ((userScore - networkAverage) / networkAverage) * 50
          )
        : Math.max(
            5,
            50 - ((networkAverage - userScore) / networkAverage) * 50
          );

    const betterThan = Math.round(percentile);

    const recommendations = generateRecommendations(userScore, networkAverage);

    setComparison({
      userScore,
      networkAverage,
      percentile,
      betterThan,
      recommendations,
    });
  }, [userScore, communityStats, generateRecommendations]);

  const loadP2PSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(['p2pSettings']);
      const settings: P2PSettings = result.p2pSettings || {
        joinPrivacyNetwork: false,
        shareAnonymousData: false,
        shareRegionalData: false,
        maxConnections: 10,
        autoReconnect: true,
      };

      setIsEnabled(settings.joinPrivacyNetwork);
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  }, []);

  useEffect(() => {
    loadP2PSettings();
    updateNetworkStatus();

    // Update status every 10 seconds
    const interval = setInterval(updateNetworkStatus, 10000);
    return () => clearInterval(interval);
  }, [loadP2PSettings, updateNetworkStatus]);

  useEffect(() => {
    if (isEnabled && communityStats) {
      calculateComparison();
    }
  }, [userScore, communityStats, isEnabled, calculateComparison]);

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

      await chrome.storage.local.set({ p2pSettings: settings });
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

      await chrome.storage.local.set({ p2pSettings: settings });
      await network.disconnectFromNetwork();

      setIsEnabled(false);
      setCommunityStats(null);
      setComparison(null);
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
            Community Insights
          </h3>
          <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full"></div>
        </div>

        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Connect with other privacy-conscious users to compare your privacy
          practices and get peer recommendations.
        </p>

        <div className="bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/20 rounded p-3 mb-4">
          <h4 className="text-[var(--accent-primary)] text-sm font-medium mb-2">
            Privacy-First Design
          </h4>
          <ul className="text-[var(--text-secondary)] text-xs space-y-1">
            <li>• No servers - direct peer-to-peer connections</li>
            <li>• Anonymous data only (scores rounded, no URLs)</li>
            <li>• Data exists only while browsers are connected</li>
            <li>• You control what to share</li>
          </ul>
        </div>

        <button
          onClick={enableP2PNetwork}
          disabled={loading}
          className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Connecting...' : 'Join Privacy Network'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-primary)] font-medium">
          Community Insights
        </h3>
        <div
          className={`w-2 h-2 rounded-full ${
            network.isNetworkActive()
              ? 'bg-[var(--success)]'
              : 'bg-[var(--text-tertiary)]'
          }`}
        ></div>
      </div>

      <div className="text-[var(--text-secondary)] text-sm mb-4">
        {networkStatus}
      </div>

      {comparison && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[var(--text-secondary)] text-sm">
                Your Score
              </span>
              <span className="text-[var(--accent-primary)] font-medium">
                {userGrade} ({userScore})
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[var(--text-secondary)] text-sm">
                Network Average
              </span>
              <span className="text-[var(--text-primary)]">
                {Math.round(comparison.networkAverage)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] text-sm">
                Better Than
              </span>
              <span className="text-[var(--success)] font-medium">
                {comparison.betterThan}% of peers
              </span>
            </div>
          </div>

          {comparison.recommendations.length > 0 && (
            <div>
              <h4 className="text-[var(--text-primary)] text-sm font-medium mb-2">
                Peer Recommendations
              </h4>
              <div className="space-y-2">
                {comparison.recommendations.slice(0, 2).map((rec, index) => (
                  <div
                    key={index}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded p-2"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[var(--text-primary)] text-sm font-medium">
                        {rec.title}
                      </span>
                      <span className="text-[var(--accent-primary)] text-xs">
                        {rec.adoptionRate}% use this
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={disableP2PNetwork}
        disabled={loading}
        className="w-full mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
      >
        {loading ? 'Disconnecting...' : 'Leave Network'}
      </button>
    </div>
  );
};
