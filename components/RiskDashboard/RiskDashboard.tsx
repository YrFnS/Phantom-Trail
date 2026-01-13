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
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils/cn';
import { useRiskMetrics } from './RiskDashboard.hooks';
import type { RiskDashboardProps } from './RiskDashboard.types';

// Register Chart.js components
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

  if (loading) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="text-center text-red-600">
          <p>Error loading dashboard: {error}</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center text-gray-500">
          <p>No tracking data available yet.</p>
          <p className="text-sm mt-2">
            Browse some websites to see your privacy dashboard.
          </p>
        </div>
      </Card>
    );
  }

  const riskColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
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
        label: 'Risk Score',
        data: metrics.riskTrend.map(point => point.riskScore),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Risk Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Privacy Risk Score
            </h3>
            <Badge className={getRiskBadgeColor(metrics.overallRiskScore)}>
              {getRiskLevel(metrics.overallRiskScore)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-bold text-phantom-600">
              {metrics.overallRiskScore}/100
            </div>
            <div className="text-sm text-gray-600">
              Based on {metrics.totalEvents} tracking events
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution Chart */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Risk Distribution
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <Doughnut
              data={riskDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Risk Trend */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Risk Trend (Last 12 Hours)
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Trackers */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Top Trackers</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topTrackers.map(tracker => (
              <div
                key={tracker.domain}
                className="flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {tracker.domain}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {tracker.category}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {tracker.count} events
                  </span>
                  <Badge
                    className={`${riskColors[tracker.riskLevel]} text-white text-xs`}
                  >
                    {tracker.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Privacy Recommendations
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-phantom-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
