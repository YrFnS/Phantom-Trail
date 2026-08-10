import React from 'react';
import {
  useLiveNarrative,
  useEventAnalysis,
  usePatternDetection,
} from './LiveNarrative.hooks';
import type {
  LiveNarrativeProps,
  EventDisplayProps,
  PatternAlert,
} from './LiveNarrative.types';
import { Card, CardHeader, CardContent, Badge, LoadingSpinner } from '../ui';
import { PrivacyActions } from '../PrivacyActions';

const EventDisplay = React.memo(
  function EventDisplay({ event, analysis }: EventDisplayProps) {
    const { analysis: eventAnalysis, loading: analysisLoading } =
      useEventAnalysis(event);

    const displayAnalysis = React.useMemo(
      () => eventAnalysis || analysis,
      [eventAnalysis, analysis]
    );

    return (
      <div className="group relative p-2 rounded-lg bg-dark-800/50 border border-dark-600/50 hover:border-plasma/30 transition-all duration-200">
        <div className="flex items-start gap-2">
          <Badge
            variant={event.riskLevel}
            className="text-[10px] px-1.5 py-0.5 shrink-0"
          >
            {event.riskLevel} label
          </Badge>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-[var(--text-primary)] truncate">
              {event.domain}
            </h3>
            <p className="text-[10px] text-gray-400 line-clamp-1">
              {event.description}
            </p>
          </div>
        </div>

        {displayAnalysis && !analysisLoading && (
          <div className="mt-1.5 pt-1.5 border-t border-dark-600/50">
            <p className="text-[9px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
              Optional generated summary
            </p>
            <p className="text-[10px] text-gray-300 leading-relaxed">
              {displayAnalysis.narrative}
            </p>
          </div>
        )}
      </div>
    );
  },
  (previousProps, nextProps) =>
    previousProps.event.id === nextProps.event.id &&
    previousProps.analysis === nextProps.analysis
);

const PatternAlerts = React.memo(function PatternAlerts({
  alerts,
}: {
  alerts: PatternAlert[];
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-2">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-2 rounded-lg border-l-2 text-xs ${
            alert.severity === 'critical'
              ? 'bg-red-500/10 border-red-400 text-red-300'
              : alert.severity === 'warning'
                ? 'bg-yellow-500/10 border-yellow-400 text-yellow-300'
                : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-sm">
              {alert.severity === 'critical'
                ? '⚠️'
                : alert.severity === 'warning'
                  ? '⚠️'
                  : 'ℹ️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-tight">{alert.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export function LiveNarrative({ className = '' }: LiveNarrativeProps) {
  const { events, analysis, loading, error } = useLiveNarrative();
  const { alerts } = usePatternDetection(events);

  const hasEvents = React.useMemo(() => events.length > 0, [events.length]);
  const isInitialLoading = React.useMemo(
    () => loading && events.length === 0,
    [loading, events.length]
  );

  if (isInitialLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recorded Signals
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-400">
                Loading recorded detector signals...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasEvents) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recorded Signals
            </h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-600 opacity-30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p className="text-sm text-gray-400 mb-1">
                No detector signals recorded yet
              </p>
              <p className="text-xs text-gray-500">
                Browse to collect possible tracking-related signals
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Recorded Signal Feed
          </h2>
          <div
            className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse-dot"
            title="Local detector updates"
          />
        </div>
        <span className="text-[10px] text-gray-500">
          {events.length} signals
        </span>
      </div>

      <div className="p-2 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        These entries are rule and instrumentation output. They can include false
        positives and do not prove that data was collected, retained, shared, or
        sold.
      </div>

      <PatternAlerts alerts={alerts} />

      {analysis && (
        <div className="p-2 bg-[var(--bg-secondary)] rounded border-l-2 border-[var(--accent-primary)]/30">
          <p className="text-[9px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
            Optional generated summary
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">
            {analysis.narrative}
          </p>
        </div>
      )}

      {error && (
        <div className="p-2 bg-yellow-500/5 rounded border-l-2 border-yellow-500">
          <p className="text-xs text-yellow-400">
            Optional generated summary unavailable
          </p>
        </div>
      )}

      <PrivacyActions
        events={events}
        currentDomain={events[0]?.domain || ''}
        className="mb-2"
      />

      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {events.map(event => (
          <EventDisplay
            key={event.id}
            event={event}
            analysis={
              event.id === events[events.length - 1]?.id
                ? analysis || undefined
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
