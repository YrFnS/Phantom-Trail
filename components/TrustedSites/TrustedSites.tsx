import { useEffect, useState, type FormEvent } from 'react';
import {
  TrustedSitesManager,
  type TrustedSite,
  TrustLevel,
} from '../../lib/trusted-sites-manager';

interface TrustedSitesProps {
  className?: string;
}

/**
 * Personal site annotations.
 *
 * The directory name is retained for compatibility with existing imports.
 */
export function TrustedSites({ className = '' }: TrustedSitesProps) {
  const [sites, setSites] = useState<TrustedSite[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setSites(await TrustedSitesManager.getTrustedSites());
    } catch (error) {
      console.error('Failed to load site annotations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddSite = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDomain.trim()) return;

    try {
      await TrustedSitesManager.addTrustedSite(
        newDomain,
        TrustLevel.PARTIAL_TRUST,
        newReason.trim() || undefined
      );
      setNewDomain('');
      setNewReason('');
      await loadData();
    } catch (error) {
      console.error('Failed to add site annotation:', error);
    }
  };

  const handleRemoveSite = async (domain: string) => {
    try {
      await TrustedSitesManager.removeTrustedSite(domain);
      await loadData();
    } catch (error) {
      console.error('Failed to remove site annotation:', error);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-[var(--bg-tertiary)] rounded" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Personal Site Annotations
        </h2>
        <div className="p-3 mb-4 rounded border-l-2 border-[var(--warning)] bg-[var(--warning)]/5 text-xs leading-relaxed text-[var(--text-secondary)]">
          These entries are your own labels. Adding a domain does not mark it as
          safe, improve its heuristic score, suppress detector output, verify its
          identity, or apply the label to subdomains.
        </div>

        <form
          onSubmit={event => void handleAddSite(event)}
          className="bg-[var(--bg-secondary)] p-4 rounded-lg mb-6"
        >
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Domain to annotate
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={event => setNewDomain(event.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Personal note (optional)
              </label>
              <input
                type="text"
                value={newReason}
                onChange={event => setNewReason(event.target.value)}
                placeholder="Why you want to remember this domain"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            Add Annotation
          </button>
        </form>

        <div>
          <h3 className="text-md font-medium text-[var(--text-primary)] mb-3">
            Saved Annotations ({sites.length})
          </h3>
          {sites.length === 0 ? (
            <div className="text-[var(--text-secondary)] text-center py-8">
              No personal site annotations yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map(site => (
                <div
                  key={site.domain}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--accent-primary)]">★</span>
                        <div className="font-medium text-[var(--text-primary)] truncate">
                          {site.domain}
                        </div>
                        <span className="px-2 py-1 text-[10px] rounded-full text-[var(--text-secondary)] bg-[var(--bg-tertiary)]">
                          Personal label
                        </span>
                      </div>
                      {site.reason && (
                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                          {site.reason}
                        </div>
                      )}
                      <div className="text-xs text-[var(--text-tertiary)] mt-1">
                        Added {new Date(site.dateAdded).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleRemoveSite(site.domain)}
                      className="text-[var(--error)] hover:opacity-80 text-sm shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
