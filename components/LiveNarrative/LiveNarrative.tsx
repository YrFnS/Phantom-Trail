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

/**
 * Individual event display component with AI analysis
 */
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
          <Badge variant={event.riskLevel} className="text-[10px] px-1.5 py-0.5 shrink-0">
            {event.riskLevel}
          </Badge>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-terminal truncate">{event.domain}</h3>
            <p className="text-[10px] text-gray-400 line-clamp-1">{event.description}</p>
          </div>
        </div>

        {displayAnalysis && !analysisLoading && (
          <div className="mt-1.5 pt-1.5 border-t border-dark-600/50">
            <p className="text-[10px] text-gray-300 leading-relaxed">{displayAnalysis.narrative}</p>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.analysis === nextProps.analysis
    );
  }
);

/**
 * Pattern alert display component
 */
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
                : 'bg-tracker/10 border-tracker text-tracker'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-sm">
              {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
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

/**
 * Main Live Narrative component
 */
export function LiveNarrative({ className = '' }: LiveNarrativeProps) {
  const { events, analysis, loading, error } = useLiveNarrative();
  const { alerts } = usePatternDetection(events);

  // Memoize expensive computations
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
            <h2 className="text-sm font-semibold text-terminal">Live Activity</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-400">
                Loading tracking data...
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
            <h2 className="text-sm font-semibold text-terminal">Live Activity</h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-600 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <p className="text-sm text-gray-400 mb-1">
                No tracking detected yet...
              </p>
              <p className="text-xs text-gray-500">
                Visit a website to see tracking activity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Compact header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Feed</h2>
          {hasEvents && (
            <div className="w-1.5 h-1.5 bg-plasma rounded-full animate-pulse-dot" title="Live updates" />
          )}
        </div>
        {hasEvents && (
          <span className="text-[10px] text-gray-500">{events.length} events</span>
        )}
      </div>

      {isInitialLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {!hasEvents && !isInitialLoading && (
        <div className="text-center py-12">
          <div className="text-3xl mb-2 opacity-50">🔍</div>
          <p className="text-xs text-gray-500">No tracking detected</p>
        </div>
      )}

      {hasEvents && (
        <>
          <PatternAlerts alerts={alerts} />

          {analysis && (
            <div className="p-2 bg-hud/50 rounded border-l-2 border-plasma/30">
              <p className="text-xs text-gray-300 leading-relaxed">{analysis.narrative}</p>
            </div>
          )}

          {error && (
            <div className="p-2 bg-yellow-500/5 rounded border-l-2 border-yellow-500">
              <p className="text-xs text-yellow-400">AI analysis unavailable</p>
            </div>
          )}

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {events.map(event => (
              <EventDisplay
                key={event.id}
                event={event}
                analysis={event.id === events[events.length - 1]?.id ? analysis || undefined : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
