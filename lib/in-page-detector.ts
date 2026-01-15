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
  private static readonly STORAGE_ACCESS_THRESHOLD = 10; // 10+ operations per minute
  private static readonly MOUSE_TRACKING_THRESHOLD = 50; // 50+ events per second

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

  /**
   * Analyze storage access patterns
   */
  static analyzeStorageAccess(
    operations: Array<{ type: string; key: string; timestamp: number }>
  ): DetectionResult {
    const recentOps = operations.filter(
      op => Date.now() - op.timestamp < 60000 // Last minute
    );

    const detected = recentOps.length >= this.STORAGE_ACCESS_THRESHOLD;
    const uniqueKeys = new Set(recentOps.map(op => op.key)).size;

    return {
      detected,
      method: 'storage-access',
      description: detected
        ? `Excessive storage access detected - ${uniqueKeys} unique keys accessed`
        : 'Normal storage usage',
      riskLevel: detected ? 'medium' : 'low',
      details: `${recentOps.length} storage operations in last minute`,
      apiCalls: recentOps.map(op => `${op.type}(${op.key})`),
      frequency: recentOps.length,
    };
  }

  /**
   * Analyze mouse tracking patterns
   */
  static analyzeMouseTracking(eventCount: number, duration: number): DetectionResult {
    const eventsPerSecond = (eventCount / duration) * 1000;
    const detected = eventsPerSecond >= this.MOUSE_TRACKING_THRESHOLD;

    return {
      detected,
      method: 'mouse-tracking',
      description: detected
        ? 'Intensive mouse tracking detected - recording your movements'
        : 'Normal mouse event handling',
      riskLevel: detected ? 'medium' : 'low',
      details: `${Math.round(eventsPerSecond)} mouse events per second`,
      frequency: eventCount,
    };
  }
}
