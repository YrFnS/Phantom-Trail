import type { TrackerInfo } from '../types';

/**
 * Fingerprinting trackers database
 */
export const FINGERPRINTING_TRACKERS: Record<string, TrackerInfo> = {
  'fingerprintjs.com': {
    domain: 'fingerprintjs.com',
    name: 'FingerprintJS',
    category: 'Fingerprinting',
    description: 'Browser fingerprinting and device identification',
    riskLevel: 'high',
  },
  'maxmind.com': {
    domain: 'maxmind.com',
    name: 'MaxMind',
    category: 'Fingerprinting',
    description: 'IP geolocation and device fingerprinting',
    riskLevel: 'high',
  },
  'trustpilot.com': {
    domain: 'trustpilot.com',
    name: 'Trustpilot',
    category: 'Fingerprinting',
    description: 'Review platform with tracking capabilities',
    riskLevel: 'medium',
  },
  'deviceatlas.com': {
    domain: 'deviceatlas.com',
    name: 'DeviceAtlas',
    category: 'Fingerprinting',
    description: 'Device detection and fingerprinting',
    riskLevel: 'high',
  },
  'browserstack.com': {
    domain: 'browserstack.com',
    name: 'BrowserStack',
    category: 'Fingerprinting',
    description: 'Browser and device fingerprinting for testing',
    riskLevel: 'medium',
  },
  'detectify.com': {
    domain: 'detectify.com',
    name: 'Detectify',
    category: 'Fingerprinting',
    description: 'Security scanning with fingerprinting',
    riskLevel: 'medium',
  },
};
