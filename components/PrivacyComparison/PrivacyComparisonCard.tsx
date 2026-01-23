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
      const comparisonData =
        await PrivacyComparison.generateComparisonInsights(domain);
      setInsights(comparisonData);
    } catch (err) {
      console.error('Failed to load privacy comparison:', err);
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (domain) {
      loadComparison();
    }
  }, [domain, loadComparison]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-3"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <p className="text-sm">Comparison data unavailable</p>
        </div>
      </div>
    );
  }

  const {
    categoryComparison,
    userComparison,
    overallInsight,
    recommendations,
    trustLevel,
  } = insights;

  const getTrustColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'text-green-400';
    if (percentile >= 60) return 'text-yellow-400';
    if (percentile >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getComparisonIcon = (betterThan: boolean) => {
    return betterThan ? '📈' : '📉';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">
          Privacy Comparison
        </h3>
        <span className={`text-xs font-medium ${getTrustColor(trustLevel)}`}>
          {trustLevel.toUpperCase()} TRUST
        </span>
      </div>

      {/* Overall Insight */}
      <div className="bg-gray-700/50 rounded-lg p-3">
        <p className="text-xs text-gray-300 leading-relaxed">
          {overallInsight}
        </p>
      </div>

      {/* Category Comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            vs {categoryComparison.categoryAverage.category}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs">
              {getComparisonIcon(categoryComparison.betterThanAverage)}
            </span>
            <span
              className={`text-xs font-medium ${getPercentileColor(categoryComparison.percentile)}`}
            >
              {categoryComparison.percentile}th percentile
            </span>
          </div>
        </div>

        <div className="bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              categoryComparison.percentile >= 80
                ? 'bg-green-500'
                : categoryComparison.percentile >= 60
                  ? 'bg-yellow-500'
                  : categoryComparison.percentile >= 40
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${categoryComparison.percentile}%` }}
          ></div>
        </div>

        <p className="text-xs text-gray-400">{categoryComparison.insight}</p>
      </div>

      {/* User Comparison */}
      {userComparison && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">vs Your Average</span>
            <div className="flex items-center gap-1">
              <span className="text-xs">
                {getComparisonIcon(userComparison.betterThanUsual)}
              </span>
              <span
                className={`text-xs font-medium ${getPercentileColor(userComparison.percentile)}`}
              >
                {userComparison.percentile}th percentile
              </span>
            </div>
          </div>

          <div className="bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                userComparison.percentile >= 80
                  ? 'bg-green-500'
                  : userComparison.percentile >= 60
                    ? 'bg-yellow-500'
                    : userComparison.percentile >= 40
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${userComparison.percentile}%` }}
            ></div>
          </div>

          <p className="text-xs text-gray-400">{userComparison.insight}</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">
            Recommendations
          </h4>
          <div className="space-y-1">
            {recommendations.slice(0, 2).map((rec, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                <p className="text-xs text-gray-400 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      <div className="border-t border-gray-700 pt-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-400">Site Score:</span>
            <span className="ml-1 font-medium text-gray-200">
              {categoryComparison.currentSite.privacyScore}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Category Avg:</span>
            <span className="ml-1 font-medium text-gray-200">
              {categoryComparison.categoryAverage.privacyScore}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Trackers:</span>
            <span className="ml-1 font-medium text-gray-200">
              {categoryComparison.currentSite.trackerCount}
            </span>
          </div>
          {userComparison && (
            <div>
              <span className="text-gray-400">Your Avg:</span>
              <span className="ml-1 font-medium text-gray-200">
                {userComparison.userAverage.privacyScore}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
