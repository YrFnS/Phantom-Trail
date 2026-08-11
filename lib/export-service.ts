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
 * Exports attributed prototype detector events.
 * The legacy `pdf` format identifier produces plain text for compatibility.
 */
export class ExportService {
  private static sanitizeCSVValue(value: string): string {
    const sanitized = value.replace(/^[=+\-@]/, "'$&");
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  static async exportAsCSV(events: TrackingEvent[]): Promise<Blob> {
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
      '# Phantom Trail 0.1.0 P1 attributed detector-signal export',
      '# Page and resource attribution, party labels, detector evidence, and confidence can still be incomplete or wrong.',
      '# A row does not prove collection, retention, sharing, sale, ownership, identity, tracking intent, or website safety.',
      '# URL fields can contain sensitive paths, query strings, or fragments. Review this file before sharing it.',
    ].join('\n');

    return new Blob([[preamble, headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
  }

  static async exportAsJSON(events: TrackingEvent[]): Promise<Blob> {
    const normalizedEvents = events.map(normalizeTrackingEvent);
    const exportData = {
      format: 'phantom-trail-attributed-signal-export',
      schemaVersion: 2,
      productVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      disclaimer:
        'Page/resource attribution, party classification, detector rules, and severity labels are experimental and can be incomplete or wrong. They do not prove collection, retention, sharing, sale, identity, ownership, intent, safety, or compliance.',
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
    heuristic: PrivacyScore
  ): Promise<Blob> {
    const normalizedEvents = events.map(normalizeTrackingEvent);
    const generatedAt = new Date().toLocaleString();
    const timeRange = this.getTimeRange(normalizedEvents);
    const routes = this.groupByRoute(normalizedEvents);
    const occurrenceCount = normalizedEvents.reduce(
      (total, event) => total + getEventOccurrenceCount(event),
      0
    );

    const report = `
PHANTOM TRAIL 0.1.0 - P1 ATTRIBUTED SIGNAL EXPORT
Generated: ${generatedAt}
Recorded time range: ${timeRange}

IMPORTANT LIMITS
- This file summarizes stored detector events from an experimental extension.
- Page/resource attribution, first/third-party labels, rule matches, and confidence can be incomplete or wrong.
- A recorded event does not prove collection, retention, sharing, sale, fingerprinting, attack, identity, ownership, intent, website safety, or legal non-compliance.
- URL fields can include sensitive paths, query strings, or fragments. Review this file before sharing it.

EXPERIMENTAL HEURISTIC
- Value: ${heuristic.score}/100
- Letter label: ${heuristic.grade}
- This value is produced by hand-written penalties and is not an independently validated privacy rating.

RECORDED SIGNAL SUMMARY
- Stored rows: ${normalizedEvents.length}
- Aggregated occurrences: ${occurrenceCount}
- Critical prototype labels: ${heuristic.breakdown.criticalRisk}
- High prototype labels (including critical): ${heuristic.breakdown.highRisk}
- Medium prototype labels: ${heuristic.breakdown.mediumRisk}
- Low prototype labels: ${heuristic.breakdown.lowRisk}

ATTRIBUTED PAGE → RESOURCE ROUTES
${Object.entries(routes)
  .sort(([, first], [, second]) => second - first)
  .map(([route, count]) => `- ${route}: ${count} occurrence${count === 1 ? '' : 's'}`)
  .join('\n') || '- none'}

GENERATED REVIEW NOTES
${
  heuristic.recommendations.length > 0
    ? heuristic.recommendations.map(note => `- ${note}`).join('\n')
    : '- none'
}

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

END OF ATTRIBUTED SIGNAL EXPORT
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
      return `phantom-trail-attributed-signals-${startDate}-to-${endDate}.${extension}`;
    }

    return `phantom-trail-attributed-signals-${timestamp}.${extension}`;
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
