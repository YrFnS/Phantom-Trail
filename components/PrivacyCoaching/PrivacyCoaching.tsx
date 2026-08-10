import { useEffect, useState } from 'react';
import {
  PrivacyCoach,
  type PrivacyJourney,
  type CoachingInsight,
} from '../../lib/privacy-coach';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import { useStorage } from '../../lib/hooks/useStorage';
import type { TrackingEvent } from '../../lib/types';

interface PrivacyCoachingProps {
  className?: string;
}

export function PrivacyCoaching({ className = '' }: PrivacyCoachingProps) {
  const [journey, setJourney] = useState<PrivacyJourney | null>(null);
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [events] = useStorage<TrackingEvent[]>('phantom_trail_events', []);

  useEffect(() => {
    const loadCoachingData = async () => {
      try {
        setLoading(true);
        const recentEvents = events.slice(-100);
        const heuristicScore = calculatePrivacyScore(recentEvents, true);
        const updatedJourney = await PrivacyCoach.updateJourney(
          heuristicScore.score
        );
        setJourney(updatedJourney);
        setInsights(
          await PrivacyCoach.generateCoachingInsights(
            updatedJourney,
            recentEvents
          )
        );
      } catch (error) {
        console.error('Failed to load experimental coaching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (events.length > 0) {
      void loadCoachingData();
    } else {
      setLoading(false);
    }
  }, [events]);

  const getInsightIcon = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'achievement':
        return '◇';
      case 'progress':
        return '↗';
      case 'warning':
        return '⚠';
      case 'suggestion':
        return '○';
      default:
        return '•';
    }
  };

  const getInsightColor = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'achievement':
        return 'border-[var(--success)] bg-[var(--success)]/10';
      case 'progress':
        return 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10';
      case 'warning':
        return 'border-[var(--warning)] bg-[var(--warning)]/10';
      case 'suggestion':
        return 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10';
      default:
        return 'border-[var(--border-primary)] bg-[var(--bg-secondary)]';
    }
  };

  const getScoreChange = () => {
    if (!journey || journey.scoreHistory.length < 2) return 0;
    const recent = journey.scoreHistory.slice(-7);
    return recent[recent.length - 1].score - recent[0].score;
  };

  const getJournalDuration = () => {
    if (!journey) return 0;
    return Math.floor(
      (Date.now() - journey.startDate) / (24 * 60 * 60 * 1000)
    );
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-3`}>
        <div className="h-6 bg-[var(--bg-secondary)] rounded" />
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4" />
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/2" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className={`${className} text-center py-6`}>
        <div className="text-2xl mb-2">○</div>
        <p className="text-sm text-[var(--text-secondary)]">
          Browse to collect signals for experimental coaching
        </p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
          No conclusions are available without recorded detector output.
        </p>
      </div>
    );
  }

  const scoreChange = getScoreChange();
  const journalDays = getJournalDuration();

  return (
    <div className={`${className} space-y-4`}>
      <div className="p-2 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        Goals, trends, and suggestions below are generated from heuristic
        detector events. They are not measurements of browsing safety, total
        behavior, privacy protection, or legal compliance.
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Experimental Coaching Journal
          </h3>
          <div className="text-xs text-[var(--text-secondary)]">
            Journal day {journalDays}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-primary)]">
              {journey.currentScore}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Current heuristic
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${
                scoreChange >= 0
                  ? 'text-[var(--success)]'
                  : 'text-[var(--warning)]'
              }`}
            >
              {scoreChange >= 0 ? '+' : ''}
              {scoreChange}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Recent change
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-secondary)]">
              {journey.completedActions.length}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Recorded actions
            </div>
          </div>
        </div>

        {journey.improvementGoals.some(goal => goal.status === 'active') && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Generated goals
            </h4>
            {journey.improvementGoals
              .filter(goal => goal.status === 'active')
              .slice(0, 2)
              .map(goal => (
                <div
                  key={goal.id}
                  className="p-2 bg-[var(--bg-tertiary)] rounded border-l-2 border-[var(--accent-primary)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {goal.title}
                    </span>
                    <span className="text-xs text-[var(--accent-primary)] shrink-0">
                      Model target: {goal.targetScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {goal.description}
                  </p>
                  <div className="mt-1 bg-[var(--bg-primary)] rounded-full h-1">
                    <div
                      className="bg-[var(--accent-primary)] h-1 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (journey.currentScore / goal.targetScore) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide px-1">
            Heuristic suggestions
          </h3>
          {insights.map((insight, index) => (
            <div
              key={`${insight.title}-${index}`}
              className={`p-3 rounded-lg border-l-4 ${getInsightColor(
                insight.type
              )}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {insight.message}
                  </p>
                  {insight.actionable && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('switchTab', { detail: 'actions' })
                        );
                      }}
                      className="mt-2 text-xs px-2 py-1 bg-[var(--accent-primary)] text-white rounded hover:opacity-80 transition-opacity"
                    >
                      Review suggestion
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {journey.scoreHistory.length > 1 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Heuristic history
          </h4>
          <div className="h-16 flex items-end justify-between gap-1">
            {journey.scoreHistory.slice(-14).map((point, index) => (
              <div
                key={`${point.date}-${index}`}
                className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{
                  height: `${point.score}%`,
                  minHeight: '2px',
                }}
                title={`Heuristic: ${point.score} (${new Date(
                  point.date
                ).toLocaleDateString()})`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
