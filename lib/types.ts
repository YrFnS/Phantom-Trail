/**
 * Core types for Phantom Trail extension
 */

export type DetectionSource =
  | 'network-request'
  | 'dom-resource'
  | 'main-world-api'
  | 'user-interaction'
  | 'extension-internal'
  | 'legacy';

export type DetectionConfidence = 'low' | 'medium' | 'high';

export type PartyRelationship = 'first-party' | 'third-party' | 'unknown';

export type PartyBasis =
  | 'same-host'
  | 'subdomain'
  | 'same-site-heuristic'
  | 'different-site-heuristic'
  | 'missing-context';

export type AttributionBasis =
  | 'main-frame'
  | 'document-url'
  | 'initiator'
  | 'tab-url'
  | 'content-script'
  | 'legacy'
  | 'unknown';

export type DetectorMatchType =
  | 'catalog-exact-domain'
  | 'catalog-subdomain'
  | 'path-pattern'
  | 'url-heuristic'
  | 'dom-url-token'
  | 'api-threshold'
  | 'user-interaction'
  | 'internal'
  | 'legacy';

export interface TrackingEventContext {
  source: DetectionSource;
  pageUrl: string;
  pageDomain: string;
  resourceUrl?: string;
  resourceDomain?: string;
  initiator?: string;
  tabId?: number;
  frameId?: number;
  parentFrameId?: number;
  requestId?: string;
  requestType?: string;
  requestMethod?: string;
  party: PartyRelationship;
  partyBasis: PartyBasis;
  partyConfidence: DetectionConfidence;
  attributionBasis: AttributionBasis;
  attributionConfidence: DetectionConfidence;
}

export interface DetectorEvidence {
  id: string;
  matchType: DetectorMatchType;
  confidence: DetectionConfidence;
  rule?: string;
  evidence: string[];
}

export interface TrackingEvent {
  /** P1 events use schema version 2. Missing means a legacy pre-P1 event. */
  schemaVersion?: 1 | 2;
  id: string;
  timestamp: number;
  /**
   * Compatibility alias retained for existing consumers and exports.
   * Network/DOM events use the resource URL; in-page events use the page URL.
   */
  url: string;
  /**
   * Compatibility alias retained for existing consumers and exports.
   * Network/DOM events use the resource domain; in-page events use the page domain.
   */
  domain: string;
  trackerType: TrackerType;
  riskLevel: RiskLevel;
  description: string;
  context?: TrackingEventContext;
  detector?: DetectorEvidence;
  occurrences?: number;
  firstSeenAt?: number;
  lastSeenAt?: number;
  privacyScore?: number;
  inPageTracking?: {
    method: InPageTrackingMethod;
    details: string;
    apiCalls?: string[];
    frequency?: number;
  };
}

export interface TrackerInfo {
  domain: string;
  name: string;
  category: TrackerCategory;
  description: string;
  riskLevel: RiskLevel;
}

export interface TrackerMatch {
  tracker: TrackerInfo;
  detectorId: string;
  matchType: DetectorMatchType;
  rule: string;
  confidence: DetectionConfidence;
  evidence: string[];
}

export interface AIAnalysis {
  narrative: string;
  riskAssessment: RiskLevel;
  recommendations: string[];
  confidence: number;
}

export type TrackerType =
  | 'advertising'
  | 'analytics'
  | 'social'
  | 'fingerprinting'
  | 'cryptomining'
  | 'unknown';

export type TrackerCategory =
  | 'Advertising'
  | 'Analytics'
  | 'Social Media'
  | 'Fingerprinting'
  | 'Cryptomining'
  | 'CDN'
  | 'Unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type InPageTrackingMethod =
  | 'canvas-fingerprint'
  | 'storage-access'
  | 'mouse-tracking'
  | 'form-monitoring'
  | 'device-api'
  | 'clipboard-access'
  | 'webrtc-leak'
  | 'font-fingerprint'
  | 'audio-fingerprint'
  | 'webgl-fingerprint'
  | 'battery-api'
  | 'sensor-api';

export interface ExtensionSettings {
  openRouterApiKey?: string;
  enableAI: boolean;
  enableNotifications: boolean;
  riskThreshold: RiskLevel;
  aiModel?: string;
  notifications?: NotificationSettings;
  enablePrivacyPredictions?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  criticalOnly: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  quietHours: { start: string; end: string };
}

export interface PrivacyScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'yellow' | 'orange' | 'red';
  breakdown: {
    totalTrackers: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    criticalRisk: number;
    httpsBonus: boolean;
    excessiveTrackingPenalty: boolean;
  };
  recommendations: string[];
}

export interface UserTrustedSite {
  domain: string;
  addedAt: number;
  reason?: string;
  allowedMethods?: InPageTrackingMethod[];
  temporary?: boolean;
}

export interface SecurityContext {
  isLoginPage: boolean;
  isBankingPage: boolean;
  isPaymentPage: boolean;
  hasPasswordField: boolean;
  hasAuthKeywords: boolean;
  confidence: 'low' | 'medium' | 'high';
}

export interface TrendData {
  date: string;
  privacyScore: number;
  trackingEvents: number;
  riskDistribution: Record<RiskLevel, number>;
  topTrackers: string[];
}

export interface DailySnapshot {
  date: string;
  privacyScore: number;
  eventCounts: {
    total: number;
    byRisk: Record<RiskLevel, number>;
    byType: Record<TrackerType, number>;
  };
  topDomains: Array<{ domain: string; count: number }>;
}

export interface WeeklyReport {
  weekStart: string;
  averageScore: number;
  scoreChange: number;
  newTrackers: string[];
  improvedSites: string[];
  riskySites: string[];
}

export interface Anomaly {
  date: string;
  type: 'score_drop' | 'tracking_spike' | 'new_tracker';
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: number;
  baseline: number;
}

export interface ComparisonData {
  categoryComparison: {
    percentile: number;
    betterThanAverage: boolean;
    insight: string;
  };
  userComparison?: {
    percentile: number;
    betterThanUsual: boolean;
    insight: string;
  };
  trustLevel: 'high' | 'medium' | 'low';
}

// P2P Privacy Sharing Types
export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  region?: string;
  lastSeen: number;
  isActive: boolean;
}

export interface NetworkMessage {
  type: 'privacy_data' | 'stats_request' | 'peer_discovery';
  data: AnonymousPrivacyData | CommunityStats;
  timestamp: number;
  sender: string;
}

export interface AnonymousPrivacyData {
  privacyScore: number;
  grade: string;
  trackerCount: number;
  riskDistribution: Record<RiskLevel, number>;
  websiteCategories: string[];
  timestamp: number;
  region?: string;
}

export interface CommunityStats {
  connectedPeers: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  regionalData: Record<string, RegionalStats>;
  lastUpdated: number;
  dataFreshness: number;
}

export interface RegionalStats {
  averageScore: number;
  peerCount: number;
  topTrackers: string[];
  riskDistribution: Record<RiskLevel, number>;
}

export interface CommunityComparison {
  userScore: number;
  networkAverage: number;
  percentile: number;
  betterThan: number;
  recommendations: P2PRecommendation[];
}

export interface P2PRecommendation {
  type: 'tool' | 'setting' | 'behavior';
  title: string;
  description: string;
  adoptionRate: number;
  impact: 'low' | 'medium' | 'high';
}

export interface P2PSettings {
  joinPrivacyNetwork: boolean;
  shareAnonymousData: boolean;
  shareRegionalData: boolean;
  maxConnections: number;
  autoReconnect: boolean;
}

export interface PrivacyData {
  averageScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trackerCount: number;
  events?: TrackingEvent[];
}
