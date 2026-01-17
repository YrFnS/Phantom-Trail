import type { TrackerInfo } from '../types';

/**
 * Advertising trackers database
 */
export const ADVERTISING_TRACKERS: Record<string, TrackerInfo> = {
  'doubleclick.net': {
    domain: 'doubleclick.net',
    name: 'DoubleClick',
    category: 'Advertising',
    description: 'Google advertising network',
    riskLevel: 'medium',
  },
  'amazon-adsystem.com': {
    domain: 'amazon-adsystem.com',
    name: 'Amazon DSP',
    category: 'Advertising',
    description: 'Amazon advertising platform',
    riskLevel: 'medium',
  },
  'googlesyndication.com': {
    domain: 'googlesyndication.com',
    name: 'Google AdSense',
    category: 'Advertising',
    description: 'Google advertising syndication network',
    riskLevel: 'medium',
  },
  'googleadservices.com': {
    domain: 'googleadservices.com',
    name: 'Google Ads',
    category: 'Advertising',
    description: 'Google advertising services and conversion tracking',
    riskLevel: 'medium',
  },
  'adsystem.com': {
    domain: 'adsystem.com',
    name: 'AdSystem',
    category: 'Advertising',
    description: 'Advertising network and tracking',
    riskLevel: 'medium',
  },
  'outbrain.com': {
    domain: 'outbrain.com',
    name: 'Outbrain',
    category: 'Advertising',
    description: 'Content recommendation and advertising',
    riskLevel: 'medium',
  },
  'taboola.com': {
    domain: 'taboola.com',
    name: 'Taboola',
    category: 'Advertising',
    description: 'Content discovery and advertising platform',
    riskLevel: 'medium',
  },
  'bing.com': {
    domain: 'bing.com',
    name: 'Microsoft Advertising',
    category: 'Advertising',
    description: 'Microsoft Bing Ads tracking',
    riskLevel: 'medium',
  },
  'yahoo.com': {
    domain: 'yahoo.com',
    name: 'Yahoo Advertising',
    category: 'Advertising',
    description: 'Yahoo advertising network',
    riskLevel: 'medium',
  },
  'criteo.com': {
    domain: 'criteo.com',
    name: 'Criteo',
    category: 'Advertising',
    description: 'Personalized retargeting advertising',
    riskLevel: 'high',
  },
  'media.net': {
    domain: 'media.net',
    name: 'Media.net',
    category: 'Advertising',
    description: 'Contextual advertising network',
    riskLevel: 'medium',
  },
  'pubmatic.com': {
    domain: 'pubmatic.com',
    name: 'PubMatic',
    category: 'Advertising',
    description: 'Programmatic advertising platform',
    riskLevel: 'medium',
  },
  'rubiconproject.com': {
    domain: 'rubiconproject.com',
    name: 'Rubicon Project',
    category: 'Advertising',
    description: 'Programmatic advertising exchange',
    riskLevel: 'medium',
  },
  'openx.com': {
    domain: 'openx.com',
    name: 'OpenX',
    category: 'Advertising',
    description: 'Programmatic advertising platform',
    riskLevel: 'medium',
  },
};
