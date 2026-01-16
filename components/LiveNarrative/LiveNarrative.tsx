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

    // Use individual event analysis if available, fallback to passed analysis
    const displayAnalysis = React.useMemo(
      () => eventAnalysis || analysis,
      [eventAnalysis, analysis]
    );

    return (
      <Card className="animate-fade-in">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-medium text-white text-sm">
                {event.domain}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{event.description}</p>
              {eventAnalysis?.websiteContext && (
                <Badge variant="default" className="mt-1 text-xs">
                  {eventAnalysis.websiteContext}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge variant={event.riskLevel}>{event.riskLevel}</Badge>
              {eventAnalysis?.confidence && (
                <span className="text-xs text-gray-500">
                  {Math.round(eventAnalysis.confidence * 100)}% confident
                </span>
              )}
            </div>
          </div>

          {analysisLoading && (
            <div className="mt-2 p-2 bg-dark-700 rounded border-l-4 border-dark-600">
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-gray-400">Analyzing...</span>
              </div>
            </div>
          )}

          {displayAnalysis && !analysisLoading && (
            <div className="mt-2 p-2 bg-neon-purple/10 rounded border-l-4 border-neon-purple">
              <p className="text-sm text-gray-200">
                {displayAnalysis.narrative}
              </p>
              {displayAnalysis.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-neon-purple font-medium">
                    Quick actions:
                  </p>
                  <ul className="text-xs text-gray-300 mt-1 space-y-1">
                    {displayAnalysis.recommendations
                      .slice(0, 2)
                      .map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if event ID or analysis changes
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
    <div className="space-y-2 mb-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border-l-4 ${
            alert.severity === 'critical'
              ? 'bg-red-500/10 border-red-400'
              : alert.severity === 'warning'
                ? 'bg-yellow-500/10 border-yellow-400'
                : 'bg-blue-500/10 border-blue-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {alert.severity === 'critical'
                    ? '🚨'
                    : alert.severity === 'warning'
                      ? '⚠️'
                      : 'ℹ️'}
                </span>
                <h4
                  className={`font-medium text-sm ${
                    alert.severity === 'critical'
                      ? 'text-red-400'
                      : alert.severity === 'warning'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                  }`}
                >
                  Pattern Detected
                </h4>
              </div>
              <p
                className={`text-sm mt-1 ${
                  alert.severity === 'critical'
                    ? 'text-red-300'
                    : alert.severity === 'warning'
                      ? 'text-yellow-300'
                      : 'text-blue-300'
                }`}
              >
                {alert.message}
              </p>
              {alert.actionable && (
                <p
                  className={`text-xs mt-2 ${
                    alert.severity === 'critical'
                      ? 'text-red-400'
                      : alert.severity === 'warning'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                  }`}
                >
                  💡 Consider using privacy-focused browser settings or
                  extensions
                </p>
              )}
            </div>
            <Badge variant={alert.pattern.riskLevel} className="ml-2">
              {alert.pattern.type}
            </Badge>
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
  const { events, analysis, loading, error, retryCount } = useLiveNarrative();
  const { alerts } = usePatternDetection(events);

  // Memoize expensive computations
  const hasEvents = React.useMemo(() => events.length > 0, [events.length]);
  const isInitialLoading = React.useMemo(
    () => loading && events.length === 0,
    [loading, events.length]
  );

  if (isInitialLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="font-medium text-white">Live Activity</h2>
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
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="font-medium text-white">Live Activity</h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🔍</div>
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
    <div
      className={`space-y-4 ${className}`}
      role="region"
      aria-label="Live tracking activity"
    >
      <Card>
        <CardHeader>
          <h2 className="font-medium text-white" id="live-activity-heading">
            Live Activity
          </h2>
        </CardHeader>
        <CardContent aria-labelledby="live-activity-heading">
          <PatternAlerts alerts={alerts} />

          {analysis && (
            <div
              className="mb-3 p-3 bg-neon-cyan/10 rounded-lg border-l-4 border-neon-cyan"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-gray-200 font-medium">
                {analysis.narrative}
              </p>
              {analysis.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-neon-cyan font-medium">
                    Recommendations:
                  </p>
                  <ul
                    className="text-xs text-gray-300 mt-1 space-y-1"
                    role="list"
                  >
                    {analysis.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="flex items-start"
                        role="listitem"
                      >
                        <span className="mr-1" aria-hidden="true">
                          •
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              className="mb-3 p-2 bg-yellow-500/10 rounded border-l-4 border-yellow-500"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-yellow-400">
                {(retryCount || 0) > 0
                  ? `AI analysis retrying... (attempt ${(retryCount || 0) + 1}/3)`
                  : 'AI analysis temporarily unavailable'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tracker detection continues to work normally
              </p>
            </div>
          )}

          <div
            className="space-y-2 max-h-64 overflow-y-auto"
            role="log"
            aria-label="Tracking events list"
            tabIndex={0}
          >
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

          {loading && (
            <div
              className="flex items-center justify-center py-3"
              role="status"
              aria-live="polite"
            >
              <LoadingSpinner size="sm" />
              <span className="text-xs text-gray-400 ml-2">Analyzing...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
