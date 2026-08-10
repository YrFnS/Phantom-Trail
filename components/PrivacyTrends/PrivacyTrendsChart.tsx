import { useCallback, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { PrivacyTrends } from '../../lib/privacy-trends';
import type { TrendData, WeeklyReport, Anomaly } from '../../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface PrivacyTrendsChartProps {
  className?: string;
  days?: number;
}

export function PrivacyTrendsChart({
  className = '',
  days = 30,
}: PrivacyTrendsChartProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [deviations, setDeviations] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'score' | 'events'>('score');

  const loadTrendData = useCallback(async () => {
    try {
      setLoading(true);
      const [trends, report, detectedDeviations] = await Promise.all([
        PrivacyTrends.calculateDailyTrends(days),
        PrivacyTrends.getWeeklyReport(),
        PrivacyTrends.detectAnomalies(),
      ]);

      setTrendData(trends);
      setWeeklyReport(report);
      setDeviations(detectedDeviations);
    } catch (error) {
      console.error('Failed to load heuristic history:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadTrendData();
  }, [loadTrendData]);

  const scoreChartData = {
    labels: trendData.map(day => day.date),
    datasets: [
      {
        label: 'Heuristic score',
        data: trendData.map(day => day.privacyScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const eventsChartData = {
    labels: trendData.map(day => day.date),
    datasets: [
      {
        label: 'Recorded detector signals',
        data: trendData.map(day => day.trackingEvents),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false },
    scales: {
      x: {
        type: 'category' as const,
        title: { display: true, text: 'Date', color: '#9CA3AF' },
        ticks: { color: '#9CA3AF', maxTicksLimit: 7 },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      y: {
        beginAtZero: true,
        max: viewMode === 'score' ? 100 : undefined,
        title: {
          display: true,
          text:
            viewMode === 'score'
              ? 'Experimental heuristic'
              : 'Recorded signal count',
          color: '#9CA3AF',
        },
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
    },
    plugins: {
      legend: { labels: { color: '#9CA3AF' } },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: 'rgba(156, 163, 175, 0.2)',
        borderWidth: 1,
        callbacks: {
          afterBody: (context: { dataIndex: number }[]) => {
            const trend = trendData[context[0]?.dataIndex ?? -1];
            if (!trend) return [];

            return [
              `Top recorded domains: ${trend.topTrackers
                .slice(0, 3)
                .join(', ')}`,
              `High labels: ${trend.riskDistribution.high || 0}`,
              `Critical labels: ${trend.riskDistribution.critical || 0}`,
            ];
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">▥</div>
        <p className="text-gray-500 text-sm">
          No stored daily signal snapshots are available yet.
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Automatic snapshot generation remains incomplete in version 0.1.0.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="p-2 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        This chart visualizes stored prototype snapshots and rule-based scores.
        It does not measure real-world privacy improvement or website safety.
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-200">
          Heuristic Signal History
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('score')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'score'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Heuristic
          </button>
          <button
            onClick={() => setViewMode('events')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'events'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Signals
          </button>
        </div>
      </div>

      <div className="h-64 bg-gray-800 rounded-lg p-4">
        {viewMode === 'score' ? (
          <Line data={scoreChartData} options={chartOptions} />
        ) : (
          <Bar data={eventsChartData} options={chartOptions} />
        )}
      </div>

      {weeklyReport && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-1">
            Prototype Weekly Aggregation
          </h4>
          <p className="text-[10px] text-gray-500 mb-3">
            Derived from stored heuristic snapshots, not an audited report.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Average heuristic:</span>
              <span className="ml-2 font-medium text-green-400">
                {weeklyReport.averageScore}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Recorded change:</span>
              <span className="ml-2 font-medium text-gray-200">
                {weeklyReport.scoreChange >= 0 ? '+' : ''}
                {weeklyReport.scoreChange}
              </span>
            </div>
            {weeklyReport.newTrackers.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-400">New recorded domains:</span>
                <span className="ml-2 text-yellow-400">
                  {weeklyReport.newTrackers.slice(0, 3).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {deviations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-1">
            Rule-Based Deviations
          </h4>
          <p className="text-[10px] text-gray-500 mb-3">
            Threshold matches are not verified incidents or anomalies.
          </p>
          <div className="space-y-2">
            {deviations.slice(0, 3).map((deviation, index) => (
              <div
                key={`${deviation.date}-${index}`}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    deviation.severity === 'high'
                      ? 'bg-red-500'
                      : deviation.severity === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                />
                <span className="text-gray-400">{deviation.date}:</span>
                <span className="text-gray-300">
                  {deviation.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
