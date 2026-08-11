import { useEffect, useState } from 'react';
import {
  ReportService,
  type ReportOverview,
} from '../../lib/report-service';
import { DATA_CLEARED_EVENT } from '../../lib/data-deletion';
import { Button } from '../ui';

export function ReportsDashboard() {
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [busy, setBusy] = useState<'daily' | 'weekly' | 'initial' | null>(
    'initial'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadOverview(true);
    const handleDataCleared = () => {
      setOverview(null);
      setError(null);
      void loadOverview(false);
    };
    window.addEventListener(DATA_CLEARED_EVENT, handleDataCleared);
    return () => window.removeEventListener(DATA_CLEARED_EVENT, handleDataCleared);
  }, []);

  const loadOverview = async (ensureCurrent: boolean) => {
    setBusy('initial');
    setError(null);
    try {
      setOverview(
        ensureCurrent
          ? await ReportService.ensureCurrentReports(new Date(), 'startup')
          : await ReportService.getOverview()
      );
    } catch (loadError) {
      console.error('Failed to load local reports:', loadError);
      setError('Local reports could not be loaded.');
    } finally {
      setBusy(null);
    }
  };

  const generateDaily = async () => {
    setBusy('daily');
    setError(null);
    try {
      await ReportService.captureDaily(new Date(), 'manual');
      setOverview(await ReportService.getOverview());
    } catch (generationError) {
      console.error('Failed to generate daily report:', generationError);
      setError('The daily local snapshot could not be generated.');
    } finally {
      setBusy(null);
    }
  };

  const generateWeekly = async () => {
    setBusy('weekly');
    setError(null);
    try {
      await ReportService.captureWeekly(new Date(), 'manual');
      setOverview(await ReportService.getOverview());
    } catch (generationError) {
      console.error('Failed to generate weekly report:', generationError);
      setError('The weekly local aggregation could not be generated.');
    } finally {
      setBusy(null);
    }
  };

  const daily = overview?.latestDaily;
  const weekly = overview?.latestWeekly;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Local Evidence Reports
        </h2>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">
          Reports are generated and stored only in this browser profile. Values
          summarize retained detector evidence and are not privacy, safety, or
          compliance measurements.
        </p>
      </div>

      {busy === 'initial' && !overview ? (
        <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
          Preparing current local reports…
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                  Daily snapshot
                </h3>
                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                  {daily?.date || 'No snapshot stored'}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void generateDaily()}
              >
                {busy === 'daily' ? 'Generating…' : 'Refresh today'}
              </Button>
            </div>

            {daily ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Metric
                    label="Evidence index"
                    value={
                      daily.scoreStatus === 'estimated' &&
                      daily.privacyScore !== null
                        ? String(daily.privacyScore)
                        : 'N/A'
                    }
                  />
                  <Metric
                    label="Coverage"
                    value={daily.scoreConfidence || 'none'}
                  />
                  <Metric
                    label="Occurrences"
                    value={String(daily.eventCounts.total)}
                  />
                </div>
                <DomainLabels
                  title="Most frequent recorded domain labels"
                  domains={daily.topDomains.map(item => item.domain)}
                />
              </div>
            ) : (
              <EmptyReport />
            )}
          </section>

          <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                  Weekly aggregation
                </h3>
                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                  Week beginning {weekly?.weekStart || 'not generated'}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void generateWeekly()}
              >
                {busy === 'weekly' ? 'Generating…' : 'Refresh week'}
              </Button>
            </div>

            {weekly ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Numeric-day average"
                    value={
                      weekly.averageScore === null
                        ? 'N/A'
                        : String(weekly.averageScore)
                    }
                  />
                  <Metric
                    label="Change vs prior week"
                    value={
                      weekly.scoreChange === null
                        ? 'N/A'
                        : `${weekly.scoreChange >= 0 ? '+' : ''}${weekly.scoreChange}`
                    }
                  />
                </div>
                <DomainLabels
                  title="Domain labels observed in the aggregation"
                  domains={weekly.newTrackers}
                />
              </div>
            ) : (
              <EmptyReport />
            )}
          </section>

          <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Report lifecycle
            </h3>
            <div className="mt-2 space-y-2 text-[10px] text-[var(--text-secondary)]">
              <RunStatus
                label="Daily"
                record={overview?.status.lastDailyRun}
              />
              <RunStatus
                label="Weekly"
                record={overview?.status.lastWeeklyRun}
              />
            </div>
          </section>
        </>
      )}

      {error && (
        <div className="rounded border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-xs text-[var(--error)]">
          {error}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[var(--bg-tertiary)] p-2 text-center">
      <div className="text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-0.5 text-[9px] text-[var(--text-tertiary)]">
        {label}
      </div>
    </div>
  );
}

function DomainLabels({ title, domains }: { title: string; domains: string[] }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-secondary)]">{title}</p>
      {domains.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {domains.slice(0, 6).map(domain => (
            <span
              key={domain}
              className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)]"
            >
              {domain}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[9px] text-[var(--text-tertiary)]">None</p>
      )}
    </div>
  );
}

function EmptyReport() {
  return (
    <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
      No report has been stored for this period.
    </p>
  );
}

function RunStatus({
  label,
  record,
}: {
  label: string;
  record:
    | {
        status: 'success' | 'error';
        source: string;
        period: string;
        completedAt: number;
        error?: string;
      }
    | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className="text-right">
        {record
          ? `${record.status} • ${record.source} • ${new Date(
              record.completedAt
            ).toLocaleString()}`
          : 'not run'}
        {record?.error ? ` • ${record.error}` : ''}
      </span>
    </div>
  );
}
