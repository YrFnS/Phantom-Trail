import type { TrackingEvent } from './types';
import { TrustedSitesManager } from './trusted-sites-manager';

export interface PrivacyScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'yellow' | 'orange' | 'red';
  breakdown: {
    totalTrackers: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    criticalRisk: number;
    httpsBonus: boolean;
    excessiveTrackingPenalty: boolean;
    trustAdjustment?: {
      applied: boolean;
      domain: string;
      adjustment: number;
      reason: string;
    };
  };
  recommendations: string[];
}

/**
 * Calculate privacy score based on tracking events (synchronous version)
 */
export function calculatePrivacyScore(
  events: TrackingEvent[],
  isHttps: boolean = true
): PrivacyScore {
  let score = 100; // Start with perfect score
  
  // Count trackers by risk level
  const breakdown = {
    totalTrackers: events.length,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    criticalRisk: 0,
    httpsBonus: isHttps,
    excessiveTrackingPenalty: events.length > 10,
  };

  // Deduct points per tracker type (REBALANCED)
  events.forEach(event => {
    switch (event.riskLevel) {
      case 'critical':
        score -= 30; // Was 25
        breakdown.criticalRisk++;
        breakdown.highRisk++; // Critical counts as high-risk for display
        break;
      case 'high':
        score -= 18; // Was 15
        breakdown.highRisk++;
        break;
      case 'medium':
        score -= 10; // Was 8
        breakdown.mediumRisk++;
        break;
      case 'low':
        score -= 5; // Was 3
        breakdown.lowRisk++;
        break;
    }
  });

  // Bonus for HTTPS
  if (isHttps) {
    score += 5;
  }

  // Penalty for excessive tracking (10+ trackers)
  if (events.length > 10) {
    score -= 20;
  }

  // NEW: Cross-site tracking penalty (3+ unique tracker companies)
  const uniqueCompanies = new Set(
    events.map(e => extractCompany(e.domain))
  );
  if (uniqueCompanies.size >= 3) {
    score -= 15;
  }

  // NEW: Persistent tracking penalty (fingerprinting detected)
  const hasPersistentTracking = events.some(
    e => e.inPageTracking?.method && 
    ['canvas-fingerprint', 'font-fingerprint', 'audio-fingerprint', 
     'webgl-fingerprint', 'webrtc-leak'].includes(e.inPageTracking.method)
  );
  if (hasPersistentTracking) {
    score -= 20;
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine grade and color
  const { grade, color } = getGradeAndColor(score);

  // Generate recommendations
  const recommendations = generateRecommendations(
    breakdown, 
    score, 
    uniqueCompanies.size, 
    hasPersistentTracking
  );

  return {
    score,
    grade,
    color,
    breakdown,
    recommendations,
  };
}

/**
 * Calculate privacy score with trust adjustments (async version)
 */
export async function calculatePrivacyScoreWithTrust(
  events: TrackingEvent[],
  isHttps: boolean = true,
  domain?: string
): Promise<PrivacyScore> {
  // Start with base calculation
  const baseScore = calculatePrivacyScore(events, isHttps);
  
  // Apply trust adjustment if domain is provided
  if (domain) {
    const originalScore = baseScore.score;
    const adjustedScore = await TrustedSitesManager.adjustScoreForTrust(originalScore, domain);
    
    if (adjustedScore !== originalScore) {
      const trustedSite = await TrustedSitesManager.getTrustedSite(domain);
      const trustAdjustment = {
        applied: true,
        domain,
        adjustment: adjustedScore - originalScore,
        reason: trustedSite?.reason || 'Trusted site adjustment applied'
      };

      // Recalculate grade and color with adjusted score
      const { grade, color } = getGradeAndColor(adjustedScore);
      
      // Generate recommendations with trust context
      const recommendations = generateRecommendations(
        { ...baseScore.breakdown, trustAdjustment }, 
        adjustedScore, 
        new Set(events.map(e => extractCompany(e.domain))).size, 
        events.some(e => e.inPageTracking?.method && 
          ['canvas-fingerprint', 'font-fingerprint', 'audio-fingerprint', 
           'webgl-fingerprint', 'webrtc-leak'].includes(e.inPageTracking.method)),
        domain
      );

      return {
        ...baseScore,
        score: adjustedScore,
        grade,
        color,
        breakdown: { ...baseScore.breakdown, trustAdjustment },
        recommendations,
      };
    }
  }

  return baseScore;
}

/**
 * Calculate privacy score based on tracking events (synchronous version for backward compatibility)
 */
export function calculatePrivacyScoreSync(
  events: TrackingEvent[],
  isHttps: boolean = true
): PrivacyScore {
  return calculatePrivacyScore(events, isHttps);
}

/**
 * Extract company name from tracker domain
 */
function extractCompany(domain: string): string {
  // Remove common prefixes and get root domain
  const cleaned = domain.replace(/^(www\.|analytics\.|tracking\.|ads\.)/, '');
  const parts = cleaned.split('.');
  // Return second-level domain (e.g., "google" from "google.com")
  return parts.length >= 2 ? parts[parts.length - 2] : cleaned;
}

/**
 * Get letter grade and color based on score
 */
function getGradeAndColor(score: number): { grade: PrivacyScore['grade']; color: PrivacyScore['color'] } {
  if (score >= 90) return { grade: 'A', color: 'green' };
  if (score >= 80) return { grade: 'B', color: 'green' };
  if (score >= 70) return { grade: 'C', color: 'yellow' };
  if (score >= 60) return { grade: 'D', color: 'orange' };
  return { grade: 'F', color: 'red' };
}

/**
 * Generate privacy recommendations based on score breakdown
 */
function generateRecommendations(
  breakdown: PrivacyScore['breakdown'],
  score: number,
  crossSiteTrackers: number,
  hasPersistentTracking: boolean,
  domain?: string
): string[] {
  const recommendations: string[] = [];

  // Trust-related recommendations first
  if (breakdown.trustAdjustment?.applied) {
    if (breakdown.trustAdjustment.adjustment > 0) {
      recommendations.push(`✅ Score boosted for trusted site: ${breakdown.trustAdjustment.reason}`);
    }
  } else if (domain && score < 80) {
    recommendations.push(`Consider adding ${domain} to trusted sites if you use it regularly.`);
  }

  if (breakdown.criticalRisk > 0) {
    recommendations.push(`${breakdown.criticalRisk} critical-risk trackers detected. Immediate action recommended.`);
  }

  if (breakdown.highRisk > 0) {
    recommendations.push(`${breakdown.highRisk} high-risk trackers detected. Consider using an ad blocker.`);
  }

  if (crossSiteTrackers >= 3) {
    recommendations.push(`Cross-site tracking detected (${crossSiteTrackers} companies). Your data is being shared across multiple sites.`);
  }

  if (hasPersistentTracking) {
    recommendations.push('Persistent fingerprinting detected. This tracking works even in incognito mode.');
  }

  if (breakdown.excessiveTrackingPenalty) {
    recommendations.push('Excessive tracking detected. This site may be sharing data with many third parties.');
  }

  if (!breakdown.httpsBonus) {
    recommendations.push('Site is not using HTTPS. Your data may be transmitted insecurely.');
  }

  if (score < 60) {
    recommendations.push('Consider using privacy-focused browser extensions or switching to a more private browser.');
  }

  if (breakdown.totalTrackers === 0) {
    recommendations.push('Great! No trackers detected on this site.');
  }

  return recommendations;
}

/**
 * Compare two privacy scores to show trend
 */
export function getPrivacyTrend(
  currentScore: number,
  previousScore: number
): 'improving' | 'declining' | 'stable' {
  const difference = currentScore - previousScore;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}
