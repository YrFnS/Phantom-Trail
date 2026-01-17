import type { TrackerInfo } from '../types';

/**
 * Social media trackers database
 */
export const SOCIAL_MEDIA_TRACKERS: Record<string, TrackerInfo> = {
  'facebook.com': {
    domain: 'facebook.com',
    name: 'Facebook Pixel',
    category: 'Social Media',
    description: 'Social media tracking and advertising',
    riskLevel: 'medium',
  },
  'analytics.tiktok.com': {
    domain: 'analytics.tiktok.com',
    name: 'TikTok Pixel',
    category: 'Social Media',
    description: 'TikTok advertising and analytics tracking',
    riskLevel: 'high',
  },
  'twitter.com': {
    domain: 'twitter.com',
    name: 'Twitter Analytics',
    category: 'Social Media',
    description: 'Twitter advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'linkedin.com': {
    domain: 'linkedin.com',
    name: 'LinkedIn Insight Tag',
    category: 'Social Media',
    description: 'LinkedIn advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'pinterest.com': {
    domain: 'pinterest.com',
    name: 'Pinterest Tag',
    category: 'Social Media',
    description: 'Pinterest advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'snapchat.com': {
    domain: 'snapchat.com',
    name: 'Snapchat Pixel',
    category: 'Social Media',
    description: 'Snapchat advertising and analytics tracking',
    riskLevel: 'high',
  },
  'reddit.com': {
    domain: 'reddit.com',
    name: 'Reddit Pixel',
    category: 'Social Media',
    description: 'Reddit advertising and conversion tracking',
    riskLevel: 'medium',
  },
  'youtube.com': {
    domain: 'youtube.com',
    name: 'YouTube Analytics',
    category: 'Social Media',
    description: 'YouTube video and advertising analytics',
    riskLevel: 'medium',
  },
  'instagram.com': {
    domain: 'instagram.com',
    name: 'Instagram Pixel',
    category: 'Social Media',
    description: 'Instagram advertising and analytics tracking',
    riskLevel: 'medium',
  },
  'whatsapp.com': {
    domain: 'whatsapp.com',
    name: 'WhatsApp Business',
    category: 'Social Media',
    description: 'WhatsApp business analytics and tracking',
    riskLevel: 'medium',
  },
};
