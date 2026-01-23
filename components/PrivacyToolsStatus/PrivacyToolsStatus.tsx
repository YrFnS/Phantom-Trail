import React, { useState, useEffect } from 'react';
import {
  PrivacyToolDetector,
  type PrivacyToolsStatus as ToolsStatus,
} from '../../lib/privacy-tool-detector';
import type { TrackingEvent } from '../../lib/types';

interface PrivacyToolsStatusProps {
  events: TrackingEvent[];
  className?: string;
}

export const PrivacyToolsStatus: React.FC<PrivacyToolsStatusProps> = ({
  events,
  className = '',
}) => {
  const [status, setStatus] = useState<ToolsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeTools = async () => {
      try {
        setLoading(true);
        const tools = await PrivacyToolDetector.detectInstalledTools();
        const toolStatus = await PrivacyToolDetector.analyzeEffectiveness(
          tools,
          events
        );
        setStatus(toolStatus);
      } catch (error) {
        console.error('Failed to analyze privacy tools:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeTools();
  }, [events]);

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-4 bg-[var(--bg-secondary)] rounded mb-2"></div>
        <div className="h-3 bg-[var(--bg-secondary)] rounded w-2/3"></div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 80) return 'text-[var(--success)]';
    if (effectiveness >= 60) return 'text-[var(--warning)]';
    return 'text-[var(--error)]';
  };

  const getEffectivenessIcon = (effectiveness: number) => {
    if (effectiveness >= 80) return '🛡️';
    if (effectiveness >= 60) return '⚠️';
    return '🚨';
  };

  return (
    <div
      className={`${className} bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]`}
    >
      {/* Header with overall effectiveness */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {getEffectivenessIcon(status.overallEffectiveness)}
          </span>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Privacy Protection
          </h3>
        </div>
        <div className="text-right">
          <div
            className={`text-lg font-bold ${getEffectivenessColor(status.overallEffectiveness)}`}
          >
            {status.overallEffectiveness}%
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Effectiveness
          </div>
        </div>
      </div>

      {/* Protection stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-[var(--bg-tertiary)] rounded">
          <div className="text-lg font-bold text-[var(--success)]">
            {status.blockedTrackers}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Blocked
          </div>
        </div>
        <div className="text-center p-2 bg-[var(--bg-tertiary)] rounded">
          <div className="text-lg font-bold text-[var(--error)]">
            {status.missedTrackers}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">Missed</div>
        </div>
      </div>

      {/* Detected tools */}
      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Detected Tools
        </h4>
        {status.tools.slice(0, 3).map((tool, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  tool.enabled
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--text-secondary)]'
                }`}
              />
              <span className="text-xs text-[var(--text-primary)]">
                {tool.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {tool.enabled ? (
                <span className="text-xs text-[var(--success)]">
                  {tool.effectiveness}%
                </span>
              ) : (
                <button
                  onClick={() =>
                    tool.installUrl &&
                    chrome.tabs.create({ url: tool.installUrl })
                  }
                  className="text-xs px-2 py-1 bg-[var(--accent-primary)] text-white rounded hover:opacity-80 transition-opacity"
                >
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Improve Protection
          </h4>
          {status.recommendations.slice(0, 2).map((rec, index) => (
            <div
              key={index}
              className="p-2 bg-[var(--bg-primary)] rounded border-l-2 border-[var(--accent-primary)]"
            >
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                💡 {rec}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
