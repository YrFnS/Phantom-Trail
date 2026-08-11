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
import type { TrackingEvent } from '../../lib/types';

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

export function RiskDashboard({ className }: RiskDashboardProps) {
  const { metrics, loading, error, recommendations } = useRiskMetrics();
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

  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-center text-red-400">
          <p>Error loading dashboard: {error}</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-2 text-gray-600 opacity-30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <p>No recorded signals are available yet.</p>
          <p className="text-sm mt-2">
            Browse websites to collect experimental detector output.
          </p>
        </div>
      </Card>
    );
  }

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
        label: 'Heuristic risk score',
        data: metrics.riskTrend.map(point => point.riskScore),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
      },
    ],
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-red-500/20 text-red-400';
    if (score >= 60) return 'bg-orange-500/20 text-orange-400';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Experimental Dashboard
        </h2>
        <Badge className={getRiskBadgeColor(metrics.overallRiskScore)}>
          {getRiskLevel(metrics.overallRiskScore)} signal risk
        </Badge>
      </div>

      <div className="relative p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--accent-primary)]/30 shadow-[var(--shadow-lg)]">
        <div className="text-center">
          <div className="text-4xl font-bold text-[var(--accent-primary)] mb-1 drop-shadow-[0_0_10px_rgba(var(--accent-primary),0.8)]">
            {metrics.overallRiskScore}
          </div>
          <div className="text-xs text-gray-400">
            Heuristic signal score • {metrics.totalEvents} recorded events
          </div>
          <div className="text-[10px] text-[var(--warning)] mt-2">
            Not a verified website privacy rating
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/50">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
            Signal distribution
          </h3>
          <div className="h-32">
            <Doughnut
              data={riskDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>

        <div className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/50">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
            Heuristic trend
          </h3>
          <div className="h-32">
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
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase px-1">
          Top recorded domains
        </h3>
        {metrics.topTrackers.map(tracker => (
          <div
            key={tracker.domain}
            className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 border border-dark-600/50 hover:border-plasma/30 transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                {tracker.domain}
              </div>
              <div className="text-[10px] text-gray-400">
                {tracker.count} recorded events
              </div>
            </div>
            <Badge
              variant={tracker.riskLevel}
              className="text-[10px] px-1.5 py-0.5"
            >
              {tracker.riskLevel}
            </Badge>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="p-2 rounded-lg bg-accent-cyan/5 border-l-2 border-accent-cyan">
          <h3 className="text-[10px] font-semibold text-accent-cyan uppercase mb-1">
            Heuristic recommendations
          </h3>
          <div className="space-y-1">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-1.5">
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
          Category comparison disabled
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Existing category averages and percentiles are synthetic prototype
          values, not a documented industry dataset. They are hidden until a
          reproducible benchmark is available.
        </p>
      </div>
    </div>
  );
}
