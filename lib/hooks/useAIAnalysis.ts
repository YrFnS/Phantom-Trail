import { useState, useEffect, useCallback } from 'react';
import { AIEngine } from '../../lib/ai-engine';
import type { TrackingEvent, AIAnalysis } from '../../lib/types';
import { AnalysisCache } from '../../components/LiveNarrative/LiveNarrative.cache';
import type { EventAnalysis } from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Hook for AI-powered analysis of tracking events
 */
export function useAIAnalysis(events: TrackingEvent[]) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async () => {
    if (events.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const recentEvents = events.slice(-5); // Last 5 events
      if (recentEvents.length === 0) return;

      const cached = await AnalysisCache.getCachedAnalysis(recentEvents[0]);

      if (cached) {
        setAnalysis(cached);
        setLoading(false);
        return;
      }

      // Generate new analysis
      const aiAnalysis = await AIEngine.analyzeEvents(recentEvents);

      if (aiAnalysis && recentEvents[0]) {
        // Create EventAnalysis from AIAnalysis
        const eventAnalysis: EventAnalysis = {
          ...aiAnalysis,
          eventId: recentEvents[0].id,
          timestamp: Date.now(),
        };

        // Cache the result
        await AnalysisCache.setCachedAnalysis(recentEvents[0], eventAnalysis);
        setAnalysis(aiAnalysis);
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [events]);

  const regenerate = useCallback(() => {
    generateAnalysis();
  }, [generateAnalysis]);

  useEffect(() => {
    // Debounce analysis generation
    const timeoutId = setTimeout(generateAnalysis, 1000);
    return () => clearTimeout(timeoutId);
  }, [generateAnalysis]);

  return {
    analysis,
    loading,
    error,
    regenerate,
  };
}
