import type { TrackingEvent, PrivacyScore } from './types';
import { calculatePrivacyScore } from './privacy-score';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getPageUrl,
  getResourceDomain,
  getResourceUrl,
  normalizeTrackingEvent,
} from './event-attribution.mts';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeRecommendations?: boolean;
}

/**
 * Exports attributed detector evidence and the P2 evidence-index state.
 * The legacy `pdf` identifier still produces plain text for compatibility.
 */
export class ExportService {
  private static sanitizeCSVValue(value: string): string {
    const sanitized = value.replace(/^[=+\-@]/, "'$&");
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  static async exportAsCSV(events: TrackingEvent[]): Promise<Blob> {
    const score = calculatePrivacyScore(events, true);
    const headers = [
      'Timestamp',
      'First Seen',
      'Last Seen',
      'Occurrences',
      'Source',
      'Page Domain',
      'Page URL',
      'Resource Domain',
      'Resource URL',
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
      'Detector Evidence',
      'Prototype Category Label',
      'Prototype Severity Label',
      'Recorded Description',
    ];
    const normalizedEvents = events.map(normalizeTrackingEvent);
    const rows = normalizedEvents.map(event => {
      const context = event.context;
      const detector = event.detector;
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
      '# Phantom Trail 0.1.0 P2 attributed evidence export',
      `# Evidence index status: ${score.status}`,
      `# Evidence index value: ${score.score ?? 'N/A'}`,
      `# Model band: ${score.grade}`,
      `# Evidence coverage confidence: ${score.confidence}`,
      `# Evidence units: ${score.breakdown.evidenceUnits}; qualifying rows: ${score.breakdown.qualifyingRows}; excluded rows: ${score.breakdown.excludedRows}`,
      `# Applied evidence penalty: ${score.breakdown.appliedPenalty}; HTTPS bonus: none; global row-count penalty: none`,
      '# Page/resource attribution, party labels, detector evidence, and confidence can still be incomplete or wrong.',
      '# N/A is not favorable and does not show that tracking was absent.',
      '# A row or model band does not prove collection, retention, sharing, sale, ownership, identity, tracking intent, compliance, or website safety.',
      '# URL fields can contain sensitive paths, query strings, or fragments. Review this file before sharing it.',
    ].join('\n');

    return new Blob([[preamble, headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
  }

  static async exportAsJSON(events: TrackingEvent[]): Promise<Blob> {
    const normalizedEvents = events.map(normalizeTrackingEvent);
    const score = calculatePrivacyScore(normalizedEvents, true);
    const exportData = {
      format: 'phantom-trail-p2-attributed-evidence-export',
      schemaVersion: 2,
      productVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
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
      dataWarning:
        'Page and resource URL values can include paths, query strings, or fragments. Review this file before sharing it.',
      recordedRowCount: normalizedEvents.length,
      recordedOccurrenceCount: normalizedEvents.reduce(
        (total, event) => total + getEventOccurrenceCount(event),
        0
      ),
      events: normalizedEvents.map(event => ({
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
    const normalizedEvents = events.map(normalizeTrackingEvent);
    // Recompute from exported rows so an old or mismatched supplied object cannot
    // create a score that is inconsistent with the export payload.
    const score = calculatePrivacyScore(normalizedEvents, true);
    void suppliedScore;
    const generatedAt = new Date().toLocaleString();
    const routes = this.groupByRoute(normalizedEvents);
    const occurrenceCount = normalizedEvents.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );
    const indexValue = score.score === null ? 'N/A' : `${score.score}/100`;

    const report = `
PHANTOM TRAIL 0.1.0 - P2 ATTRIBUTED EVIDENCE EXPORT
Generated: ${generatedAt}
Recorded time range: ${this.getTimeRange(normalizedEvents)}

IMPORTANT LIMITS
- This file summarizes stored detector evidence from an experimental extension.
- Page/resource attribution, first/third-party labels, rules, severity labels, and confidence can be incomplete or wrong.
- N/A means no score-qualified evidence units were available. It does not mean the page or data set is private or safe.
- A recorded event or model band does not prove collection, retention, sharing, sale, fingerprinting, attack, identity, ownership, intent, website safety, or legal non-compliance.
- URL fields can include sensitive paths, query strings, or fragments. Review this file before sharing it.

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
- Qualifying occurrences: ${score.breakdown.qualifyingOccurrences}
- Raw evidence penalty: ${score.breakdown.rawPenalty}
- Applied evidence penalty: ${score.breakdown.appliedPenalty}
- HTTPS bonus: none
- Global row-count penalty: none

FORMULA SUMMARY
- Unique third-party parties and page-local API detector units drive penalties, not raw request rows.
- Detector, attribution, party, and source confidence factors weight contributions.
- Repeated occurrences use a bounded logarithmic factor capped at 1.20.
- The strongest detector in a unit counts in full; additional distinct detectors count at 30%.
- Each evidence unit is capped at 22 penalty points.

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
- Stored rows: ${normalizedEvents.length}
- Aggregated occurrences: ${occurrenceCount}
- Critical prototype labels: ${score.breakdown.criticalRisk}
- High prototype labels (including critical): ${score.breakdown.highRisk}
- Medium prototype labels: ${score.breakdown.mediumRisk}
- Low prototype labels: ${score.breakdown.lowRisk}

ATTRIBUTED PAGE → RESOURCE ROUTES
${Object.entries(routes)
  .sort(([, first], [, second]) => second - first)
  .map(([route, count]) => `- ${route}: ${count} occurrence${count === 1 ? '' : 's'}`)
  .join('\n') || '- none'}

EVIDENCE REVIEW NOTES
${score.recommendations.map(note => `- ${note}`).join('\n') || '- none'}

DETAILED RECORDED EVENTS (FIRST 50)
${normalizedEvents
  .slice(0, 50)
  .map(event => {
    const context = event.context;
    const detector = event.detector;
    const page = getPageDomain(event) || 'unknown-page';
    const resource = getResourceDomain(event) || 'page-api';
    return `[${new Date(event.timestamp).toLocaleString()}] ${page} -> ${resource}; occurrences=${getEventOccurrenceCount(event)}; source=${context?.source || 'legacy'}; party=${context?.party || 'unknown'} (${context?.partyBasis || 'missing-context'}, ${context?.partyConfidence || 'low'}); attribution=${context?.attributionBasis || 'unknown'} (${context?.attributionConfidence || 'low'}); detector=${detector?.id || 'legacy-event'} / ${detector?.matchType || 'legacy'} / ${detector?.confidence || 'low'}; category=${event.trackerType}; severity=${event.riskLevel}; description=${event.description}; page URL=${getPageUrl(event)}; resource URL=${getResourceUrl(event)}`;
  })
  .join('\n') || 'No recorded events.'}

${
  normalizedEvents.length > 50
    ? `Additional stored rows omitted: ${normalizedEvents.length - 50}`
    : ''
}

END OF P2 ATTRIBUTED EVIDENCE EXPORT
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
      return `phantom-trail-evidence-${startDate}-to-${endDate}.${extension}`;
    }

    return `phantom-trail-evidence-${timestamp}.${extension}`;
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
