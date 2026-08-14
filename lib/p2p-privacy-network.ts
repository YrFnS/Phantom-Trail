import { joinRoom } from 'trystero';
import { P2PStorage } from './storage/p2p-storage';
import {
  hasCurrentP2PConsent,
  normalizeP2PSettings,
  P2P_ROOM_ID,
  P2P_STATS_ACTION,
} from './p2p-consent.mts';
import { parseAnonymousPrivacyData } from './p2p-payload-policy.mts';
import type {
  AnonymousPrivacyData,
  CommunityStats,
  PeerConnection,
  P2PSettings,
} from './types';

interface TrysteroAction<T> {
  (data: T, targetId?: string): void;
}

interface TrysteroRoom {
  makeAction: <T>(
    name: string
  ) => [TrysteroAction<T>, (cb: (data: T, peerId: string) => void) => void];
  onPeerJoin: (cb: (peerId: string) => void) => void;
  onPeerLeave: (cb: (peerId: string) => void) => void;
  leave: () => void;
}

interface PeerInputState {
  lastAttemptAt: number;
  lastAcceptedSignature?: string;
}

/**
 * Experimental aggregate sample transport.
 *
 * Peers are unauthenticated. Every inbound value is therefore parsed into a
 * fresh bounded canonical object before it can affect UI state, and accepted
 * peers are capped by the configured local limit.
 */
export class P2PPrivacyNetwork {
  private static instance: P2PPrivacyNetwork | null = null;
  private static readonly MIN_PEER_MESSAGE_INTERVAL_MS = 5000;
  private static readonly MAX_PEER_ID_LENGTH = 128;
  private room: TrysteroRoom | null = null;
  private sendStats: TrysteroAction<AnonymousPrivacyData> | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private peerStats: Map<string, AnonymousPrivacyData> = new Map();
  private peerInputState: Map<string, PeerInputState> = new Map();
  private isInitialized = false;
  private initializationFailed = false;
  private communityStats: CommunityStats | null = null;
  private localStats: AnonymousPrivacyData | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private config: P2PSettings = normalizeP2PSettings(null);

  private constructor() {
    void this.reloadSettings();
  }

  static getInstance(): P2PPrivacyNetwork {
    if (!P2PPrivacyNetwork.instance) {
      P2PPrivacyNetwork.instance = new P2PPrivacyNetwork();
    }
    return P2PPrivacyNetwork.instance;
  }

  async initializeNetwork(): Promise<void> {
    if (this.isInitialized) return;
    this.initializationFailed = false;

    try {
      await this.reloadSettings();
      if (
        !this.config.joinPrivacyNetwork ||
        !hasCurrentP2PConsent(this.config)
      ) {
        console.log('P2P network disabled or consent is not current');
        return;
      }

      this.room = joinRoom(
        { appId: 'phantom-trail-p3' },
        P2P_ROOM_ID
      ) as unknown as TrysteroRoom;

      const [sendUnknownStats, getStats] =
        this.room.makeAction<unknown>(P2P_STATS_ACTION);
      this.sendStats = (data, targetId) => sendUnknownStats(data, targetId);

      this.room.onPeerJoin((peerId: string) => {
        if (!this.isAcceptablePeerId(peerId) || this.peers.has(peerId)) return;
        if (this.peers.size >= this.config.maxConnections) {
          console.warn('Ignored peer: local accepted-peer limit reached');
          return;
        }

        this.peers.set(peerId, {
          id: peerId,
          connection: null as unknown as RTCPeerConnection,
          dataChannel: null as unknown as RTCDataChannel,
          lastSeen: Date.now(),
          isActive: true,
        });

        this.sendLocalStatsToPeer(peerId);
      });

      this.room.onPeerLeave((peerId: string) => {
        this.peers.delete(peerId);
        this.peerStats.delete(peerId);
        this.peerInputState.delete(peerId);
        this.updateCommunityStats();
      });

      getStats((data: unknown, peerId: string) => {
        this.processPeerPrivacyData(data, peerId);
      });

      this.isInitialized = true;
      if (this.broadcastInterval) clearInterval(this.broadcastInterval);
      this.broadcastInterval = setInterval(
        () => void this.broadcastLocalStats(),
        60000
      );
    } catch (error) {
      this.initializationFailed = true;
      console.error('Failed to initialize P2P network:', error);
      try {
        this.room?.leave();
      } catch {
        // Ignore teardown errors after a partial connection.
      }
      this.clearSessionState();
    }
  }

  async shareAnonymousData(data: AnonymousPrivacyData): Promise<void> {
    await this.reloadSettings();
    const canonical = parseAnonymousPrivacyData(data);
    if (
      !this.isInitialized ||
      !this.config.joinPrivacyNetwork ||
      !this.config.shareAnonymousData ||
      !hasCurrentP2PConsent(this.config) ||
      !canonical
    ) {
      return;
    }

    this.localStats = canonical;
    await this.broadcastLocalStats();
  }

  getNetworkStatus(): string {
    if (!hasCurrentP2PConsent(this.config)) return 'Consent required';
    if (!this.config.joinPrivacyNetwork) return 'Disabled';
    if (this.initializationFailed) return 'Unavailable in this session';
    if (!this.isInitialized) return 'Connecting...';
    if (this.peers.size === 0) return 'Searching for accepted peers...';
    return `Connected to ${this.peers.size} accepted peer${this.peers.size === 1 ? '' : 's'}`;
  }

  /** Compatibility API: domain reputation exchange was removed in P3. */
  async askReputation(domain: string): Promise<number | null> {
    void domain;
    return null;
  }

  /** Compatibility API: domain reputation exchange was removed in P3. */
  async getDomainReputation(domain: string): Promise<number | null> {
    void domain;
    return null;
  }

  getConnectedPeerCount(): number {
    return this.peers.size;
  }

  isNetworkActive(): boolean {
    return this.isInitialized && this.peers.size > 0;
  }

  getCommunityStats(): CommunityStats | null {
    return this.communityStats;
  }

  private async broadcastLocalStats(): Promise<void> {
    await this.reloadSettings();
    if (
      !this.localStats ||
      !this.sendStats ||
      !this.config.joinPrivacyNetwork ||
      !this.config.shareAnonymousData ||
      !hasCurrentP2PConsent(this.config)
    ) {
      return;
    }

    const canonical = parseAnonymousPrivacyData(this.localStats);
    if (!canonical) {
      this.localStats = null;
      return;
    }
    this.localStats = canonical;

    // Never broadcast to every room participant. Only peers admitted under the
    // local cap receive the canonical minimized sample.
    for (const peerId of this.peers.keys()) {
      this.sendStats(canonical, peerId);
    }
  }

  private processPeerPrivacyData(data: unknown, peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const now = Date.now();
    const previous = this.peerInputState.get(peerId);
    if (
      previous &&
      now - previous.lastAttemptAt <
        P2PPrivacyNetwork.MIN_PEER_MESSAGE_INTERVAL_MS
    ) {
      return;
    }
    this.peerInputState.set(peerId, {
      lastAttemptAt: now,
      lastAcceptedSignature: previous?.lastAcceptedSignature,
    });

    const canonical = parseAnonymousPrivacyData(data, now);
    if (!canonical) {
      console.warn('Ignored malformed P2P sample from an accepted peer');
      return;
    }

    const signature = JSON.stringify(canonical);
    if (previous?.lastAcceptedSignature === signature) return;

    peer.lastSeen = now;
    this.peerInputState.set(peerId, {
      lastAttemptAt: now,
      lastAcceptedSignature: signature,
    });
    this.peerStats.set(peerId, canonical);
    this.updateCommunityStats();
  }

  private updateCommunityStats(): void {
    const now = Date.now();
    for (const [peerId, sample] of this.peerStats) {
      const canonical = parseAnonymousPrivacyData(sample, now);
      if (!canonical) {
        this.peerStats.delete(peerId);
        continue;
      }
      this.peerStats.set(peerId, canonical);
    }

    const samples = Array.from(this.peerStats.values());
    if (samples.length === 0) {
      this.communityStats = null;
      return;
    }

    const averageScore =
      samples.reduce((sum, sample) => sum + sample.privacyScore, 0) /
      samples.length;
    const scoreDistribution = samples.reduce<Record<string, number>>(
      (distribution, sample) => {
        distribution[sample.grade] = (distribution[sample.grade] || 0) + 1;
        return distribution;
      },
      {}
    );

    this.communityStats = {
      connectedPeers: this.peers.size,
      averageScore: Math.round(averageScore),
      scoreDistribution,
      regionalData: {},
      lastUpdated: Date.now(),
      dataFreshness: Math.max(...samples.map(sample => sample.timestamp)),
    };
  }

  private async reloadSettings(): Promise<void> {
    this.config = await P2PStorage.getSettings();
    while (this.peers.size > this.config.maxConnections) {
      const peerId = this.peers.keys().next().value as string | undefined;
      if (!peerId) break;
      this.peers.delete(peerId);
      this.peerStats.delete(peerId);
      this.peerInputState.delete(peerId);
    }
    this.updateCommunityStats();
  }

  private sendLocalStatsToPeer(peerId: string): void {
    if (
      !this.localStats ||
      !this.sendStats ||
      !this.config.joinPrivacyNetwork ||
      !this.config.shareAnonymousData ||
      !hasCurrentP2PConsent(this.config)
    ) {
      return;
    }

    const canonical = parseAnonymousPrivacyData(this.localStats);
    if (!canonical) {
      this.localStats = null;
      return;
    }
    this.localStats = canonical;
    this.sendStats(canonical, peerId);
  }

  private isAcceptablePeerId(peerId: string): boolean {
    return (
      peerId.length > 0 &&
      peerId.length <= P2PPrivacyNetwork.MAX_PEER_ID_LENGTH &&
      !Array.from(peerId).some(character => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })
    );
  }

  private clearSessionState(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    this.room = null;
    this.sendStats = null;
    this.peers.clear();
    this.peerStats.clear();
    this.peerInputState.clear();
    this.communityStats = null;
    this.localStats = null;
    this.isInitialized = false;
  }

  async disconnectFromNetwork(): Promise<void> {
    try {
      this.room?.leave();
    } catch (error) {
      console.warn('P2P room teardown failed:', error);
    } finally {
      this.clearSessionState();
      this.initializationFailed = false;
    }
  }
}
