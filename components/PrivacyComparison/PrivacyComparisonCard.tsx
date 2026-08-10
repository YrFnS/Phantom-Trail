import { useState, useEffect, useCallback } from 'react';
import { PrivacyComparison } from '../../lib/privacy-comparison';
import type { ComparisonInsights } from '../../lib/privacy-comparison';

interface PrivacyComparisonCardProps {
  domain: string;
  className?: string;
}

export function PrivacyComparisonCard({
  domain,
  className = '',
}: PrivacyComparisonCardProps) {
  const [insights, setInsights] = useState<ComparisonInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setInsights(await PrivacyComparison.generateComparisonInsights(domain));
    } catch (loadError) {
      console.error('Failed to load comparison disclosure:', loadError);
      setError('Comparison disclosure unavailable');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (domain) void loadComparison();
  }, [domain, loadComparison]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-3" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <p className="text-sm">{error || 'Comparison data unavailable'}</p>
        </div>
      </div>
    );
  }

  const { categoryComparison, userComparison, overallInsight, recommendations } =
    insights;
  const current = categoryComparison.currentSite;
  const localAverage = userComparison.userAverage;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">
          Comparison Disclosure
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-yellow-400">
          Rankings unavailable
        </span>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
        <p className="text-xs text-gray-300 leading-relaxed">
          {overallInsight}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-700/50 rounded p-3">
          <div className="text-gray-400 mb-1">Current page</div>
          <div className="text-gray-100 font-medium">
            {current.privacyScore ?? 'N/A'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {current.scoreStatus === 'estimated'
              ? `${current.scoreConfidence} coverage confidence`
              : 'insufficient score-qualified evidence'}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded p-3">
          <div className="text-gray-400 mb-1">Local estimated-page average</div>
          <div className="text-gray-100 font-medium">
            {localAverage.privacyScore ?? 'N/A'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {localAverage.totalEstimatedSites} estimated page
            {localAverage.totalEstimatedSites === 1 ? '' : 's'}; no percentile
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-700 pt-3">
        <div>
          <div className="text-xs text-gray-300 font-medium">
            Category label: {current.category}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {categoryComparison.insight}
          </p>
        </div>
        <div>
          <div className="text-xs text-gray-300 font-medium">
            Local history context
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {userComparison.insight}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="bg-gray-700/40 rounded p-2">
          <div className="text-sm text-gray-100 font-semibold">
            {current.evidenceUnits}
          </div>
          <div className="text-gray-500">Evidence units</div>
        </div>
        <div className="bg-gray-700/40 rounded p-2">
          <div className="text-sm text-gray-100 font-semibold">
            {current.occurrenceCount}
          </div>
          <div className="text-gray-500">Occurrences</div>
        </div>
        <div className="bg-gray-700/40 rounded p-2">
          <div className="text-sm text-gray-100 font-semibold">N/A</div>
          <div className="text-gray-500">Trust label</div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">
            Evidence review notes
          </h4>
          <div className="space-y-1">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <div
                key={`${recommendation}-${index}`}
                className="flex items-start gap-2"
              >
                <div className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
