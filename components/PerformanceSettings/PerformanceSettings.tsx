import { useState, useEffect } from 'react';
import { PerformanceMonitor, type PerformanceReport, type PerformanceMode } from '../../lib/performance-monitor';
import { Card, CardHeader, CardContent } from '../ui';

interface PerformanceSettingsProps {
  className?: string;
}

export function PerformanceSettings({ className = '' }: PerformanceSettingsProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [mode, setMode] = useState<PerformanceMode>('balanced');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        const monitor = PerformanceMonitor.getInstance();
        const performanceReport = await monitor.generatePerformanceReport();
        setReport(performanceReport);
        
        // Load saved performance mode
        const savedMode = await chrome.storage.local.get(['performanceMode']);
        if (savedMode.performanceMode) {
          setMode(savedMode.performanceMode);
        }
      } catch (error) {
        console.error('Failed to load performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (newMode: PerformanceMode) => {
    setMode(newMode);
    await chrome.storage.local.set({ performanceMode: newMode });
    
    // Apply optimizations based on mode
    const monitor = PerformanceMonitor.getInstance();
    await monitor.optimizeForDevice();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-400';
      case 'B': return 'text-yellow-400';
      case 'C': return 'text-orange-400';
      case 'D':
      case 'F': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-plasma"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Performance Score */}
      {report && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-terminal">Performance Score</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${getGradeColor(report.grade)}`}>
                  {report.grade}
                </div>
                <div>
                  <div className="text-lg font-semibold text-terminal">{report.score}/100</div>
                  <div className="text-xs text-gray-400">Overall Performance</div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-2 bg-hud/30 rounded">
                <div className="text-sm font-semibold text-terminal">
                  {report.metrics.cpu.averageUsage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">CPU Usage</div>
              </div>
              <div className="text-center p-2 bg-hud/30 rounded">
                <div className="text-sm font-semibold text-terminal">
                  {formatBytes(report.metrics.memory.totalUsage)}
                </div>
                <div className="text-xs text-gray-400">Memory</div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                Recommendations
              </h4>
              {report.recommendations.map((rec, index) => (
                <div key={index} className="text-xs text-gray-400 p-2 bg-hud/20 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Mode */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-terminal">Performance Mode</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(['high', 'balanced', 'battery'] as PerformanceMode[]).map((modeOption) => (
              <label key={modeOption} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="performanceMode"
                  value={modeOption}
                  checked={mode === modeOption}
                  onChange={() => handleModeChange(modeOption)}
                  className="w-4 h-4 text-plasma bg-transparent border-gray-600 focus:ring-plasma focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-terminal capitalize">
                    {modeOption} Performance
                  </div>
                  <div className="text-xs text-gray-400">
                    {modeOption === 'high' && 'Maximum features, higher resource usage'}
                    {modeOption === 'balanced' && 'Good balance of features and performance'}
                    {modeOption === 'battery' && 'Reduced features, minimal resource usage'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-terminal">Advanced Settings</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-terminal">Virtual Scrolling</div>
                <div className="text-xs text-gray-400">Optimize large lists</div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-plasma bg-transparent border-gray-600 rounded focus:ring-plasma focus:ring-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-terminal">Memory Cleanup</div>
                <div className="text-xs text-gray-400">Automatic cache management</div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-plasma bg-transparent border-gray-600 rounded focus:ring-plasma focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-terminal">Background Optimization</div>
                <div className="text-xs text-gray-400">Reduce CPU usage when idle</div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-plasma bg-transparent border-gray-600 rounded focus:ring-plasma focus:ring-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
