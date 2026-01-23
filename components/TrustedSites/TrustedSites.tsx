import React, { useState, useEffect } from 'react';
import {
  TrustedSitesManager,
  TrustedSite,
  TrustLevel,
  TrustSuggestion,
} from '../../lib/trusted-sites-manager';

interface TrustedSitesProps {
  className?: string;
}

export const TrustedSites: React.FC<TrustedSitesProps> = ({
  className = '',
}) => {
  const [trustedSites, setTrustedSites] = useState<TrustedSite[]>([]);
  const [suggestions, setSuggestions] = useState<TrustSuggestion[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newTrustLevel, setNewTrustLevel] = useState<TrustLevel>(
    TrustLevel.PARTIAL_TRUST
  );
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sites, suggestions] = await Promise.all([
        TrustedSitesManager.getTrustedSites(),
        TrustedSitesManager.getTrustSuggestions(),
      ]);
      setTrustedSites(sites);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load trusted sites data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      await TrustedSitesManager.addTrustedSite(
        newDomain.trim().toLowerCase(),
        newTrustLevel,
        newReason.trim() || undefined
      );
      setNewDomain('');
      setNewReason('');
      await loadData();
    } catch (error) {
      console.error('Failed to add trusted site:', error);
    }
  };

  const handleRemoveSite = async (domain: string) => {
    try {
      await TrustedSitesManager.removeTrustedSite(domain);
      await loadData();
    } catch (error) {
      console.error('Failed to remove trusted site:', error);
    }
  };

  const handleUpdateTrustLevel = async (domain: string, level: TrustLevel) => {
    try {
      await TrustedSitesManager.updateTrustLevel(domain, level);
      await loadData();
    } catch (error) {
      console.error('Failed to update trust level:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestion: TrustSuggestion) => {
    try {
      await TrustedSitesManager.addTrustedSite(
        suggestion.domain,
        TrustLevel.PARTIAL_TRUST,
        suggestion.reason
      );
      await loadData();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const handleDismissSuggestion = async (suggestion: TrustSuggestion) => {
    try {
      const updatedSuggestions = suggestions.filter(
        s => s.domain !== suggestion.domain
      );
      setSuggestions(updatedSuggestions);
      // Note: In a full implementation, we'd update storage here
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const getTrustLevelColor = (level: TrustLevel): string => {
    switch (level) {
      case TrustLevel.FULL_TRUST:
        return 'text-[var(--success)] bg-[var(--success)]/10';
      case TrustLevel.PARTIAL_TRUST:
        return 'text-[var(--warning)] bg-[var(--warning)]/10';
      case TrustLevel.CONDITIONAL:
        return 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10';
      default:
        return 'text-[var(--text-secondary)] bg-[var(--bg-tertiary)]';
    }
  };

  const getTrustLevelLabel = (level: TrustLevel): string => {
    switch (level) {
      case TrustLevel.FULL_TRUST:
        return 'Full Trust';
      case TrustLevel.PARTIAL_TRUST:
        return 'Partial Trust';
      case TrustLevel.CONDITIONAL:
        return 'Conditional';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Trusted Sites
        </h2>

        {/* Add New Site Form */}
        <form
          onSubmit={handleAddSite}
          className="bg-[var(--bg-secondary)] p-4 rounded-lg mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Domain
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Trust Level
              </label>
              <select
                value={newTrustLevel}
                onChange={e => setNewTrustLevel(e.target.value as TrustLevel)}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              >
                <option value={TrustLevel.PARTIAL_TRUST}>Partial Trust</option>
                <option value={TrustLevel.FULL_TRUST}>Full Trust</option>
                <option value={TrustLevel.CONDITIONAL}>Conditional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="Why do you trust this site?"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-md hover:bg-[var(--accent-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            Add Trusted Site
          </button>
        </form>

        {/* Trust Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-[var(--text-primary)] mb-3">
              Trust Suggestions
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {suggestion.domain}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {suggestion.reason}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="px-3 py-1 bg-[var(--accent-primary)] text-[var(--bg-primary)] text-sm rounded hover:bg-[var(--accent-secondary)]"
                      >
                        Trust
                      </button>
                      <button
                        onClick={() => handleDismissSuggestion(suggestion)}
                        className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded hover:bg-[var(--border-primary)]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trusted Sites List */}
        <div>
          <h3 className="text-md font-medium text-[var(--text-primary)] mb-3">
            Your Trusted Sites ({trustedSites.length})
          </h3>
          {trustedSites.length === 0 ? (
            <div className="text-[var(--text-secondary)] text-center py-8">
              No trusted sites yet. Add some above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {trustedSites.map(site => (
                <div
                  key={site.domain}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          🛡️ {site.domain}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getTrustLevelColor(site.trustLevel)}`}
                        >
                          {getTrustLevelLabel(site.trustLevel)}
                        </span>
                      </div>
                      {site.reason && (
                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                          {site.reason}
                        </div>
                      )}
                      <div className="text-xs text-[var(--text-tertiary)] mt-1">
                        Added: {new Date(site.dateAdded).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={site.trustLevel}
                        onChange={e =>
                          handleUpdateTrustLevel(
                            site.domain,
                            e.target.value as TrustLevel
                          )
                        }
                        className="text-sm bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 text-[var(--text-primary)]"
                      >
                        <option value={TrustLevel.PARTIAL_TRUST}>
                          Partial
                        </option>
                        <option value={TrustLevel.FULL_TRUST}>Full</option>
                        <option value={TrustLevel.CONDITIONAL}>
                          Conditional
                        </option>
                      </select>
                      <button
                        onClick={() => handleRemoveSite(site.domain)}
                        className="text-[var(--error)] hover:text-[var(--error)]/80 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
