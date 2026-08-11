import type {
  DataProtectionSettings,
  PrivacyScore,
  TrackingEvent,
} from './types';
import { calculatePrivacyScore } from './privacy-score';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getPageUrl,
  getResourceDomain,
  getResourceUrl,
  normalizeTrackingEvent,
} from './event-attribution.mts';
import { sanitizeTrackingEventsForStorage } from './data-protection-policy.mts';
import { DataProtectionStorage } from './storage/data-protection-storage';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeRecommendations?: boolean;
}

interface ProtectedExportRows {
  events: TrackingEvent[];
  settings: DataProtectionSettings;
}

/**
 * Exports the locally minimized event representation and the P2 evidence-index
 * state. Export preparation reapplies the active P3 policy so callers cannot
 * accidentally serialize an older unsanitized in-memory event object.
 *
 * The legacy `pdf` identifier still produces plain text for compatibility.
 */
export class ExportService {
  private static sanitizeCSVValue(value: string): string {
    const sanitized = value.replace(/^[=+\-@]/, "'$&");
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  static async exportAsCSV(events: TrackingEvent[]): Promise<Blob> {
    const protectedRows = await this.prepareProtectedRows(events);
    const score = calculatePrivacyScore(protectedRows.events, true);
    const headers = [
      'Timestamp',
      'First Seen',
      'Last Seen',
      'Occurrences',
      'Source',
      'Page Domain',
      'Minimized Page URL',
      'Resource Domain',
      'Minimized Resource URL',
      'URL Retention Mode',
      'Query Stripped',
      'Fragment Stripped',
      'URL Credentials Stripped',
      'Redacted Path Segments',
      'Raw Details Removed',
      'Party Relationship',
      'Party Basis',
      'Party Confidence',
      'Attribution Basis',
      'Attribution Confidence',
      'Request Type',
      'Request Method',
      'Detector ID',
      'Detector Match Type',
      'Detector Rule',
      'Detector Confidence',
      'Minimized Detector Evidence',
      'Prototype Category Label',
      'Prototype Severity Label',
      'Minimized Description',
    ];
    const rows = protectedRows.events.map(event => {
      const context = event.context;
      const detector = event.detector;
      const protection = event.dataProtection;
      return [
        new Date(event.timestamp).toISOString(),
        new Date(event.firstSeenAt || event.timestamp).toISOString(),
        new Date(event.lastSeenAt || event.timestamp).toISOString(),
        String(getEventOccurrenceCount(event)),
        context?.source || 'legacy',
        getPageDomain(event),
        getPageUrl(event),
        getResourceDomain(event),
        getResourceUrl(event),
        protection?.urlRetentionMode || protectedRows.settings.urlRetentionMode,
        String(protection?.queryStripped === true),
        String(protection?.fragmentStripped === true),
        String(protection?.credentialsStripped === true),
        String(protection?.pathSegmentsRedacted || 0),
        String(protection?.rawDetailsRemoved === true),
        context?.party || 'unknown',
        context?.partyBasis || 'missing-context',
        context?.partyConfidence || 'low',
        context?.attributionBasis || 'unknown',
        context?.attributionConfidence || 'low',
        context?.requestType || '',
        context?.requestMethod || '',
        detector?.id || 'legacy-event',
        detector?.matchType || 'legacy',
        detector?.rule || '',
        detector?.confidence || 'low',
        detector?.evidence?.join(' | ') || '',
        event.trackerType,
        event.riskLevel,
        event.description,
      ]
        .map(value => this.sanitizeCSVValue(String(value)))
        .join(',');
    });
    const preamble = [
      '# Phantom Trail 0.1.0 P3 minimized evidence export',
      `# Local URL retention mode: ${protectedRows.settings.urlRetentionMode}`,
      `# Configured event retention: ${protectedRows.settings.retentionDays} days`,
      '# Query strings, fragments, URL credentials, and raw detector detail objects were removed before this export.',
      '# Identifier-like path segments are redacted when origin-and-path retention is enabled.',
      `# Evidence index status: ${score.status}`,
      `# Evidence index value: ${score.score ?? 'N/A'}`,
      `# Model band: ${score.grade}`,
      `# Evidence coverage confidence: ${score.confidence}`,
      `# Evidence units: ${score.breakdown.evidenceUnits}; qualifying rows: ${score.breakdown.qualifyingRows}; excluded rows: ${score.breakdown.excludedRows}`,
      '# N/A is not favorable and does not show that tracking was absent.',
      '# A row or model band does not prove collection, retention, sharing, sale, ownership, identity, intent, compliance, or website safety.',
      '# Downloaded files are outside Clear All Data and must be deleted separately.',
    ].join('\n');

    return new Blob([[preamble, headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
  }

  static async exportAsJSON(events: TrackingEvent[]): Promise<Blob> {
    const protectedRows = await this.prepareProtectedRows(events);
    const score = calculatePrivacyScore(protectedRows.events, true);
    const exportData = {
      format: 'phantom-trail-p3-minimized-evidence-export',
      eventSchemaVersion: 2,
      dataProtectionPolicyVersion: 1,
      productVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      localPolicy: {
        urlRetentionMode: protectedRows.settings.urlRetentionMode,
        retentionDays: protectedRows.settings.retentionDays,
        queryStringsRetained: false,
        fragmentsRetained: false,
        urlCredentialsRetained: false,
        rawDetectorDetailsRetained: false,
      },
      evidenceIndex: score,
      formulaDisclosure: {
        base: 100,
        unitGrouping:
          'third-party resources are grouped by page and resource domain; page API signals are grouped by page and detector',
        recurrence:
          'bounded logarithmic factor with a maximum of 1.20; request volume is not penalized linearly',
        unitPenaltyCap: 22,
        additionalDistinctDetectorFactor: 0.3,
        httpsBonus: false,
        globalRowCountPenalty: false,
        trustedSiteAdjustment: false,
        peerReputationAdjustment: false,
      },
      disclaimer:
        'The evidence index summarizes qualifying experimental detector evidence. N/A is not favorable. Attribution, party classification, detector rules, severity labels, and confidence can be incomplete or wrong. Nothing here proves collection, retention, sharing, sale, identity, ownership, intent, safety, or compliance.',
      deletionWarning:
        'This downloaded export is a separate file. Phantom Trail Clear All Data does not delete it.',
      recordedRowCount: protectedRows.events.length,
      recordedOccurrenceCount: protectedRows.events.reduce(
        (total, event) => total + getEventOccurrenceCount(event),
        0
      ),
      events: protectedRows.events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp).toISOString(),
        firstSeenAt: new Date(
          event.firstSeenAt || event.timestamp
        ).toISOString(),
        lastSeenAt: new Date(event.lastSeenAt || event.timestamp).toISOString(),
      })),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
  }

  /** Generate a plain-text summary; this is not a PDF document. */
  static async exportAsPDF(
    events: TrackingEvent[],
    suppliedScore: PrivacyScore
  ): Promise<Blob> {
    const protectedRows = await this.prepareProtectedRows(events);
    const score = calculatePrivacyScore(protectedRows.events, true);
    void suppliedScore;
    const generatedAt = new Date().toLocaleString();
    const routes = this.groupByRoute(protectedRows.events);
    const occurrenceCount = protectedRows.events.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );
    const indexValue = score.score === null ? 'N/A' : `${score.score}/100`;

    const report = `
PHANTOM TRAIL 0.1.0 - P3 MINIMIZED EVIDENCE EXPORT
Generated: ${generatedAt}
Recorded time range: ${this.getTimeRange(protectedRows.events)}

LOCAL DATA-PROTECTION POLICY
- URL retention mode: ${protectedRows.settings.urlRetentionMode}
- Event retention period: ${protectedRows.settings.retentionDays} days
- Query strings retained: no
- Fragments retained: no
- URL username/password credentials retained: no
- Raw serialized detector detail objects retained: no
- Identifier-like path segments: redacted when path retention is enabled

IMPORTANT LIMITS
- This file summarizes locally minimized detector evidence from an experimental extension.
- Page/resource attribution, first/third-party labels, rules, severity labels, and confidence can be incomplete or wrong.
- N/A means no score-qualified evidence units were available. It does not mean the page or data set is private or safe.
- A recorded event or model band does not prove collection, retention, sharing, sale, fingerprinting, attack, identity, ownership, intent, website safety, or legal non-compliance.
- This downloaded file is outside Clear All Data and must be deleted separately.

EXPERIMENTAL OBSERVED-EVIDENCE INDEX
- Status: ${score.status}
- Value: ${indexValue}
- Model band: ${score.grade}
- Evidence coverage confidence: ${score.confidence}
- Evidence units: ${score.breakdown.evidenceUnits}
- Unique third-party resource domains: ${score.breakdown.uniqueThirdPartyParties}
- Page-local API units: ${score.breakdown.pageApiUnits}
- Qualifying rows: ${score.breakdown.qualifyingRows}
- Excluded rows: ${score.breakdown.excludedRows}
- Applied evidence penalty: ${score.breakdown.appliedPenalty}
- HTTPS bonus: none
- Global row-count penalty: none

EXCLUDED ROWS BY REASON
${Object.entries(score.breakdown.excludedByReason)
  .filter(([, count]) => count > 0)
  .map(([reason, count]) => `- ${reason}: ${count}`)
  .join('\n') || '- none'}

SCORE CONTRIBUTIONS
${score.breakdown.contributions
  .map(
    contribution =>
      `- ${contribution.pageDomain} -> ${contribution.resourceDomain || contribution.detectorIds.join('+')}: ${contribution.appliedPenalty} points; kind=${contribution.kind}; source=${contribution.source}; occurrences=${contribution.occurrences}; detectors=${contribution.detectorIds.join(', ')}; high-quality=${contribution.highQuality}`
  )
  .join('\n') || '- none'}

RECORDED SIGNAL SUMMARY
- Stored rows: ${protectedRows.events.length}
- Aggregated occurrences: ${occurrenceCount}

ATTRIBUTED PAGE → RESOURCE ROUTES
${Object.entries(routes)
  .sort(([, first], [, second]) => second - first)
  .map(([route, count]) => `- ${route}: ${count} occurrence${count === 1 ? '' : 's'}`)
  .join('\n') || '- none'}

EVIDENCE REVIEW NOTES
${score.recommendations.map(note => `- ${note}`).join('\n') || '- none'}

DETAILED MINIMIZED EVENTS (FIRST 50)
${protectedRows.events
  .slice(0, 50)
  .map(event => {
    const context = event.context;
    const detector = event.detector;
    const protection = event.dataProtection;
    const page = getPageDomain(event) || 'unknown-page';
    const resource = getResourceDomain(event) || 'page-api';
    return `[${new Date(event.timestamp).toLocaleString()}] ${page} -> ${resource}; occurrences=${getEventOccurrenceCount(event)}; source=${context?.source || 'legacy'}; party=${context?.party || 'unknown'}; detector=${detector?.id || 'legacy-event'} / ${detector?.confidence || 'low'}; page URL=${getPageUrl(event)}; resource URL=${getResourceUrl(event)}; mode=${protection?.urlRetentionMode || protectedRows.settings.urlRetentionMode}; query-stripped=${protection?.queryStripped === true}; fragment-stripped=${protection?.fragmentStripped === true}; credentials-stripped=${protection?.credentialsStripped === true}; path-segments-redacted=${protection?.pathSegmentsRedacted || 0}; raw-details-removed=${protection?.rawDetailsRemoved === true}`;
  })
  .join('\n') || 'No recorded events.'}

${
  protectedRows.events.length > 50
    ? `Additional stored rows omitted: ${protectedRows.events.length - 50}`
    : ''
}

END OF P3 MINIMIZED EVIDENCE EXPORT
    `.trim();

    return new Blob([report], { type: 'text/plain;charset=utf-8;' });
  }

  static generateFilename(
    format: ExportFormat,
    dateRange?: { start: Date; end: Date }
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'pdf' ? 'txt' : format;

    if (dateRange) {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      return `phantom-trail-minimized-evidence-${startDate}-to-${endDate}.${extension}`;
    }

    return `phantom-trail-minimized-evidence-${timestamp}.${extension}`;
  }

  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  static async prepareExport(
    events: TrackingEvent[],
    privacyScore: PrivacyScore,
    options: ExportOptions
  ): Promise<{ blob: Blob; filename: string }> {
    let blob: Blob;

    switch (options.format) {
      case 'csv':
        blob = await this.exportAsCSV(events);
        break;
      case 'json':
        blob = await this.exportAsJSON(events);
        break;
      case 'pdf':
        blob = await this.exportAsPDF(events, privacyScore);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      blob,
      filename: this.generateFilename(options.format, options.dateRange),
    };
  }

  static async generateExport(
    events: TrackingEvent[],
    format: ExportFormat
  ): Promise<Blob> {
    switch (format) {
      case 'csv':
        return await this.exportAsCSV(events);
      case 'json':
        return await this.exportAsJSON(events);
      case 'pdf':
        return await this.exportAsPDF(
          events,
          calculatePrivacyScore(events, true)
        );
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /** @deprecated Use prepareExport and downloadBlob. */
  static async exportAndDownload(
    events: TrackingEvent[],
    privacyScore: PrivacyScore,
    options: ExportOptions
  ): Promise<void> {
    const { blob, filename } = await this.prepareExport(
      events,
      privacyScore,
      options
    );
    this.downloadBlob(blob, filename);
  }

  private static async prepareProtectedRows(
    events: TrackingEvent[]
  ): Promise<ProtectedExportRows> {
    const settings = await DataProtectionStorage.getSettings();
    const normalized = events.map(normalizeTrackingEvent);
    return {
      settings,
      events: sanitizeTrackingEventsForStorage(normalized, settings).events,
    };
  }

  private static getTimeRange(events: TrackingEvent[]): string {
    if (events.length === 0) return 'no recorded events';

    const { min, max } = events.reduce(
      (range, event) => ({
        min: Math.min(range.min, event.firstSeenAt || event.timestamp),
        max: Math.max(range.max, event.lastSeenAt || event.timestamp),
      }),
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    );

    return `${new Date(min).toLocaleString()} - ${new Date(max).toLocaleString()}`;
  }

  private static groupByRoute(
    events: TrackingEvent[]
  ): Record<string, number> {
    return events.reduce<Record<string, number>>((groups, event) => {
      const page = getPageDomain(event) || 'unknown-page';
      const resource = getResourceDomain(event) || 'page-api';
      const route = `${page} -> ${resource}`;
      groups[route] =
        (groups[route] || 0) + getEventOccurrenceCount(event);
      return groups;
    }, {});
  }
}
