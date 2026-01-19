import { useState, useEffect, useCallback } from 'react';
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

export function PrivacyTrendsChart({ className = '', days = 30 }: PrivacyTrendsChartProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'score' | 'events'>('score');

  const loadTrendData = useCallback(async () => {
    try {
      setLoading(true);
      const [trends, report, detectedAnomalies] = await Promise.all([
        PrivacyTrends.calculateDailyTrends(days),
        PrivacyTrends.getWeeklyReport(),
        PrivacyTrends.detectAnomalies()
      ]);
      
      setTrendData(trends);
      setWeeklyReport(report);
      setAnomalies(detectedAnomalies);
    } catch (error) {
      console.error('Failed to load trend data:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  const scoreChartData = {
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Privacy Score',
        data: trendData.map(d => d.privacyScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const eventsChartData = {
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Tracking Events',
        data: trendData.map(d => d.trackingEvents),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: true,
          text: 'Date',
          color: '#9CA3AF',
        },
        ticks: {
          color: '#9CA3AF',
          maxTicksLimit: 7,
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y: {
        beginAtZero: true,
        max: viewMode === 'score' ? 100 : undefined,
        title: {
          display: true,
          text: viewMode === 'score' ? 'Privacy Score' : 'Events Count',
          color: '#9CA3AF',
        },
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: 'rgba(156, 163, 175, 0.2)',
        borderWidth: 1,
        callbacks: {
          afterBody: (context: { dataIndex: number }[]) => {
            const dataIndex = context[0].dataIndex;
            const trend = trendData[dataIndex];
            if (trend) {
              return [
                `Top Trackers: ${trend.topTrackers.slice(0, 3).join(', ')}`,
                `High Risk: ${trend.riskDistribution.high || 0}`,
                `Critical: ${trend.riskDistribution.critical || 0}`
              ];
            }
            return [];
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-2">📊</div>
        <p className="text-gray-500 text-sm">
          No trend data available yet. Check back after browsing for a few days.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Privacy Trends</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('score')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'score'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Score
          </button>
          <button
            onClick={() => setViewMode('events')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'events'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Events
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 bg-gray-800 rounded-lg p-4">
        {viewMode === 'score' ? (
          <Line data={scoreChartData} options={chartOptions} />
        ) : (
          <Bar data={eventsChartData} options={chartOptions} />
        )}
      </div>

      {/* Weekly Report */}
      {weeklyReport && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-3">Weekly Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Average Score:</span>
              <span className="ml-2 font-medium text-green-400">
                {weeklyReport.averageScore}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Change:</span>
              <span className={`ml-2 font-medium ${
                weeklyReport.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {weeklyReport.scoreChange >= 0 ? '+' : ''}{weeklyReport.scoreChange}
              </span>
            </div>
            {weeklyReport.newTrackers.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-400">New Trackers:</span>
                <span className="ml-2 text-yellow-400">
                  {weeklyReport.newTrackers.slice(0, 3).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-3">Recent Anomalies</h4>
          <div className="space-y-2">
            {anomalies.slice(0, 3).map((anomaly, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  anomaly.severity === 'high' ? 'bg-red-500' :
                  anomaly.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></span>
                <span className="text-gray-400">{anomaly.date}:</span>
                <span className="text-gray-300">{anomaly.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
