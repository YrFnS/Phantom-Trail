import type { PrivacyScoreProps, PrivacyScoreBadgeProps } from './PrivacyScore.types';

/**
 * Privacy Score Badge Component
 */
export function PrivacyScoreBadge({ score, grade, color, size = 'md' }: PrivacyScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const colorClasses = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color]}`}>
      <span className="font-bold">{grade}</span>
      <span className="ml-1">{score}/100</span>
    </div>
  );
}

/**
 * Privacy Score Component with breakdown
 */
export function PrivacyScore({ score, trend, showBreakdown = false, className = '' }: PrivacyScoreProps) {
  const trendIcons = {
    improving: '↗️',
    declining: '↘️',
    stable: '→',
  };

  const trendColors = {
    improving: 'text-green-400',
    declining: 'text-red-400',
    stable: 'text-gray-400',
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Score Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PrivacyScoreBadge
            score={score.score}
            grade={score.grade}
            color={score.color}
            size="lg"
          />
          {trend && (
            <div className={`flex items-center text-sm ${trendColors[trend]}`}>
              <span className="mr-1">{trendIcons[trend]}</span>
              <span className="capitalize">{trend}</span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Summary */}
      <div className="text-sm text-gray-400">
        {score.breakdown.totalTrackers === 0 ? (
          <span className="text-green-400 font-medium">No trackers detected</span>
        ) : (
          <span>
            {score.breakdown.totalTrackers} tracker{score.breakdown.totalTrackers !== 1 ? 's' : ''} detected
            {score.breakdown.highRisk > 0 && (
              <span className="text-red-400 font-medium ml-1">
                ({score.breakdown.highRisk} high-risk)
              </span>
            )}
          </span>
        )}
      </div>

      {/* Detailed Breakdown */}
      {showBreakdown && score.breakdown.totalTrackers > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Breakdown
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-red-400 font-bold">
                {score.breakdown.highRisk > 0 ? score.breakdown.highRisk : '—'}
              </div>
              <div className="text-xs text-gray-500">High Risk</div>
            </div>
            <div className="text-center">
              <div className="text-orange-400 font-bold">
                {score.breakdown.mediumRisk > 0 ? score.breakdown.mediumRisk : '—'}
              </div>
              <div className="text-xs text-gray-500">Medium Risk</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 font-bold">
                {score.breakdown.lowRisk > 0 ? score.breakdown.lowRisk : '—'}
              </div>
              <div className="text-xs text-gray-500">Low Risk</div>
            </div>
          </div>

          {/* Bonuses and Penalties */}
          <div className="space-y-1 text-xs">
            {score.breakdown.httpsBonus && (
              <div className="flex items-center text-green-400">
                <span className="mr-1">✓</span>
                <span>HTTPS Secure (+5 points)</span>
              </div>
            )}
            {score.breakdown.excessiveTrackingPenalty && (
              <div className="flex items-center text-red-400">
                <span className="mr-1">⚠</span>
                <span>Excessive tracking (-20 points)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Recommendations
          </div>
          <ul className="space-y-1">
            {score.recommendations.map((recommendation, index) => (
              <li key={index} className="text-xs text-gray-400 flex items-start">
                <span className="mr-2 text-neon-cyan">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
