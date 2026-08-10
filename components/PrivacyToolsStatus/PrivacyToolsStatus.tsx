import React, { useState, useEffect } from 'react';
import {
  PrivacyToolDetector,
  type PrivacyToolsStatus as ToolsStatus,
} from '../../lib/privacy-tool-detector';
import type { TrackingEvent } from '../../lib/types';
import { ChromeTabs } from '../../lib/chrome-tabs';

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
        console.error('Failed to inspect privacy tools:', error);
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

  const enabledToolCount =
    status.enabledToolCount ??
    status.tools.filter(tool => tool.enabled).length;
  const observedSignals = status.observedSignals ?? events.length;

  return (
    <div
      className={`${className} bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-primary)]`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Recognized Privacy Tools
          </h3>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Installation state only
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-[var(--warning)]">
          Experimental
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-[var(--bg-tertiary)] rounded">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {enabledToolCount}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Enabled tools
          </div>
        </div>
        <div className="text-center p-2 bg-[var(--bg-tertiary)] rounded">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {observedSignals}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            Recorded signals
          </div>
        </div>
      </div>

      <div className="p-2 mb-3 text-[10px] rounded border border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--text-secondary)]">
        Phantom Trail cannot observe another extension’s filtering decisions.
        It does not measure effectiveness, blocked requests, or missed trackers.
      </div>

      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Supported tool discovery
        </h4>
        {status.tools.slice(0, 5).map(tool => (
          <div
            key={tool.name}
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

            {tool.enabled ? (
              <span className="text-xs text-[var(--success)]">Enabled</span>
            ) : (
              <button
                onClick={() =>
                  tool.installUrl &&
                  ChromeTabs.createTab({ url: tool.installUrl })
                }
                className="text-xs px-2 py-1 bg-[var(--accent-primary)] text-white rounded hover:opacity-80 transition-opacity"
              >
                Review
              </button>
            )}
          </div>
        ))}
      </div>

      {status.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Notes
          </h4>
          {status.recommendations.slice(0, 3).map(recommendation => (
            <div
              key={recommendation}
              className="p-2 bg-[var(--bg-primary)] rounded border-l-2 border-[var(--warning)]"
            >
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {recommendation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
