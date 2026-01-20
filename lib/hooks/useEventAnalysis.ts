import { useState, useEffect } from 'react';
import { isTrustedSite } from '../../lib/trusted-sites';
import type { TrackingEvent } from '../../lib/types';
import type { EventAnalysis } from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Hook for analyzing individual tracking events
 */
export function useEventAnalysis(event: TrackingEvent | null) {
  const [analysis, setAnalysis] = useState<EventAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) {
      setAnalysis(null);
      return;
    }

    setLoading(true);

    const analyzeEvent = async () => {
      try {
        // Check if site is trusted
        const trusted = await isTrustedSite(event.url);
        
        // Basic risk assessment
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const riskFactors: string[] = [];

        // Analyze tracker type
        if (event.trackerType === 'fingerprinting') {
          riskLevel = 'high';
          riskFactors.push('Device fingerprinting detected');
        }
        
        if (event.trackerType === 'analytics') {
          riskLevel = 'medium';
          riskFactors.push('Personal data collection');
        }

        // Check for sensitive contexts
        if (event.url.includes('bank') || event.url.includes('payment')) {
          riskLevel = 'critical';
          riskFactors.push('Financial site tracking');
        }

        // Trust adjustment
        if (trusted && riskLevel !== 'critical') {
          riskLevel = riskLevel === 'high' ? 'medium' : 'low';
          riskFactors.push('Site is user-trusted');
        }

        const eventAnalysis: EventAnalysis = {
          eventId: event.id,
          narrative: `Risk level: ${riskLevel}`,
          riskAssessment: riskLevel,
          recommendations: generateRecommendations(riskLevel, riskFactors),
          confidence: 0.8,
          timestamp: Date.now(),
        };

        setAnalysis(eventAnalysis);
      } catch (error) {
        console.error('Failed to analyze event:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    analyzeEvent();
  }, [event]);

  return { analysis, loading };
}

function generateRecommendations(
  riskLevel: string, 
  riskFactors: string[]
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'critical') {
    recommendations.push('Consider using a VPN on financial sites');
    recommendations.push('Enable strict privacy settings');
  } else if (riskLevel === 'high') {
    recommendations.push('Install uBlock Origin to block trackers');
    recommendations.push('Consider using Firefox with strict privacy');
  } else if (riskLevel === 'medium') {
    recommendations.push('Review site privacy policy');
  }

  if (riskFactors.includes('Device fingerprinting detected')) {
    recommendations.push('Use Firefox with resistFingerprinting enabled');
  }

  return recommendations;
}
