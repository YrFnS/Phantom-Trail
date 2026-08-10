import type { TrackingEvent, PrivacyScore } from './types';
import { calculatePrivacyScore } from './privacy-score';

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
 * Exports recorded prototype detector events.
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
      'Event Domain Label',
      'Prototype Category Label',
      'Prototype Severity Label',
      'Recorded Description',
      'Stored URL',
    ];

    const rows = events.map(event =>
      [
        new Date(event.timestamp).toISOString(),
        event.domain,
        event.trackerType,
        event.riskLevel,
        event.description,
        event.url,
      ]
        .map(value => this.sanitizeCSVValue(String(value)))
        .join(',')
    );

    const preamble = [
      '# Phantom Trail 0.1.0 experimental detector-signal export',
      '# Rows can contain false positives, false negatives, duplicates, attribution errors, and full stored URLs.',
      '# A row does not prove data collection, sharing, sale, tracking intent, or website safety.',
    ].join('\n');

    return new Blob([[preamble, headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
  }

  static async exportAsJSON(events: TrackingEvent[]): Promise<Blob> {
    const exportData = {
      format: 'phantom-trail-experimental-signal-export',
      version: '0.1.0',
      exportedAt: new Date().toISOString(),
      disclaimer:
        'Recorded detector events can be wrong or misattributed and do not prove data collection, sharing, sale, tracking intent, website safety, or legal compliance.',
      dataWarning:
        'Stored URL values can include paths, query strings, or fragments. Review this file before sharing it.',
      recordedEventCount: events.length,
      events: events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp).toISOString(),
      })),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
  }

  /**
   * Generate a plain-text summary. This is intentionally not represented as a
   * PDF document in the filename or UI.
   */
  static async exportAsPDF(
    events: TrackingEvent[],
    heuristic: PrivacyScore
  ): Promise<Blob> {
    const generatedAt = new Date().toLocaleString();
    const timeRange = this.getTimeRange(events);
    const domainStats = this.groupByDomain(events);

    const report = `
PHANTOM TRAIL 0.1.0 - EXPERIMENTAL SIGNAL EXPORT
Generated: ${generatedAt}
Recorded time range: ${timeRange}

IMPORTANT LIMITS
- This file summarizes stored detector events from an experimental extension.
- Events can include false positives, false negatives, duplicates, and incorrect page/resource attribution.
- A recorded event does not prove collection, sharing, sale, fingerprinting, attack, intent, ownership, website safety, or legal non-compliance.
- Stored URLs can include sensitive paths, query strings, or fragments. Review this file before sharing it.

EXPERIMENTAL HEURISTIC
- Value: ${heuristic.score}/100
- Letter label: ${heuristic.grade}
- This value is produced by hand-written penalties and is not an independently validated privacy rating.

RECORDED SIGNAL SUMMARY
- Total detector events: ${heuristic.breakdown.totalTrackers}
- Critical prototype labels: ${heuristic.breakdown.criticalRisk}
- High prototype labels (including critical): ${heuristic.breakdown.highRisk}
- Medium prototype labels: ${heuristic.breakdown.mediumRisk}
- Low prototype labels: ${heuristic.breakdown.lowRisk}
- Context marked HTTPS: ${heuristic.breakdown.httpsBonus ? 'yes' : 'no'}
- More-than-ten-events penalty applied: ${
      heuristic.breakdown.excessiveTrackingPenalty ? 'yes' : 'no'
    }

EVENT-DOMAIN LABEL COUNTS
${Object.entries(domainStats)
  .sort(([, first], [, second]) => second.count - first.count)
  .map(
    ([domain, stats]) =>
      `- ${domain}: ${stats.count} recorded event${stats.count === 1 ? '' : 's'}`
  )
  .join('\n') || '- none'}

GENERATED REVIEW NOTES
${
  heuristic.recommendations.length > 0
    ? heuristic.recommendations.map(note => `- ${note}`).join('\n')
    : '- none'
}

DETAILED RECORDED EVENTS (FIRST 50)
${events
  .slice(0, 50)
  .map(
    event =>
      `[${new Date(event.timestamp).toLocaleString()}] domain label=${
        event.domain
      }; category label=${event.trackerType}; severity label=${
        event.riskLevel
      }; description=${event.description}; stored URL=${event.url}`
  )
  .join('\n') || 'No recorded events.'}

${
  events.length > 50
    ? `Additional recorded events omitted from this text summary: ${events.length - 50}`
    : ''
}

END OF EXPERIMENTAL SIGNAL EXPORT
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
      return `phantom-trail-signals-${startDate}-to-${endDate}.${extension}`;
    }

    return `phantom-trail-signals-${timestamp}.${extension}`;
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
        min: Math.min(range.min, event.timestamp),
        max: Math.max(range.max, event.timestamp),
      }),
      { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    );

    return `${new Date(min).toLocaleString()} - ${new Date(max).toLocaleString()}`;
  }

  private static groupByDomain(
    events: TrackingEvent[]
  ): Record<string, { count: number; riskLevels: string[] }> {
    return events.reduce(
      (groups, event) => {
        const domain = event.domain || 'unknown';
        if (!groups[domain]) {
          groups[domain] = { count: 0, riskLevels: [] };
        }
        groups[domain].count++;
        groups[domain].riskLevels.push(event.riskLevel);
        return groups;
      },
      {} as Record<string, { count: number; riskLevels: string[] }>
    );
  }
}
