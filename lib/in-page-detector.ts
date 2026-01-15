import type { InPageTrackingMethod, RiskLevel } from './types';

export interface DetectionResult {
  detected: boolean;
  method: InPageTrackingMethod;
  description: string;
  riskLevel: RiskLevel;
  details: string;
  apiCalls?: string[];
  frequency?: number;
}

export class InPageDetector {
  private static readonly CANVAS_FINGERPRINT_THRESHOLD = 3;

  /**
   * Analyze canvas operations for fingerprinting patterns
   */
  static analyzeCanvasFingerprint(operations: string[]): DetectionResult {
    const suspiciousPatterns = [
      'getContext',
      'toDataURL',
      'getImageData',
      'fillText',
      'measureText',
    ];

    const matchedOperations = operations.filter(op =>
      suspiciousPatterns.some(pattern => op.includes(pattern))
    );

    const detected =
      matchedOperations.length >= this.CANVAS_FINGERPRINT_THRESHOLD;

    return {
      detected,
      method: 'canvas-fingerprint',
      description: detected
        ? 'Canvas fingerprinting detected - generating unique browser signature'
        : 'Normal canvas usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${matchedOperations.length} suspicious canvas operations detected`,
      apiCalls: matchedOperations,
      frequency: matchedOperations.length,
    };
  }
}
