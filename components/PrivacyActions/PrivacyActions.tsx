import { useEffect, useState } from 'react';
import {
  PrivacyRecommendations,
  type PrivacyAction,
  type ServiceAlternative,
} from '../../lib/privacy-recommendations';
import type { TrackingEvent } from '../../lib/types';
import { ChromeTabs } from '../../lib/chrome-tabs';

interface PrivacyActionsProps {
  events: TrackingEvent[];
  currentDomain: string;
  className?: string;
}

export function PrivacyActions({
  events,
  currentDomain,
  className = '',
}: PrivacyActionsProps) {
  const [actions, setActions] = useState<PrivacyAction[]>([]);
  const [alternatives, setAlternatives] = useState<ServiceAlternative[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        const personalizedActions =
          await PrivacyRecommendations.getPersonalizedActions(events);
        const contextualActions =
          await PrivacyRecommendations.getContextualRecommendations(
            currentDomain,
            events
          );
        const serviceAlternatives =
          await PrivacyRecommendations.suggestAlternatives(currentDomain);

        setActions(
          [...personalizedActions, ...contextualActions]
            .filter(
              (action, index, all) =>
                all.findIndex(candidate => candidate.id === action.id) === index
            )
            .slice(0, 3)
        );
        setAlternatives(serviceAlternatives);
      } catch (error) {
        console.error('Failed to load prototype suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (events.length > 0) {
      void loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [currentDomain, events]);

  const handleActionClick = (actionId: string, url?: string) => {
    if (url) void ChromeTabs.createTab({ url });
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-[var(--success)]';
      case 'medium':
        return 'text-[var(--warning)]';
      case 'advanced':
        return 'text-[var(--error)]';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return '◇';
      case 'medium':
        return '○';
      case 'low':
        return '·';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-4 bg-[var(--bg-secondary)] rounded mb-2" />
        <div className="h-3 bg-[var(--bg-secondary)] rounded w-3/4" />
      </div>
    );
  }

  if (actions.length === 0 && alternatives.length === 0) return null;

  return (
    <div className={`${className} space-y-3`}>
      <div className="p-2 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        Suggestions are generated from heuristic detector labels and static
        rules. Review each option independently; impact, suitability, and
        third-party claims have not been validated by Phantom Trail.
      </div>

      {actions.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[var(--accent-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Prototype Suggestions
            </h3>
          </div>

          <div className="space-y-2">
            {actions.map(action => (
              <div
                key={action.id}
                className="border border-[var(--border-secondary)] rounded-md"
              >
                <button
                  onClick={() => handleActionClick(action.id, action.url)}
                  className="w-full p-2 text-left hover:bg-[var(--bg-tertiary)] transition-colors rounded-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {getImpactIcon(action.impact)}
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {action.title}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${getDifficultyColor(
                            action.difficulty
                          )}`}
                        >
                          {action.difficulty} label
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {action.description}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                        Generated impact label: {action.impact}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-[var(--text-secondary)] transition-transform shrink-0 ${
                        expandedAction === action.id ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {expandedAction === action.id && action.steps && (
                  <div className="px-2 pb-2">
                    <div className="bg-[var(--bg-primary)] rounded p-2 mt-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                        Suggested review steps:
                      </p>
                      <ol className="text-xs text-[var(--text-secondary)] space-y-1">
                        {action.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-[var(--accent-primary)] font-medium">
                              {index + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[var(--accent-secondary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 7h10v10" />
              <path d="M7 17L17 7" />
            </svg>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Possible Alternatives
            </h3>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-2 leading-relaxed">
            This is a static prototype list. Inclusion is not an endorsement,
            audit result, or guarantee of better privacy.
          </p>

          <div className="space-y-2">
            {alternatives.map((alternative, index) => (
              <div
                key={`${alternative.alternative}-${index}`}
                className="p-2 border border-[var(--border-secondary)] rounded-md"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {alternative.alternative}
                  </span>
                  <button
                    onClick={() =>
                      void ChromeTabs.createTab({ url: alternative.url })
                    }
                    className="text-xs px-2 py-1 bg-[var(--accent-secondary)] text-white rounded hover:opacity-80 transition-opacity"
                  >
                    Review site
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  {alternative.description}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Listed benefit claim: {alternative.privacyBenefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
