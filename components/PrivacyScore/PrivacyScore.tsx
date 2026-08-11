import type {
  PrivacyScoreProps,
  PrivacyScoreBadgeProps,
} from './PrivacyScore.types';

export function PrivacyScoreBadge({
  score,
  grade,
  color,
  confidence,
  size = 'md',
}: PrivacyScoreBadgeProps) {
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
    gray: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color]}`}
      title={
        score === null
          ? 'No score-qualified evidence is available'
          : `Experimental evidence index with ${confidence || 'unknown'} coverage confidence`
      }
    >
      <span className="font-bold">{grade}</span>
      <span className="ml-1">
        {score === null ? 'insufficient evidence' : `${score}/100`}
      </span>
    </div>
  );
}

export function PrivacyScore({
  score,
  trend,
  showBreakdown = false,
  className = '',
}: PrivacyScoreProps) {
  const trendIcons = {
    improving: '↗️',
    declining: '↘️',
    stable: '→',
    'insufficient-evidence': '—',
  };
  const trendColors = {
    improving: 'text-green-400',
    declining: 'text-red-400',
    stable: 'text-gray-400',
    'insufficient-evidence': 'text-gray-500',
  };
  const isEstimated = score.status === 'estimated' && score.score !== null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PrivacyScoreBadge
            score={score.score}
            grade={score.grade}
            color={score.color}
            confidence={score.confidence}
            size="lg"
          />
          {trend && (
            <div className={`flex items-center text-sm ${trendColors[trend]}`}>
              <span className="mr-1">{trendIcons[trend]}</span>
              <span className="capitalize">
                {trend === 'insufficient-evidence'
                  ? 'insufficient trend evidence'
                  : trend}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400">
        {isEstimated ? (
          <span>
            {score.breakdown.evidenceUnits} score-qualified evidence unit
            {score.breakdown.evidenceUnits === 1 ? '' : 's'} •{' '}
            {score.breakdown.uniqueThirdPartyParties} unique third-party
            resource domain
            {score.breakdown.uniqueThirdPartyParties === 1 ? '' : 's'} •{' '}
            <span className="font-medium text-[var(--accent-primary)]">
              {score.confidence} coverage confidence
            </span>
          </span>
        ) : (
          <span className="text-gray-300 font-medium">
            No numeric index: {score.breakdown.observedRows} observed row
            {score.breakdown.observedRows === 1 ? '' : 's'} produced no
            score-qualified evidence.
          </span>
        )}
      </div>

      {showBreakdown && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Evidence breakdown
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-[var(--accent-primary)] font-bold">
                {score.breakdown.evidenceUnits}
              </div>
              <div className="text-xs text-gray-500">Evidence units</div>
            </div>
            <div className="text-center">
              <div className="text-gray-200 font-bold">
                {score.breakdown.qualifyingRows}
              </div>
              <div className="text-xs text-gray-500">Qualifying rows</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 font-bold">
                {score.breakdown.excludedRows}
              </div>
              <div className="text-xs text-gray-500">Excluded rows</div>
            </div>
          </div>

          {isEstimated && (
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="text-center">
                <div className="text-red-400 font-bold">
                  {score.breakdown.criticalRisk || '—'}
                </div>
                <div className="text-[10px] text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-orange-400 font-bold">
                  {Math.max(
                    0,
                    score.breakdown.highRisk - score.breakdown.criticalRisk
                  ) || '—'}
                </div>
                <div className="text-[10px] text-gray-500">High</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-bold">
                  {score.breakdown.mediumRisk || '—'}
                </div>
                <div className="text-[10px] text-gray-500">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">
                  {score.breakdown.lowRisk || '—'}
                </div>
                <div className="text-[10px] text-gray-500">Low</div>
              </div>
            </div>
          )}

          <div className="rounded border border-gray-700/60 bg-gray-900/30 p-2 text-xs text-gray-400 space-y-1">
            <div>
              Applied evidence penalty: {score.breakdown.appliedPenalty}/100
            </div>
            <div>
              HTTPS bonus: none • global row-count penalty: none
            </div>
            <div>
              Repeated observations are bounded and grouped by party or API
              evidence unit.
            </div>
          </div>
        </div>
      )}

      {score.recommendations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wide">
            Evidence review notes
          </div>
          <ul className="space-y-1">
            {score.recommendations.map((recommendation, index) => (
              <li
                key={`${recommendation}-${index}`}
                className="text-xs text-gray-400 flex items-start"
              >
                <span className="mr-2 text-accent-teal">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
