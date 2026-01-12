import { useLiveNarrative } from './LiveNarrative.hooks';
import type {
  LiveNarrativeProps,
  EventDisplayProps,
} from './LiveNarrative.types';
import { Card, CardHeader, CardContent, Badge, LoadingSpinner } from '../ui';

/**
 * Individual event display component
 */
function EventDisplay({ event, analysis }: EventDisplayProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{event.domain}</h3>
            <p className="text-xs text-gray-600 mt-1">{event.description}</p>
          </div>
          <Badge variant={event.riskLevel}>
            {event.riskLevel}
          </Badge>
        </div>

        {analysis && (
          <div className="mt-2 p-2 bg-phantom-50 rounded border-l-4 border-phantom-400">
            <p className="text-sm text-phantom-800">{analysis.narrative}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Main Live Narrative component
 */
export function LiveNarrative({ className = '' }: LiveNarrativeProps) {
  const { events, analysis, loading, error, retryCount } = useLiveNarrative();

  if (loading && events.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900">Live Activity</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600">
                Loading tracking data...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <h2 className="font-medium text-gray-900">Live Activity</h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm text-gray-500 mb-1">No tracking detected yet...</p>
              <p className="text-xs text-gray-400">
                Visit a website to see tracking activity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900">Live Activity</h2>
        </CardHeader>
        <CardContent>
          {analysis && (
            <div className="mb-3 p-3 bg-phantom-50 rounded-lg border-l-4 border-phantom-400">
              <p className="text-sm text-phantom-900 font-medium">
                {analysis.narrative}
              </p>
              {analysis.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-phantom-700 font-medium">
                    Recommendations:
                  </p>
                  <ul className="text-xs text-phantom-700 mt-1 space-y-1">
                    {analysis.recommendations.map((rec, index) => (
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

          {error && (
            <div className="mb-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-800">
                {(retryCount || 0) > 0 
                  ? `AI analysis retrying... (attempt ${(retryCount || 0) + 1}/3)`
                  : 'AI analysis temporarily unavailable'
                }
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Tracker detection continues to work normally
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
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
            <div className="flex items-center justify-center py-3">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-gray-600 ml-2">Analyzing...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
