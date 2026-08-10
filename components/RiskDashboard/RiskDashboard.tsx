import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { PrivacyTrendsChart } from '../PrivacyTrends';
import { PrivacyToolsStatus } from '../PrivacyToolsStatus';
import { cn } from '../../lib/utils/cn';
import { useRiskMetrics } from './RiskDashboard.hooks';
import { useStorage } from '../../lib/hooks/useStorage';
import type { RiskDashboardProps } from './RiskDashboard.types';
import type { EvidenceScoreColor, TrackingEvent } from '../../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function getScoreClass(color: EvidenceScoreColor): string {
  switch (color) {
    case 'green':
      return 'text-[var(--success)]';
    case 'yellow':
    case 'orange':
      return 'text-[var(--warning)]';
    case 'red':
      return 'text-[var(--error)]';
    case 'gray':
    default:
      return 'text-[var(--text-secondary)]';
  }
}

export function RiskDashboard({
  className,
  currentDomain,
}: RiskDashboardProps) {
  const { metrics, loading, error, recommendations } =
    useRiskMetrics(currentDomain);
  const [events] = useStorage<TrackingEvent[]>('phantom_trail_events', []);

  if (loading) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-gray-400">Loading dashboard...</span>
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-center text-red-400">
          <p>{error || 'Evidence dashboard is unavailable.'}</p>
        </div>
      </Card>
    );
  }

  const score = metrics.evidenceScore;
  const isEstimated = score.status === 'estimated' && score.score !== null;
  const occurrenceTotal = Object.values(metrics.riskDistribution).reduce(
    (total, count) => total + count,
    0
  );
  const riskColors = {
    low: 'rgb(16, 185, 129)',
    medium: 'rgb(245, 158, 11)',
    high: 'rgb(249, 115, 22)',
    critical: 'rgb(239, 68, 68)',
  };
  const riskDistributionData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        data: [
          metrics.riskDistribution.low,
          metrics.riskDistribution.medium,
          metrics.riskDistribution.high,
          metrics.riskDistribution.critical,
        ],
        backgroundColor: [
          riskColors.low,
          riskColors.medium,
          riskColors.high,
          riskColors.critical,
        ],
        borderWidth: 0,
      },
    ],
  };
  const trendData = {
    labels: metrics.riskTrend.map(point =>
      new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    ),
    datasets: [
      {
        label: 'Estimated evidence index',
        data: metrics.riskTrend.map(point => point.evidenceIndex),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        spanGaps: false,
      },
    ],
  };
  const numericTrendPoints = metrics.riskTrend.filter(
    point => point.evidenceIndex !== null
  ).length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Evidence Dashboard
        </h2>
        <Badge
          className={
            isEstimated
              ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'bg-gray-500/10 text-gray-400'
          }
        >
          {isEstimated ? `Band ${score.grade}` : 'N/A'}
        </Badge>
      </div>

      <div className="relative p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--accent-primary)]/30 shadow-[var(--shadow-lg)]">
        <div className="text-center">
          <div
            className={`text-4xl font-bold mb-1 ${getScoreClass(score.color)}`}
          >
            {score.score ?? 'N/A'}
          </div>
          <div className="text-xs text-gray-400">
            {isEstimated
              ? `Experimental evidence index • ${score.breakdown.evidenceUnits} evidence units • ${score.confidence} coverage confidence`
              : `Insufficient score-qualified evidence • ${metrics.totalRows} observed rows`}
          </div>
          <div className="text-[10px] text-[var(--warning)] mt-2">
            N/A is not favorable. Model bands are not verified privacy or safety
            ratings.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/50">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
            Observed severity labels
          </h3>
          <div className="h-32">
            {occurrenceTotal > 0 ? (
              <Doughnut
                data={riskDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-[10px] text-gray-500 px-2">
                No recorded occurrences in this scope
              </div>
            )}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/50">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
            Hourly evidence index
          </h3>
          <p className="text-[9px] text-gray-500 mb-1">
            {numericTrendPoints}/12 numeric buckets; N/A remains a gap
          </p>
          <div className="h-28">
            {numericTrendPoints > 0 ? (
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { display: false },
                      grid: { display: false },
                    },
                    x: {
                      ticks: { display: false },
                      grid: { display: false },
                    },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-[10px] text-gray-500 px-2">
                No hour contains score-qualified evidence
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="p-2 rounded bg-dark-800/50 border border-dark-600/50">
          <div className="text-sm font-bold text-gray-200">
            {metrics.totalRows}
          </div>
          <div className="text-gray-500">Stored rows</div>
        </div>
        <div className="p-2 rounded bg-dark-800/50 border border-dark-600/50">
          <div className="text-sm font-bold text-gray-200">
            {metrics.totalOccurrences}
          </div>
          <div className="text-gray-500">Occurrences</div>
        </div>
        <div className="p-2 rounded bg-dark-800/50 border border-dark-600/50">
          <div className="text-sm font-bold text-gray-200">
            {score.breakdown.excludedRows}
          </div>
          <div className="text-gray-500">Excluded rows</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase px-1">
          Top recorded resource domains
        </h3>
        {metrics.topTrackers.length > 0 ? (
          metrics.topTrackers.map(tracker => (
            <div
              key={tracker.domain}
              className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 border border-dark-600/50 hover:border-plasma/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {tracker.domain}
                </div>
                <div className="text-[10px] text-gray-400">
                  {tracker.count} recorded occurrence
                  {tracker.count === 1 ? '' : 's'} • {tracker.category}
                </div>
              </div>
              <Badge
                variant={tracker.riskLevel}
                className="text-[10px] px-1.5 py-0.5"
              >
                {tracker.riskLevel} label
              </Badge>
            </div>
          ))
        ) : (
          <div className="p-2 text-xs text-gray-500">
            No resource-domain labels are available in this scope.
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="p-2 rounded-lg bg-accent-cyan/5 border-l-2 border-accent-cyan">
          <h3 className="text-[10px] font-semibold text-accent-cyan uppercase mb-1">
            Evidence review notes
          </h3>
          <div className="space-y-1">
            {recommendations.map((recommendation, index) => (
              <div key={`${recommendation}-${index}`} className="flex items-start gap-1.5">
                <div className="w-1 h-1 bg-accent-cyan rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <PrivacyTrendsChart days={7} />
      </div>

      <div className="mt-4">
        <PrivacyToolsStatus events={events.slice(-50)} />
      </div>

      <div className="mt-4 p-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10">
        <h3 className="text-xs font-medium text-[var(--warning)] mb-1">
          Category ranking unavailable
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Existing category averages and percentiles are synthetic prototype
          values, not a documented benchmark. P2 does not calculate a better or
          worse privacy ranking from them.
        </p>
      </div>
    </div>
  );
}
