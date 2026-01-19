import { AnonymousPrivacyData, CommunityStats, NetworkMessage, PeerConnection } from './types';

export class P2PPrivacyNetwork {
  private static instance: P2PPrivacyNetwork | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private localPeerId: string;
  private rtcConfig: RTCConfiguration;
  private isInitialized = false;
  private communityStats: CommunityStats | null = null;
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.localPeerId = this.generatePeerId();
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  static getInstance(): P2PPrivacyNetwork {
    if (!P2PPrivacyNetwork.instance) {
      P2PPrivacyNetwork.instance = new P2PPrivacyNetwork();
    }
    return P2PPrivacyNetwork.instance;
  }

  async initializeNetwork(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check user consent
      const hasConsent = await this.hasUserConsent();
      if (!hasConsent) {
        console.log('P2P network disabled - user has not opted in');
        return;
      }

      // Set up message listener for peer discovery
      this.setupMessageListener();

      // Start peer discovery
      await this.discoverPeers();

      // Start periodic peer discovery
      this.discoveryInterval = setInterval(() => {
        this.discoverPeers();
        this.cleanupInactivePeers();
      }, 30000); // Every 30 seconds

      this.isInitialized = true;
      console.log('P2P Privacy Network initialized');
    } catch (error) {
      console.error('Failed to initialize P2P network:', error);
    }
  }

  async discoverPeers(): Promise<PeerConnection[]> {
    try {
      // Broadcast discovery message to all tabs
      const tabs = await chrome.tabs.query({});
      const discoveryMessage = {
        type: 'peer_discovery',
        sender: this.localPeerId,
        extensionId: chrome.runtime.id,
        timestamp: Date.now()
      };

      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, discoveryMessage).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        }
      });

      return Array.from(this.peers.values());
    } catch (error) {
      console.error('Peer discovery failed:', error);
      return [];
    }
  }

  async connectToPeer(peerId: string): Promise<PeerConnection | null> {
    if (this.peers.has(peerId) || peerId === this.localPeerId) {
      return null;
    }

    // Check connection limits
    if (this.peers.size >= 10) {
      console.log('Maximum peer connections reached');
      return null;
    }

    try {
      const connection = new RTCPeerConnection(this.rtcConfig);
      const dataChannel = connection.createDataChannel('privacy_data', {
        ordered: true
      });

      // Set up data channel handlers
      dataChannel.onopen = () => {
        console.log(`Data channel opened with peer ${peerId}`);
      };

      dataChannel.onmessage = (event) => {
        this.handlePeerMessage(JSON.parse(event.data));
      };

      dataChannel.onerror = (error) => {
        console.error(`Data channel error with peer ${peerId}:`, error);
        this.disconnectPeer(peerId);
      };

      // Set up connection handlers
      connection.oniceconnectionstatechange = () => {
        if (connection.iceConnectionState === 'disconnected' || 
            connection.iceConnectionState === 'failed') {
          this.disconnectPeer(peerId);
        }
      };

      const peer: PeerConnection = {
        id: peerId,
        connection,
        dataChannel,
        lastSeen: Date.now(),
        isActive: true
      };

      this.peers.set(peerId, peer);
      return peer;
    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      return null;
    }
  }

  async shareAnonymousData(data: AnonymousPrivacyData): Promise<void> {
    if (!this.isInitialized || this.peers.size === 0) {
      return;
    }

    const message: NetworkMessage = {
      type: 'privacy_data',
      data,
      timestamp: Date.now(),
      sender: this.localPeerId
    };

    // Use gossip protocol - share with random subset of peers
    const activePeers = Array.from(this.peers.values()).filter(p => p.isActive);
    const gossipTargets = this.selectRandomPeers(activePeers, Math.min(3, activePeers.length));

    gossipTargets.forEach(peer => {
      if (peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send data to peer ${peer.id}:`, error);
          this.disconnectPeer(peer.id);
        }
      }
    });
  }

  async getCommunityStats(): Promise<CommunityStats> {
    if (this.communityStats) {
      return this.communityStats;
    }

    // Return default stats if no community data
    return {
      connectedPeers: this.peers.size,
      averageScore: 0,
      scoreDistribution: {},
      regionalData: {},
      lastUpdated: Date.now(),
      dataFreshness: 0
    };
  }

  async disconnectFromNetwork(): Promise<void> {
    // Clear discovery interval
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    // Disconnect all peers
    for (const peer of this.peers.values()) {
      this.disconnectPeer(peer.id);
    }

    this.peers.clear();
    this.isInitialized = false;
    console.log('Disconnected from P2P network');
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'peer_discovery' && 
          message.extensionId === chrome.runtime.id &&
          message.sender !== this.localPeerId) {
        
        // Respond to peer discovery
        if (this.shouldConnectToPeer(message.sender)) {
          this.connectToPeer(message.sender);
        }
        
        sendResponse({ 
          type: 'peer_response', 
          peerId: this.localPeerId 
        });
      }
    });
  }

  private shouldConnectToPeer(peerId: string): boolean {
    const maxConnections = 10;
    return this.peers.size < maxConnections && 
           !this.peers.has(peerId) && 
           peerId !== this.localPeerId;
  }

  private handlePeerMessage(message: NetworkMessage): void {
    // Update peer last seen - we'll get sender from message
    const peer = this.peers.get(message.sender);
    if (peer) {
      peer.lastSeen = Date.now();
    }

    switch (message.type) {
      case 'privacy_data':
        this.processPeerPrivacyData(message.data as AnonymousPrivacyData);
        break;
      case 'stats_request':
        this.sendCommunityStats(message.sender);
        break;
    }
  }

  private processPeerPrivacyData(data: AnonymousPrivacyData): void {
    // Update community statistics with new peer data
    // This is a simplified version - in practice, you'd maintain a rolling window
    console.log('Received peer privacy data:', data);
    
    // Trigger community stats recalculation
    this.recalculateCommunityStats();
  }

  private recalculateCommunityStats(): void {
    // Simplified community stats calculation
    // In practice, you'd collect data from all peers over time
    this.communityStats = {
      connectedPeers: this.peers.size,
      averageScore: 85, // Placeholder
      scoreDistribution: {
        'A': 0.3,
        'B': 0.4,
        'C': 0.2,
        'D': 0.1
      },
      regionalData: {},
      lastUpdated: Date.now(),
      dataFreshness: Date.now()
    };
  }

  private sendCommunityStats(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer || peer.dataChannel.readyState !== 'open') {
      return;
    }

    const message: NetworkMessage = {
      type: 'stats_request',
      data: this.communityStats!,
      timestamp: Date.now(),
      sender: this.localPeerId
    };

    try {
      peer.dataChannel.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send stats to peer ${peerId}:`, error);
    }
  }

  private disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        peer.dataChannel.close();
        peer.connection.close();
      } catch (error) {
        console.error(`Error disconnecting peer ${peerId}:`, error);
      }
      this.peers.delete(peerId);
    }
  }

  private cleanupInactivePeers(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > timeout) {
        console.log(`Cleaning up inactive peer: ${peerId}`);
        this.disconnectPeer(peerId);
      }
    }
  }

  private selectRandomPeers(peers: PeerConnection[], count: number): PeerConnection[] {
    const shuffled = [...peers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private generatePeerId(): string {
    return 'peer_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private async hasUserConsent(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['p2pSettings']);
      return result.p2pSettings?.joinPrivacyNetwork || false;
    } catch (error) {
      console.error('Failed to check user consent:', error);
      return false;
    }
  }

  // Public getters for UI
  getConnectedPeerCount(): number {
    return this.peers.size;
  }

  isNetworkActive(): boolean {
    return this.isInitialized && this.peers.size > 0;
  }

  getNetworkStatus(): string {
    if (!this.isInitialized) return 'Disabled';
    if (this.peers.size === 0) return 'Searching for peers...';
    return `Connected to ${this.peers.size} peer${this.peers.size === 1 ? '' : 's'}`;
  }
}
