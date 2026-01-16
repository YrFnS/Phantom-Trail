/**
 * Trusted Sites Configuration
 * 
 * Hybrid system combining:
 * 1. Default whitelist (hardcoded trusted sites)
 * 2. User whitelist (user-added sites)
 * 3. Context detection (smart security context detection)
 */

import type { InPageTrackingMethod, UserTrustedSite, SecurityContext } from './types';
import { UserWhitelistManager } from './user-whitelist-manager';

/**
 * Check if target domain matches pattern (exact or subdomain)
 */
function matchesDomain(target: string, pattern: string): boolean {
  return target === pattern || target.endsWith(`.${pattern}`);
}

export interface TrustedSiteConfig {
  domain: string;
  reason: 'security' | 'authentication' | 'fraud-prevention';
  allowedMethods: InPageTrackingMethod[];
  description: string;
}

/**
 * List of trusted sites that use fingerprinting for security
 */
export const TRUSTED_SITES: TrustedSiteConfig[] = [
  // Authentication & Development Platforms
  {
    domain: 'github.com',
    reason: 'security',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Uses fingerprinting for account security and fraud prevention'
  },
  {
    domain: 'gitlab.com',
    reason: 'security',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Uses fingerprinting for account security'
  },
  
  // Financial Services
  {
    domain: 'paypal.com',
    reason: 'fraud-prevention',
    allowedMethods: ['device-api', 'canvas-fingerprint', 'mouse-tracking'],
    description: 'Uses fingerprinting to prevent fraudulent transactions'
  },
  {
    domain: 'stripe.com',
    reason: 'fraud-prevention',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Uses fingerprinting for payment security'
  },
  
  // Banking (add your banks here)
  {
    domain: 'chase.com',
    reason: 'fraud-prevention',
    allowedMethods: ['device-api', 'canvas-fingerprint', 'mouse-tracking'],
    description: 'Banking security measures'
  },
  {
    domain: 'bankofamerica.com',
    reason: 'fraud-prevention',
    allowedMethods: ['device-api', 'canvas-fingerprint', 'mouse-tracking'],
    description: 'Banking security measures'
  },
  
  // Cloud Services
  {
    domain: 'aws.amazon.com',
    reason: 'security',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'AWS console security'
  },
  {
    domain: 'console.cloud.google.com',
    reason: 'security',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Google Cloud console security'
  },
  {
    domain: 'portal.azure.com',
    reason: 'security',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Azure portal security'
  },
  
  // Enterprise Authentication
  {
    domain: 'login.microsoftonline.com',
    reason: 'authentication',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Microsoft authentication security'
  },
  {
    domain: 'accounts.google.com',
    reason: 'authentication',
    allowedMethods: ['device-api', 'canvas-fingerprint'],
    description: 'Google account security'
  },
];

/**
 * Check if a domain is trusted for fingerprinting
 */
export function isTrustedSite(domain: string): TrustedSiteConfig | null {
  // Exact match
  const exactMatch = TRUSTED_SITES.find(site => site.domain === domain);
  if (exactMatch) return exactMatch;
  
  // Subdomain match (e.g., api.github.com matches github.com)
  const subdomainMatch = TRUSTED_SITES.find(site => matchesDomain(domain, site.domain));
  
  return subdomainMatch || null;
}

/**
 * Check if a specific fingerprinting method is allowed for a domain
 */
export function isMethodAllowed(
  domain: string, 
  method: InPageTrackingMethod
): boolean {
  const trustedSite = isTrustedSite(domain);
  if (!trustedSite) return false;
  
  return trustedSite.allowedMethods.includes(method);
}

/**
 * Get security context for a domain
 */
export function getSecurityContext(domain: string): {
  isTrusted: boolean;
  reason?: string;
  description?: string;
} {
  const trustedSite = isTrustedSite(domain);
  
  if (!trustedSite) {
    return { isTrusted: false };
  }
  
  return {
    isTrusted: true,
    reason: trustedSite.reason,
    description: trustedSite.description
  };
}

/**
 * Main hybrid trust check - checks all three layers
 */
export async function isSiteTrusted(
  domain: string,
  method: InPageTrackingMethod,
  context?: SecurityContext
): Promise<{
  trusted: boolean;
  source: 'default' | 'user' | 'context';
  reason: string;
}> {
  // Layer 1: Check default whitelist
  const defaultTrusted = isDefaultTrusted(domain);
  if (defaultTrusted && defaultTrusted.allowedMethods.includes(method)) {
    return {
      trusted: true,
      source: 'default',
      reason: defaultTrusted.description,
    };
  }

  // Layer 2: Check user whitelist
  const userTrusted = await isUserTrusted(domain);
  if (userTrusted) {
    // If no specific methods defined, trust all methods
    if (!userTrusted.allowedMethods || userTrusted.allowedMethods.length === 0) {
      return {
        trusted: true,
        source: 'user',
        reason: userTrusted.reason || 'User-added trusted site',
      };
    }
    // Check if method is allowed
    if (userTrusted.allowedMethods.includes(method)) {
      return {
        trusted: true,
        source: 'user',
        reason: userTrusted.reason || 'User-added trusted site',
      };
    }
  }

  // Layer 3: Check context detection
  if (context && isContextTrusted(domain, method, context)) {
    return {
      trusted: true,
      source: 'context',
      reason: getContextReason(context),
    };
  }

  return {
    trusted: false,
    source: 'default',
    reason: 'Site not in trusted list',
  };
}

/**
 * Check default whitelist (Layer 1)
 */
export function isDefaultTrusted(domain: string): TrustedSiteConfig | null {
  return isTrustedSite(domain);
}

/**
 * Check user whitelist (Layer 2)
 */
export async function isUserTrusted(domain: string): Promise<UserTrustedSite | null> {
  return await UserWhitelistManager.isUserTrusted(domain);
}

/**
 * Check context detection (Layer 3)
 */
export function isContextTrusted(
  _domain: string,
  method: InPageTrackingMethod,
  context: SecurityContext
): boolean {
  // Only trust high-confidence security contexts
  if (context.confidence !== 'high') {
    return false;
  }

  // Login pages with device fingerprinting
  if (context.isLoginPage && (method === 'device-api' || method === 'canvas-fingerprint')) {
    return true;
  }

  // Banking sites with high confidence
  if (context.isBankingPage) {
    return true;
  }

  // Payment pages with device fingerprinting
  if (context.isPaymentPage && (method === 'device-api' || method === 'canvas-fingerprint')) {
    return true;
  }

  // Pages with password fields (likely auth)
  if (context.hasPasswordField && (method === 'device-api' || method === 'canvas-fingerprint')) {
    return true;
  }

  return false;
}

/**
 * Get human-readable reason for context trust
 */
function getContextReason(context: SecurityContext): string {
  if (context.isLoginPage) {
    return 'Login page detected - fingerprinting likely for security';
  }
  if (context.isBankingPage) {
    return 'Banking site detected - fingerprinting for fraud prevention';
  }
  if (context.isPaymentPage) {
    return 'Payment page detected - fingerprinting for transaction security';
  }
  if (context.hasPasswordField) {
    return 'Authentication page detected - fingerprinting for account security';
  }
  return 'Security context detected';
}
