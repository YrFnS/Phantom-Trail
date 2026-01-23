import React, { useState, useEffect } from 'react';
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

export const PrivacyCoaching: React.FC<PrivacyCoachingProps> = ({
  className = '',
}) => {
  const [journey, setJourney] = useState<PrivacyJourney | null>(null);
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [events] = useStorage<TrackingEvent[]>('phantom_trail_events', []);

  useEffect(() => {
    const loadCoachingData = async () => {
      try {
        setLoading(true);

        // Calculate current privacy score
        const recentEvents = events.slice(-100);
        const currentScore = calculatePrivacyScore(recentEvents, true);

        // Update or initialize journey
        const updatedJourney = await PrivacyCoach.updateJourney(
          currentScore.score
        );
        setJourney(updatedJourney);

        // Generate coaching insights
        const coachingInsights = await PrivacyCoach.generateCoachingInsights(
          updatedJourney,
          recentEvents
        );
        setInsights(coachingInsights);
      } catch (error) {
        console.error('Failed to load coaching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (events.length > 0) {
      loadCoachingData();
    } else {
      setLoading(false);
    }
  }, [events]);

  const getInsightIcon = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'progress':
        return '📈';
      case 'warning':
        return '⚠️';
      case 'suggestion':
        return '💡';
      default:
        return '📋';
    }
  };

  const getInsightColor = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'achievement':
        return 'border-[var(--success)] bg-[var(--success)]/10';
      case 'progress':
        return 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10';
      case 'warning':
        return 'border-[var(--error)] bg-[var(--error)]/10';
      case 'suggestion':
        return 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10';
      default:
        return 'border-[var(--border-primary)] bg-[var(--bg-secondary)]';
    }
  };

  const getScoreChange = () => {
    if (!journey || journey.scoreHistory.length < 2) return 0;
    const recent = journey.scoreHistory.slice(-7);
    if (recent.length < 2) return 0;
    return recent[recent.length - 1].score - recent[0].score;
  };

  const getJourneyDuration = () => {
    if (!journey) return 0;
    return Math.floor((Date.now() - journey.startDate) / (24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-3`}>
        <div className="h-6 bg-[var(--bg-secondary)] rounded"></div>
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/2"></div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className={`${className} text-center py-6`}>
        <div className="text-2xl mb-2">🎯</div>
        <p className="text-sm text-[var(--text-secondary)]">
          Start browsing to begin your privacy journey
        </p>
      </div>
    );
  }

  const scoreChange = getScoreChange();
  const journeyDays = getJourneyDuration();

  return (
    <div className={`${className} space-y-4`}>
      {/* Journey Overview */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Privacy Journey
          </h3>
          <div className="text-xs text-[var(--text-secondary)]">
            Day {journeyDays}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-primary)]">
              {journey.currentScore}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Current Score
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${
                scoreChange >= 0
                  ? 'text-[var(--success)]'
                  : 'text-[var(--error)]'
              }`}
            >
              {scoreChange >= 0 ? '+' : ''}
              {scoreChange}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              This Week
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-secondary)]">
              {journey.completedActions.length}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Actions Taken
            </div>
          </div>
        </div>

        {/* Active Goals */}
        {journey.improvementGoals.filter(g => g.status === 'active').length >
          0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Active Goals
            </h4>
            {journey.improvementGoals
              .filter(g => g.status === 'active')
              .slice(0, 2)
              .map(goal => (
                <div
                  key={goal.id}
                  className="p-2 bg-[var(--bg-tertiary)] rounded border-l-2 border-[var(--accent-primary)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {goal.title}
                    </span>
                    <span className="text-xs text-[var(--accent-primary)]">
                      Target: {goal.targetScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {goal.description}
                  </p>
                  <div className="mt-1 bg-[var(--bg-primary)] rounded-full h-1">
                    <div
                      className="bg-[var(--accent-primary)] h-1 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (journey.currentScore / goal.targetScore) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Coaching Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide px-1">
            Personal Insights
          </h3>
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
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
                        // Navigate to Privacy Actions tab
                        const event = new CustomEvent('switchTab', {
                          detail: 'actions',
                        });
                        window.dispatchEvent(event);
                      }}
                      className="mt-2 text-xs px-2 py-1 bg-[var(--accent-primary)] text-white rounded hover:opacity-80 transition-opacity"
                    >
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score History Chart */}
      {journey.scoreHistory.length > 1 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Score Trend
          </h4>
          <div className="h-16 flex items-end justify-between gap-1">
            {journey.scoreHistory.slice(-14).map((point, index) => (
              <div
                key={index}
                className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{
                  height: `${(point.score / 100) * 100}%`,
                  minHeight: '2px',
                }}
                title={`Score: ${point.score} (${new Date(point.date).toLocaleDateString()})`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
