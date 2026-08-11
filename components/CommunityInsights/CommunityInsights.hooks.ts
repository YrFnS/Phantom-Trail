import { useState, useEffect, useCallback } from 'react';
import { P2PPrivacyNetwork } from '../../lib/p2p-privacy-network';
import type { CommunityStats, PrivacyData } from '../../lib/types';
import { P2PStorage } from '../../lib/storage/p2p-storage';
import { hasCurrentP2PConsent } from '../../lib/p2p-consent.mts';

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
      setIsConnected(connected);
      setPeerCount(network.getConnectedPeerCount());
      setCommunityStats(connected ? network.getCommunityStats() : null);
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  }, [network]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await P2PStorage.getSettings();
      const enabled =
        hasCurrentP2PConsent(settings) && settings.joinPrivacyNetwork;
      setIsEnabled(enabled);
      if (enabled) {
        await network.initializeNetwork();
        await updateNetworkStatus();
      }
    } catch (error) {
      console.error('Failed to load P2P settings:', error);
    }
  }, [network, updateNetworkStatus]);

  useEffect(() => {
    void loadSettings();
    const interval = setInterval(() => {
      void updateNetworkStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadSettings, updateNetworkStatus]);

  const enableNetwork = async () => {
    const settings = await P2PStorage.getSettings();
    if (!hasCurrentP2PConsent(settings)) {
      throw new Error(
        'Current P2P disclosure consent is required in Settings → P2P.'
      );
    }

    const saved = await P2PStorage.saveSettings({
      ...settings,
      joinPrivacyNetwork: true,
    });
    await network.initializeNetwork();
    setIsEnabled(saved.joinPrivacyNetwork);
    await updateNetworkStatus();
  };

  const disableNetwork = async () => {
    const settings = await P2PStorage.getSettings();
    await P2PStorage.saveSettings({
      ...settings,
      joinPrivacyNetwork: false,
      shareAnonymousData: false,
      shareRegionalData: false,
    });
    await network.disconnectFromNetwork();
    setIsEnabled(false);
    setIsConnected(false);
    setPeerCount(0);
    setCommunityStats(null);
  };

  const sharePrivacyData = async (privacyData: PrivacyData) => {
    if (!isEnabled || !isConnected) return;

    try {
      const settings = await P2PStorage.getSettings();
      const { AnonymizationService } = await import('../../lib/anonymization');
      const anonymizedData = AnonymizationService.anonymizeForP2P(
        privacyData,
        settings
      );
      if (!anonymizedData) return;
      await network.shareAnonymousData(anonymizedData);
    } catch (error) {
      console.error('Failed to share aggregate peer data:', error);
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
