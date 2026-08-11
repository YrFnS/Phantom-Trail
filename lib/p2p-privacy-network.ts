import { joinRoom } from 'trystero';
import { EventsStorage } from './storage/events-storage';
import { eventMatchesPageDomain, normalizeDomain } from './event-attribution.mts';
import type {
  AnonymousPrivacyData,
  CommunityStats,
  PeerConnection,
  P2PSettings,
} from './types';

interface ReputationRequest {
  id: string;
  domain: string;
}

interface ReputationResponse {
  requestId: string;
  domain: string;
  score: number;
}

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

const ACTION_NAMES = {
  stats: 'stats',
  reputationRequest: 'rep_req',
  reputationResponse: 'rep_res',
} as const;

export class P2PPrivacyNetwork {
  private static instance: P2PPrivacyNetwork | null = null;
  private room: TrysteroRoom | null = null;
  private sendStats: TrysteroAction<AnonymousPrivacyData> | null = null;
  private sendReputationRequest: TrysteroAction<ReputationRequest> | null = null;
  private sendReputationResponse: TrysteroAction<ReputationResponse> | null =
    null;

  private peers: Map<string, PeerConnection> = new Map();
  private peerStats: Map<string, AnonymousPrivacyData> = new Map();
  private isInitialized = false;
  private initializationFailed = false;
  private communityStats: CommunityStats | null = null;
  private localStats: AnonymousPrivacyData | null = null;
  private reputationCallbacks: Map<string, (score: number) => void> = new Map();
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  private readonly config: P2PSettings = {
    joinPrivacyNetwork: false,
    shareAnonymousData: false,
    shareRegionalData: false,
    maxConnections: 10,
    autoReconnect: true,
  };

  private constructor() {
    chrome.storage.local
      .get(['p2pSettings'])
      .then(result => {
        if (result.p2pSettings) {
          Object.assign(this.config, result.p2pSettings);
        }
      })
      .catch(error => {
        console.warn('Failed to load P2P settings:', error);
      });
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
      const result = await chrome.storage.local.get(['p2pSettings']);
      if (result.p2pSettings) {
        Object.assign(this.config, result.p2pSettings);
      }

      if (!this.config.joinPrivacyNetwork) {
        console.log('P2P network disabled by user settings');
        return;
      }

      const config = { appId: 'phantom-trail-v1' };
      this.room = joinRoom(
        config,
        'global-discovery'
      ) as unknown as TrysteroRoom;

      const [sendStats, getStats] =
        this.room.makeAction<AnonymousPrivacyData>(ACTION_NAMES.stats);
      const [sendReputationRequest, getReputationRequest] =
        this.room.makeAction<ReputationRequest>(ACTION_NAMES.reputationRequest);
      const [sendReputationResponse, getReputationResponse] =
        this.room.makeAction<ReputationResponse>(
          ACTION_NAMES.reputationResponse
        );

      this.sendStats = sendStats;
      this.sendReputationRequest = sendReputationRequest;
      this.sendReputationResponse = sendReputationResponse;

      this.room.onPeerJoin((peerId: string) => {
        console.log(`Peer joined: ${peerId}`);
        this.peers.set(peerId, {
          id: peerId,
          connection: null as unknown as RTCPeerConnection,
          dataChannel: null as unknown as RTCDataChannel,
          lastSeen: Date.now(),
          isActive: true,
        });

        if (this.localStats && this.sendStats) {
          this.sendStats(this.localStats, peerId);
        }
      });

      this.room.onPeerLeave((peerId: string) => {
        console.log(`Peer left: ${peerId}`);
        this.peers.delete(peerId);
        this.peerStats.delete(peerId);
        this.updateCommunityStats();
      });

      getStats((data: AnonymousPrivacyData, peerId: string) => {
        this.processPeerPrivacyData(data, peerId);
      });

      getReputationRequest(
        async (request: ReputationRequest, peerId: string) => {
          await this.handleReputationRequest(request, peerId);
        }
      );

      getReputationResponse((response: ReputationResponse) => {
        this.handleReputationResponse(response);
      });

      this.isInitialized = true;
      console.log('P2P Privacy Network initialized (experimental)');

      if (this.broadcastInterval) clearInterval(this.broadcastInterval);
      this.broadcastInterval = setInterval(
        () => this.broadcastLocalStats(),
        60000
      );
    } catch (error) {
      this.initializationFailed = true;
      console.error('Failed to initialize P2P network:', error);

      try {
        this.room?.leave();
      } catch (leaveError) {
        console.warn(
          'Failed to leave partially initialized P2P room:',
          leaveError
        );
      }

      this.room = null;
      this.sendStats = null;
      this.sendReputationRequest = null;
      this.sendReputationResponse = null;
      this.isInitialized = false;
    }
  }

  async shareAnonymousData(data: AnonymousPrivacyData): Promise<void> {
    if (
      !this.isInitialized ||
      !this.config.shareAnonymousData ||
      !this.isValidAnonymousPrivacyData(data)
    ) {
      return;
    }

    this.localStats = data;
    this.broadcastLocalStats();
  }

  getNetworkStatus(): string {
    if (!this.config.joinPrivacyNetwork) return 'Disabled';
    if (this.initializationFailed) return 'Unavailable in this session';
    if (!this.isInitialized) return 'Connecting...';
    if (this.peers.size === 0) return 'Searching for peers...';
    return `Connected to ${this.peers.size} peer${this.peers.size === 1 ? '' : 's'}`;
  }

  async askReputation(domain: string): Promise<number | null> {
    return this.getDomainReputation(domain);
  }

  async getDomainReputation(domain: string): Promise<number | null> {
    if (!this.isInitialized || this.peers.size === 0) return null;

    const requestId = Math.random().toString(36).substring(7);
    const request: ReputationRequest = { id: requestId, domain };

    if (this.sendReputationRequest) this.sendReputationRequest(request);

    return new Promise(resolve => {
      const responses: number[] = [];

      const finish = () => {
        this.reputationCallbacks.delete(requestId);
        if (responses.length === 0) {
          resolve(null);
          return;
        }

        const sum = responses.reduce((first, second) => first + second, 0);
        resolve(Math.round(sum / responses.length));
      };

      const timeout = setTimeout(finish, 1500);
      this.reputationCallbacks.set(requestId, score => {
        if (!Number.isFinite(score) || score < 0 || score > 100) return;

        responses.push(score);
        if (responses.length >= 5) {
          clearTimeout(timeout);
          finish();
        }
      });
    });
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

  private broadcastLocalStats(): void {
    if (this.localStats && this.sendStats) this.sendStats(this.localStats);
  }

  private processPeerPrivacyData(
    data: AnonymousPrivacyData,
    peerId: string
  ): void {
    if (!this.isValidAnonymousPrivacyData(data)) {
      console.warn(`Ignored invalid or legacy P2P score sample from ${peerId}`);
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

  private isValidAnonymousPrivacyData(data: AnonymousPrivacyData): boolean {
    const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const validConfidence = ['low', 'medium', 'high'].includes(
      data.scoreConfidence || ''
    );

    return (
      data.scoreStatus === 'estimated' &&
      validConfidence &&
      Number.isFinite(data.privacyScore) &&
      data.privacyScore >= 0 &&
      data.privacyScore <= 100 &&
      Number.isFinite(data.trackerCount) &&
      data.trackerCount >= 0 &&
      data.trackerCount <= 50 &&
      ['A', 'B', 'C', 'D', 'F'].includes(data.grade.toUpperCase()) &&
      Array.isArray(data.websiteCategories) &&
      data.websiteCategories.length <= 5 &&
      Number.isFinite(data.timestamp) &&
      riskLevels.every(
        level =>
          Number.isFinite(data.riskDistribution?.[level]) &&
          data.riskDistribution[level] >= 0
      )
    );
  }

  private normalizeGrade(grade: string): string {
    const normalized = grade.toUpperCase();
    return ['A', 'B', 'C', 'D', 'F'].includes(normalized)
      ? normalized
      : 'Unknown';
  }

  private async handleReputationRequest(
    request: ReputationRequest,
    peerId: string
  ): Promise<void> {
    const domain = normalizeDomain(request.domain);
    if (!domain) return;

    const events = await EventsStorage.getRecentEvents(1000);
    const domainEvents = events.filter(event =>
      eventMatchesPageDomain(event, domain)
    );
    const { calculatePrivacyScoreSync } = await import('./privacy-score');
    const result = calculatePrivacyScoreSync(domainEvents, true, {
      scope: 'page',
      pageDomain: domain,
    });

    if (result.status !== 'estimated' || result.score === null) return;

    const response: ReputationResponse = {
      requestId: request.id,
      domain,
      score: result.score,
    };

    if (this.sendReputationResponse) {
      this.sendReputationResponse(response, peerId);
    }
  }

  private handleReputationResponse(response: ReputationResponse): void {
    if (
      !Number.isFinite(response.score) ||
      response.score < 0 ||
      response.score > 100
    ) {
      return;
    }

    const callback = this.reputationCallbacks.get(response.requestId);
    if (callback) callback(response.score);
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
    this.sendReputationRequest = null;
    this.sendReputationResponse = null;
    this.peers.clear();
    this.peerStats.clear();
    this.communityStats = null;
    this.localStats = null;
    this.initializationFailed = false;
    this.isInitialized = false;
    console.log('Disconnected from P2P network');
  }
}
