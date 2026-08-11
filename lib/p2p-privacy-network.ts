import { joinRoom } from 'trystero';
import { AnonymizationService } from './anonymization';
import { P2PStorage } from './storage/p2p-storage';
import {
  hasCurrentP2PConsent,
  normalizeP2PSettings,
  P2P_ROOM_ID,
  P2P_STATS_ACTION,
} from './p2p-consent.mts';
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
  ) => [
    TrysteroAction<T>,
    (cb: (data: T, peerId: string) => void) => void,
  ];
  onPeerJoin: (cb: (peerId: string) => void) => void;
  onPeerLeave: (cb: (peerId: string) => void) => void;
  leave: () => void;
}

/**
 * Experimental aggregate sample transport.
 *
 * P3 removes domain-reputation requests because they transmitted domain labels
 * and could be mistaken for an authenticated reputation service. Only the
 * canonical minimized aggregate payload remains.
 */
export class P2PPrivacyNetwork {
  private static instance: P2PPrivacyNetwork | null = null;
  private room: TrysteroRoom | null = null;
  private sendStats: TrysteroAction<AnonymousPrivacyData> | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private peerStats: Map<string, AnonymousPrivacyData> = new Map();
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

      const [sendStats, getStats] =
        this.room.makeAction<AnonymousPrivacyData>(P2P_STATS_ACTION);
      this.sendStats = sendStats;

      this.room.onPeerJoin((peerId: string) => {
        this.peers.set(peerId, {
          id: peerId,
          connection: null as unknown as RTCPeerConnection,
          dataChannel: null as unknown as RTCDataChannel,
          lastSeen: Date.now(),
          isActive: true,
        });

        if (
          this.localStats &&
          this.sendStats &&
          this.config.shareAnonymousData &&
          hasCurrentP2PConsent(this.config)
        ) {
          this.sendStats(this.localStats, peerId);
        }
      });

      this.room.onPeerLeave((peerId: string) => {
        this.peers.delete(peerId);
        this.peerStats.delete(peerId);
        this.updateCommunityStats();
      });

      getStats((data: AnonymousPrivacyData, peerId: string) => {
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
      this.room = null;
      this.sendStats = null;
      this.isInitialized = false;
    }
  }

  async shareAnonymousData(data: AnonymousPrivacyData): Promise<void> {
    await this.reloadSettings();
    if (
      !this.isInitialized ||
      !this.config.joinPrivacyNetwork ||
      !this.config.shareAnonymousData ||
      !hasCurrentP2PConsent(this.config) ||
      !AnonymizationService.validateAnonymization(data)
    ) {
      return;
    }

    this.localStats = AnonymizationService.sanitizeForSharing(
      data as unknown as Record<string, unknown>
    ) as unknown as AnonymousPrivacyData;
    await this.broadcastLocalStats();
  }

  getNetworkStatus(): string {
    if (!hasCurrentP2PConsent(this.config)) return 'Consent required';
    if (!this.config.joinPrivacyNetwork) return 'Disabled';
    if (this.initializationFailed) return 'Unavailable in this session';
    if (!this.isInitialized) return 'Connecting...';
    if (this.peers.size === 0) return 'Searching for peers...';
    return `Connected to ${this.peers.size} peer${this.peers.size === 1 ? '' : 's'}`;
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
      this.localStats &&
      this.sendStats &&
      this.config.joinPrivacyNetwork &&
      this.config.shareAnonymousData &&
      hasCurrentP2PConsent(this.config)
    ) {
      this.sendStats(this.localStats);
    }
  }

  private processPeerPrivacyData(
    data: AnonymousPrivacyData,
    peerId: string
  ): void {
    if (!AnonymizationService.validateAnonymization(data)) {
      console.warn(`Ignored invalid or legacy P2P sample from ${peerId}`);
      return;
    }

    const peer = this.peers.get(peerId);
    if (peer) peer.lastSeen = Date.now();
    this.peerStats.set(peerId, data);
    this.updateCommunityStats();
  }

  private updateCommunityStats(): void {
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
        const grade = this.normalizeGrade(sample.grade);
        distribution[grade] = (distribution[grade] || 0) + 1;
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

  private normalizeGrade(grade: string): string {
    const normalized = grade.toUpperCase();
    return ['A', 'B', 'C', 'D', 'F'].includes(normalized)
      ? normalized
      : 'Unknown';
  }

  private async reloadSettings(): Promise<void> {
    this.config = await P2PStorage.getSettings();
  }

  async disconnectFromNetwork(): Promise<void> {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.room) {
      this.room.leave();
      this.room = null;
    }

    this.sendStats = null;
    this.peers.clear();
    this.peerStats.clear();
    this.communityStats = null;
    this.localStats = null;
    this.initializationFailed = false;
    this.isInitialized = false;
  }
}
