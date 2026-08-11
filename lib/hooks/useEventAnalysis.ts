import { useState, useEffect } from 'react';
import type { TrackingEvent } from '../../lib/types';
import type { EventAnalysis } from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Present the classification already recorded on an event.
 *
 * P0 deliberately avoids deriving a second risk value from tracker type or a
 * user's trusted-site preference. Those values previously contradicted the
 * event badge and made a heuristic classification look more authoritative.
 */
export function useEventAnalysis(event: TrackingEvent | null) {
  const [analysis, setAnalysis] = useState<EventAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) {
      setAnalysis(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const riskFactors: string[] = [];
    if (event.inPageTracking) {
      riskFactors.push(
        `In-page API signal: ${event.inPageTracking.method.replace(/-/g, ' ')}`
      );
    } else {
      riskFactors.push(`Recorded domain or URL-pattern match: ${event.domain}`);
    }

    const eventAnalysis: EventAnalysis = {
      eventId: event.id,
      narrative: `Recorded signal classification: ${event.riskLevel} (heuristic)`,
      riskAssessment: event.riskLevel,
      recommendations: generateRecommendations(event.riskLevel, riskFactors),
      confidence: 0.5,
      timestamp: Date.now(),
    };

    setAnalysis(eventAnalysis);
    setLoading(false);
  }, [event]);

  return { analysis, loading };
}

function generateRecommendations(
  riskLevel: TrackingEvent['riskLevel'],
  riskFactors: string[]
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'critical') {
    recommendations.push(
      'Review the recorded evidence before entering sensitive data'
    );
  } else if (riskLevel === 'high') {
    recommendations.push('Consider reviewing browser and site privacy controls');
  } else if (riskLevel === 'medium') {
    recommendations.push('Review the signal if it appears unexpected');
  }

  if (riskFactors.some(factor => factor.includes('fingerprint'))) {
    recommendations.push(
      'A fingerprinting-related API signal is not proof that a fingerprint was created or retained'
    );
  }

  return recommendations;
}
