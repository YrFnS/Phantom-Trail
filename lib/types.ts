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
  topDomains: Array<{domain: string; count: number}>;
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
