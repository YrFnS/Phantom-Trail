import type { TrackerInfo } from '../types';

/**
 * Cryptomining trackers database
 */
export const CRYPTOMINING_TRACKERS: Record<string, TrackerInfo> = {
  'coinhive.com': {
    domain: 'coinhive.com',
    name: 'CoinHive',
    category: 'Cryptomining',
    description: 'Browser-based cryptocurrency mining (defunct)',
    riskLevel: 'critical',
  },
  'jsecoin.com': {
    domain: 'jsecoin.com',
    name: 'JSEcoin',
    category: 'Cryptomining',
    description: 'JavaScript-based cryptocurrency mining',
    riskLevel: 'critical',
  },
  'mineralt.io': {
    domain: 'mineralt.io',
    name: 'MinerAlt',
    category: 'Cryptomining',
    description: 'Alternative cryptocurrency mining service',
    riskLevel: 'critical',
  },
  'crypto-loot.com': {
    domain: 'crypto-loot.com',
    name: 'Crypto-Loot',
    category: 'Cryptomining',
    description: 'Browser-based cryptocurrency mining',
    riskLevel: 'critical',
  },
};
