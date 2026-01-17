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
  apiKey?: string;
  openRouterApiKey?: string;
  enableAI: boolean;
  enableNotifications: boolean;
  riskThreshold: RiskLevel;
  aiModel?: string;
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
