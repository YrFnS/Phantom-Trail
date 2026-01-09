import { useLiveNarrative } from './LiveNarrative.hooks';
import type {
  LiveNarrativeProps,
  EventDisplayProps,
} from './LiveNarrative.types';
import type { RiskLevel } from '../../lib/types';

/**
 * Get risk level styling
 */
function getRiskStyling(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Individual event display component
 */
function EventDisplay({ event, analysis }: EventDisplayProps) {
  const riskStyling = getRiskStyling(event.riskLevel);

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm">{event.domain}</h3>
          <p className="text-xs text-gray-600 mt-1">{event.description}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${riskStyling}`}
        >
          {event.riskLevel}
        </span>
      </div>

      {analysis && (
        <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
          <p className="text-sm text-blue-800">{analysis.narrative}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Main Live Narrative component
 */
export function LiveNarrative({ className = '' }: LiveNarrativeProps) {
  const { events, analysis, loading, error } = useLiveNarrative();

  if (loading && events.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Live Activity</h2>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">
              Loading tracking data...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <h2 className="font-medium text-gray-900 mb-2">Live Activity</h2>
          <p className="text-sm text-gray-500">No tracking detected yet...</p>
          <p className="text-xs text-gray-400 mt-1">
            Visit a website to see tracking activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        <h2 className="font-medium text-gray-900 mb-2">Live Activity</h2>

        {analysis && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-sm text-blue-900 font-medium">
              {analysis.narrative}
            </p>
            {analysis.recommendations.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-blue-700 font-medium">
                  Recommendations:
                </p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
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
            <p className="text-sm text-yellow-800">AI analysis unavailable</p>
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
          <div className="flex items-center justify-center py-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs text-gray-600">Analyzing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
