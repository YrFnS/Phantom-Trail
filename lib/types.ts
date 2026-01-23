/**
 * Core types for Phantom Trail extension
 */

export interface TrackingEvent {
  id: string;
  timestamp: number;
  url: string;
  domain: string;
  trackerType: TrackerType;
  riskLevel: RiskLevel;
  description: string;
  privacyScore?: number; // Optional privacy score for the event
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
  temporary?: boolean; // Session-only whitelist
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
  privacyScore: number; // Rounded to nearest 5
  grade: string;
  trackerCount: number; // Capped at 50
  riskDistribution: Record<RiskLevel, number>;
  websiteCategories: string[]; // Top 5 only
  timestamp: number; // Rounded to nearest hour
  region?: string; // Optional broad region
}

export interface CommunityStats {
  connectedPeers: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  regionalData: Record<string, RegionalStats>;
  lastUpdated: number;
  dataFreshness: number; // How recent the data is
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
  percentile: number; // Based on connected peers
  betterThan: number; // Percentage of connected users
  recommendations: P2PRecommendation[];
}

export interface P2PRecommendation {
  type: 'tool' | 'setting' | 'behavior';
  title: string;
  description: string;
  adoptionRate: number; // Percentage of high-scoring peers using this
  impact: 'low' | 'medium' | 'high';
}

export interface P2PSettings {
  joinPrivacyNetwork: boolean;
  shareAnonymousData: boolean;
  shareRegionalData: boolean;
  maxConnections: number; // 1-20 peers
  autoReconnect: boolean;
}

export interface PrivacyData {
  averageScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trackerCount: number;
  events?: TrackingEvent[];
}
