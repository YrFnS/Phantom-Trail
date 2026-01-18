import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { ExportScheduler, ExportSchedule, ExportScheduleConfig, ExportHistoryEntry } from '../../lib/export-scheduler';
import { Button } from '../ui';

export function ExportScheduling() {
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [activeSchedules, exportHistory] = await Promise.all([
        ExportScheduler.getActiveSchedules(),
        ExportScheduler.getExportHistory()
      ]);
      setSchedules(activeSchedules);
      setHistory(exportHistory.slice(0, 10)); // Show last 10 entries
    } catch (error) {
      console.error('Failed to load export scheduling data:', error);
    }
  };

  const handleCreateSchedule = async (config: ExportScheduleConfig) => {
    setLoading(true);
    try {
      await ExportScheduler.scheduleExport(config);
      await loadData();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    setLoading(true);
    try {
      await ExportScheduler.cancelSchedule(scheduleId);
      await loadData();
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Export Scheduling</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Automatically export your privacy data on a regular schedule.
        </p>
      </div>

      {/* Active Schedules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Active Schedules</h4>
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            disabled={loading}
          >
            Create Schedule
          </Button>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-8 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <p className="text-[var(--text-secondary)]">No active schedules</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Create a schedule to automatically export your privacy data
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {schedule.config.frequency.charAt(0).toUpperCase() + schedule.config.frequency.slice(1)} Export
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        schedule.status === 'active' 
                          ? 'bg-[var(--success)]/20 text-[var(--success)]'
                          : schedule.status === 'error'
                          ? 'bg-[var(--error)]/20 text-[var(--error)]'
                          : 'bg-[var(--text-secondary)]/20 text-[var(--text-secondary)]'
                      }`}>
                        {schedule.status}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Format: {schedule.config.format.toUpperCase()} • 
                      Delivery: {schedule.config.deliveryMethod} • 
                      Data range: {schedule.config.dataRange} days
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">
                      Next: {new Date(schedule.nextExecution).toLocaleString()}
                      {schedule.lastExecution && (
                        <span> • Last: {new Date(schedule.lastExecution).toLocaleString()}</span>
                      )}
                    </div>
                    {schedule.errorMessage && (
                      <div className="text-xs text-[var(--error)] mt-1">
                        Error: {schedule.errorMessage}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleCancelSchedule(schedule.id)}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export History */}
      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Recent Exports</h4>
          <div className="space-y-2">
            {history.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
              >
                <div>
                  <div className="text-sm text-[var(--text-primary)]">
                    {new Date(entry.executionTime).toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {entry.deliveryMethod} • 
                    {entry.fileSize && ` ${Math.round(entry.fileSize / 1024)}KB`}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  entry.status === 'success'
                    ? 'bg-[var(--success)]/20 text-[var(--success)]'
                    : 'bg-[var(--error)]/20 text-[var(--error)]'
                }`}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Schedule Form */}
      {showCreateForm && (
        <CreateScheduleForm
          onSubmit={handleCreateSchedule}
          onCancel={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}
    </div>
  );
}

interface CreateScheduleFormProps {
  onSubmit: (config: ExportScheduleConfig) => void;
  onCancel: () => void;
  loading: boolean;
}

function CreateScheduleForm({ onSubmit, onCancel, loading }: CreateScheduleFormProps) {
  const [config, setConfig] = useState<ExportScheduleConfig>({
    frequency: 'weekly',
    format: 'csv',
    deliveryMethod: 'download',
    dataRange: 7,
    includeAnalysis: true
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Create Export Schedule</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Frequency
            </label>
            <select
              value={config.frequency}
              onChange={e => setConfig({ ...config, frequency: e.target.value as ExportScheduleConfig['frequency'] })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Format
            </label>
            <select
              value={config.format}
              onChange={e => setConfig({ ...config, format: e.target.value as ExportScheduleConfig['format'] })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="csv">CSV (Spreadsheet)</option>
              <option value="json">JSON (Developer)</option>
              <option value="pdf">PDF (Report)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Data Range (days)
            </label>
            <select
              value={config.dataRange}
              onChange={e => setConfig({ ...config, dataRange: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Delivery Method
            </label>
            <select
              value={config.deliveryMethod}
              onChange={e => setConfig({ ...config, deliveryMethod: e.target.value as ExportScheduleConfig['deliveryMethod'] })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="download">Auto Download</option>
              <option value="email" disabled>Email (Coming Soon)</option>
              <option value="cloud" disabled>Cloud Storage (Coming Soon)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeAnalysis"
              checked={config.includeAnalysis}
              onChange={e => setConfig({ ...config, includeAnalysis: e.target.checked })}
              className="mr-2 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            />
            <label htmlFor="includeAnalysis" className="text-sm text-[var(--text-primary)]">
              Include privacy analysis
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Schedule'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
