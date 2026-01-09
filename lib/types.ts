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

export interface ExtensionSettings {
  apiKey?: string;
  enableAI: boolean;
  enableNotifications: boolean;
  riskThreshold: RiskLevel;
}