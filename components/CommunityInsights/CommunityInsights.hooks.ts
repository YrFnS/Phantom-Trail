import { useState, useEffect, useCallback } from 'react';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import { CommunityStats, P2PSettings, PrivacyData } from '../../lib/types';
import { ChromeStorage } from '../../lib/chrome-storage';

export const useCommunityInsights = () => {
  const [network] = useState(() => P2PPrivacyNetwork.getInstance());
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(
    null
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  const updateNetworkStatus = useCallback(async () => {
    try {
      const connected = network.isNetworkActive();
      const count = network.getConnectedPeerCount();

      setIsConnected(connected);
      setPeerCount(count);

      if (connected) {
        const stats = await network.getCommunityStats();
        setCommunityStats(stats);
      }
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  }, [network]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = (await ChromeStorage.getLocal<P2PSettings>(
        'p2pSettings'
      )) || {
        joinPrivacyNetwork: false,
        shareAnonymousData: false,
        shareRegionalData: false,
        maxConnections: 10,
        autoReconnect: true,
      };

      setIsEnabled(settings.joinPrivacyNetwork);

      if (settings.joinPrivacyNetwork) {
        await network.initializeNetwork();
        updateNetworkStatus();
      }
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  }, [network, updateNetworkStatus]);

  useEffect(() => {
    loadSettings();

    const interval = setInterval(() => {
      updateNetworkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadSettings, updateNetworkStatus]);

  const enableNetwork = async () => {
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
      throw error;
    }
  };

  const disableNetwork = async () => {
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
      setIsConnected(false);
      setPeerCount(0);
      setCommunityStats(null);
    } catch (error) {
      console.error('Failed to disable P2P network:', error);
      throw error;
    }
  };

  const sharePrivacyData = async (privacyData: PrivacyData) => {
    if (!isEnabled || !isConnected) return;

    try {
      // Anonymize data before sharing
      const { AnonymizationService } = await import('../../lib/anonymization');
      const anonymizedData = AnonymizationService.anonymizeForP2P(privacyData);

      await network.shareAnonymousData(anonymizedData);
    } catch (error) {
      console.error('Failed to share privacy data:', error);
    }
  };

  return {
    isEnabled,
    isConnected,
    peerCount,
    communityStats,
    networkStatus: network.getNetworkStatus(),
    enableNetwork,
    disableNetwork,
    sharePrivacyData,
    updateNetworkStatus,
  };
};
