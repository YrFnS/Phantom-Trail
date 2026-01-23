import { P2PPrivacyNetwork } from './p2p-privacy-network';

export class P2PDiscoveryService {
  private static instance: P2PDiscoveryService | null = null;
  private network: P2PPrivacyNetwork;
  private discoveryActive = false;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.network = P2PPrivacyNetwork.getInstance();
  }

  static getInstance(): P2PDiscoveryService {
    if (!P2PDiscoveryService.instance) {
      P2PDiscoveryService.instance = new P2PDiscoveryService();
    }
    return P2PDiscoveryService.instance;
  }

  /**
   * Start peer discovery process
   */
  async startDiscovery(): Promise<void> {
    if (this.discoveryActive) return;

    try {
      this.discoveryActive = true;

      // Set up content script messaging for cross-tab discovery
      this.setupContentScriptDiscovery();

      // Start periodic broadcast
      this.broadcastInterval = setInterval(() => {
        this.broadcastDiscovery();
      }, 15000); // Every 15 seconds

      // Initial discovery
      await this.broadcastDiscovery();

      console.log('P2P discovery service started');
    } catch (error) {
      console.error('Failed to start peer discovery:', error);
      this.discoveryActive = false;
    }
  }

  /**
   * Stop peer discovery
   */
  stopDiscovery(): void {
    this.discoveryActive = false;

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    console.log('P2P discovery service stopped');
  }

  /**
   * Broadcast discovery message to find other Phantom Trail users
   */
  private async broadcastDiscovery(): Promise<void> {
    if (!this.discoveryActive) return;

    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});

      const discoveryMessage = {
        type: 'phantom_trail_discovery',
        extensionId: chrome.runtime.id,
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
      };

      // Send discovery message to all tabs
      const promises = tabs.map(tab => {
        if (tab.id) {
          return chrome.tabs.sendMessage(tab.id, discoveryMessage).catch(() => {
            // Ignore errors for tabs without content script
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Discovery broadcast failed:', error);
    }
  }

  /**
   * Set up content script communication for peer discovery
   */
  private setupContentScriptDiscovery(): void {
    // Listen for discovery responses from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (
        message.type === 'phantom_trail_peer_found' &&
        message.extensionId === chrome.runtime.id
      ) {
        this.handlePeerDiscovered(message.peerId, sender.tab?.id);
        sendResponse({ acknowledged: true });
      }
    });
  }

  /**
   * Handle discovered peer
   */
  private async handlePeerDiscovered(
    peerId: string,
    tabId?: number
  ): Promise<void> {
    try {
      // Attempt to connect to discovered peer
      const connection = await this.network.connectToPeer(peerId);

      if (connection) {
        console.log(`Successfully connected to peer: ${peerId}`);

        // Optionally store peer info for reconnection
        this.storePeerInfo(peerId, tabId);
      }
    } catch (error) {
      console.error(`Failed to connect to discovered peer ${peerId}:`, error);
    }
  }

  /**
   * Store peer information for potential reconnection
   */
  private async storePeerInfo(peerId: string, tabId?: number): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['knownPeers']);
      const knownPeers = result.knownPeers || {};

      knownPeers[peerId] = {
        lastSeen: Date.now(),
        tabId,
        connectionAttempts: (knownPeers[peerId]?.connectionAttempts || 0) + 1,
      };

      // Keep only recent peers (last 24 hours)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      Object.keys(knownPeers).forEach(id => {
        if (knownPeers[id].lastSeen < dayAgo) {
          delete knownPeers[id];
        }
      });

      await chrome.storage.local.set({ knownPeers });
    } catch (error) {
      console.error('Failed to store peer info:', error);
    }
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<{
    isActive: boolean;
    knownPeersCount: number;
    lastDiscoveryTime: number;
  }> {
    try {
      const result = await chrome.storage.local.get(['knownPeers']);
      const knownPeers: Record<
        string,
        { lastSeen: number; connectionAttempts: number; tabId?: number }
      > = result.knownPeers || {};

      return {
        isActive: this.discoveryActive,
        knownPeersCount: Object.keys(knownPeers).length,
        lastDiscoveryTime:
          Object.keys(knownPeers).length > 0
            ? Math.max(...Object.values(knownPeers).map(peer => peer.lastSeen))
            : 0,
      };
    } catch (error) {
      console.error('Failed to get discovery stats:', error);
      return {
        isActive: this.discoveryActive,
        knownPeersCount: 0,
        lastDiscoveryTime: 0,
      };
    }
  }

  /**
   * Reconnect to known peers
   */
  async reconnectToKnownPeers(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['knownPeers']);
      const knownPeers = result.knownPeers || {};

      // Try to reconnect to recent peers
      const recentPeers = Object.entries(knownPeers)
        .filter(([, info]) => {
          const peerInfo = info as {
            lastSeen: number;
            connectionAttempts: number;
          };
          const hourAgo = Date.now() - 60 * 60 * 1000;
          return peerInfo.lastSeen > hourAgo && peerInfo.connectionAttempts < 5;
        })
        .slice(0, 5); // Limit reconnection attempts

      for (const [peerId] of recentPeers) {
        try {
          await this.network.connectToPeer(peerId);
        } catch (error) {
          console.error(`Failed to reconnect to peer ${peerId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to reconnect to known peers:', error);
    }
  }
}
