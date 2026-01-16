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

  /**
   * Analyze form field monitoring
   */
  static analyzeFormMonitoring(
    fields: Array<{ type: string; name: string; monitored: boolean }>
  ): DetectionResult {
    const monitoredFields = fields.filter(f => f.monitored);
    const hasPasswordField = monitoredFields.some(f => f.type === 'password');
    const detected = monitoredFields.length > 0;

    return {
      detected,
      method: 'form-monitoring',
      description: detected
        ? `Form field monitoring detected on ${monitoredFields.length} fields`
        : 'No form monitoring detected',
      riskLevel: hasPasswordField ? 'critical' : detected ? 'high' : 'low',
      details: hasPasswordField
        ? '⚠️ PASSWORD FIELD BEING MONITORED - Potential keylogging'
        : `${monitoredFields.length} form fields monitored`,
      apiCalls: monitoredFields.map(f => `${f.type}:${f.name}`),
      frequency: monitoredFields.length,
    };
  }

  /**
   * Analyze device API access
   */
  static analyzeDeviceAPI(apiCalls: string[]): DetectionResult {
    const suspiciousAPIs = [
      'navigator.getBattery',
      'navigator.geolocation',
      'navigator.mediaDevices',
      'navigator.clipboard',
      'screen.width',
      'screen.height',
      'navigator.hardwareConcurrency',
      'navigator.deviceMemory',
      'navigator.platform',
      'navigator.userAgent',
    ];

    const matchedAPIs = apiCalls.filter(call =>
      suspiciousAPIs.some(api => call.includes(api))
    );

    const detected = matchedAPIs.length >= 3; // 3+ device APIs = fingerprinting

    return {
      detected,
      method: 'device-api',
      description: detected
        ? 'Device fingerprinting detected - collecting hardware information'
        : 'Normal device API usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${matchedAPIs.length} device APIs accessed`,
      apiCalls: matchedAPIs,
      frequency: matchedAPIs.length,
    };
  }

  /**
   * Analyze WebRTC leak detection (CRITICAL)
   */
  static analyzeWebRTC(): DetectionResult {
    return {
      detected: true,
      method: 'webrtc-leak',
      description: 'WebRTC connection detected - may expose real IP address even through VPN',
      riskLevel: 'critical',
      details: 'WebRTC can leak your real IP address, bypassing VPN protection',
    };
  }

  /**
   * Analyze font fingerprinting
   */
  static analyzeFontFingerprint(fonts: string[], count: number): DetectionResult {
    const detected = count >= 20;
    return {
      detected,
      method: 'font-fingerprint',
      description: detected
        ? `Font fingerprinting detected - tested ${count} fonts to identify your system`
        : 'Normal font usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${count} font measurements detected`,
      apiCalls: fonts,
      frequency: count,
    };
  }

  /**
   * Analyze audio fingerprinting
   */
  static analyzeAudioFingerprint(operations: string[]): DetectionResult {
    const detected = operations.length >= 2;
    return {
      detected,
      method: 'audio-fingerprint',
      description: detected
        ? 'Audio fingerprinting detected - using AudioContext to generate unique device signature'
        : 'Normal audio usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${operations.length} audio operations detected`,
      apiCalls: operations,
      frequency: operations.length,
    };
  }

  /**
   * Analyze WebGL fingerprinting
   */
  static analyzeWebGLFingerprint(parameters: number[]): DetectionResult {
    const detected = parameters.length >= 5;
    return {
      detected,
      method: 'webgl-fingerprint',
      description: detected
        ? 'WebGL fingerprinting detected - collecting GPU and graphics driver information'
        : 'Normal WebGL usage',
      riskLevel: detected ? 'high' : 'low',
      details: `${parameters.length} WebGL parameters queried`,
      frequency: parameters.length,
    };
  }

  /**
   * Analyze Battery API access
   */
  static analyzeBatteryAPI(): DetectionResult {
    return {
      detected: true,
      method: 'battery-api',
      description: 'Battery API accessed - can be used for device fingerprinting',
      riskLevel: 'medium',
      details: 'Battery status can uniquely identify devices',
    };
  }

  /**
   * Analyze Sensor API access
   */
  static analyzeSensorAPI(sensor: string): DetectionResult {
    return {
      detected: true,
      method: 'sensor-api',
      description: `Sensor API accessed (${sensor}) - can be used for fingerprinting`,
      riskLevel: 'medium',
      details: `Device motion/orientation sensors accessed: ${sensor}`,
    };
  }
}
