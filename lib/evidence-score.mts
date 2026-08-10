import type { PrivacyScore, TrackingEvent } from './types.ts';

export interface EvidenceScoreOptions {
  scope?: 'dataset' | 'page';
  pageDomain?: string;
}

export function calculateEvidenceScore(
  _events: TrackingEvent[],
  _options: EvidenceScoreOptions = {}
): PrivacyScore {
  throw new Error('Evidence scoring engine is not initialized');
}
