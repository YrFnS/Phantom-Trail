import { useCallback, useEffect, useState } from 'react';
import { aiEngine } from '../../lib/ai-engine';
import { SettingsStorage } from '../../lib/storage/settings-storage';
import type { TrackingEvent, AIAnalysis } from '../../lib/types';
import { AnalysisCache } from '../../components/LiveNarrative/LiveNarrative.cache';
import type { EventAnalysis } from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Generate an optional OpenRouter summary only when the user explicitly enables
 * AI analysis. Recorded detector events remain available without this feature.
 */
export function useAIAnalysis(events: TrackingEvent[]) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async () => {
    if (events.length === 0) {
      setAnalysis(null);
      setError(null);
      return;
    }

    const settings = await SettingsStorage.getSettings();
    if (!settings.enableAI || !settings.openRouterApiKey) {
      setAnalysis(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recentEvents = events.slice(-5);
      const firstEvent = recentEvents[0];
      if (!firstEvent) return;

      const cached = await AnalysisCache.getCachedAnalysis(firstEvent);
      if (cached) {
        setAnalysis(cached);
        return;
      }

      const aiAnalysis = await aiEngine.analyzeEvents(recentEvents);
      if (!aiAnalysis) return;

      const eventAnalysis: EventAnalysis = {
        ...aiAnalysis,
        eventId: firstEvent.id,
        timestamp: Date.now(),
      };

      await AnalysisCache.setCachedAnalysis(firstEvent, eventAnalysis);
      setAnalysis(aiAnalysis);
    } catch (caughtError) {
      console.error('Optional AI summary failed:', caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Optional analysis failed'
      );
    } finally {
      setLoading(false);
    }
  }, [events]);

  const regenerate = useCallback(() => {
    void generateAnalysis();
  }, [generateAnalysis]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void generateAnalysis();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [generateAnalysis]);

  return {
    analysis,
    loading,
    error,
    regenerate,
  };
}
