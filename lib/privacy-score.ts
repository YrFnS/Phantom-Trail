import type { TrackingEvent } from './types';

export interface PrivacyScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'yellow' | 'orange' | 'red';
  breakdown: {
    totalTrackers: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    httpsBonus: boolean;
    excessiveTrackingPenalty: boolean;
  };
  recommendations: string[];
}

/**
 * Calculate privacy score based on tracking events
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
    httpsBonus: isHttps,
    excessiveTrackingPenalty: events.length > 10,
  };

  // Deduct points per tracker type
  events.forEach(event => {
    switch (event.riskLevel) {
      case 'critical':
        score -= 25;
        breakdown.highRisk++;
        break;
      case 'high':
        score -= 15;
        breakdown.highRisk++;
        break;
      case 'medium':
        score -= 8;
        breakdown.mediumRisk++;
        break;
      case 'low':
        score -= 3;
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

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine grade and color
  const { grade, color } = getGradeAndColor(score);

  // Generate recommendations
  const recommendations = generateRecommendations(breakdown, score);

  return {
    score,
    grade,
    color,
    breakdown,
    recommendations,
  };
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
  score: number
): string[] {
  const recommendations: string[] = [];

  if (breakdown.highRisk > 0) {
    recommendations.push(`${breakdown.highRisk} high-risk trackers detected. Consider using an ad blocker.`);
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
