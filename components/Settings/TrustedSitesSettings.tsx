import { TrustedSites } from '../TrustedSites';

interface TrustedSitesSettingsProps {
  className?: string;
}

/**
 * P0 exposes only persistent personal annotations.
 *
 * Automatic suggestions, score boosts, detector suppression, subdomain
 * inheritance, and verification schedules are hidden because they are not
 * implemented and validated as user-facing behavior.
 */
export function TrustedSitesSettings({
  className = '',
}: TrustedSitesSettingsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
        <h3 className="text-sm font-medium text-[var(--warning)] mb-1">
          Personal annotations only
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          The earlier “trust levels” and automatic suggestions were prototype
          concepts. In version 0.1.0, saved domains are notes only and have no
          effect on monitoring, scores, or safety conclusions.
        </p>
      </div>
      <TrustedSites />
    </div>
  );
}
