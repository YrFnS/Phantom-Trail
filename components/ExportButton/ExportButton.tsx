import { useState } from 'react';
import { ExportService } from '../../lib/export-service';
import type {
  ExportButtonProps,
  ExportFormatOption,
} from './ExportButton.types';
import type { ExportFormat } from '../../lib/export-service';

const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    format: 'csv',
    label: 'CSV',
    description: 'Recorded event rows for spreadsheet software',
    icon: '▦',
  },
  {
    format: 'json',
    label: 'JSON',
    description: 'Structured export of the recorded event objects',
    icon: '{}',
  },
  {
    format: 'pdf',
    label: 'Plain-text report',
    description: 'Downloads a .txt summary; this is not a PDF document',
    icon: '≡',
  },
];

export function ExportButton({
  events,
  privacyScore,
  className = '',
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportStatus({ type: null, message: '' });

    try {
      const options = {
        format,
        dateRange:
          events.length > 0
            ? {
                start: new Date(
                  Math.min(...events.map(event => event.timestamp))
                ),
                end: new Date(
                  Math.max(...events.map(event => event.timestamp))
                ),
              }
            : undefined,
      };

      const { blob, filename } = await ExportService.prepareExport(
        events,
        privacyScore,
        options
      );
      ExportService.downloadBlob(blob, filename);

      const formatLabel =
        EXPORT_FORMATS.find(option => option.format === format)?.label || format;
      setExportStatus({
        type: 'success',
        message: `Exported ${events.length} recorded events as ${formatLabel} (${filename})`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus({
        type: 'error',
        message: `Export failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = events.length > 0;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !hasData}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
          transition-all duration-200
          ${
            hasData && !disabled
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)] hover:shadow-[0_0_15px_rgba(188,19,254,0.4)]'
              : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border-primary)]'
          }
        `}
        title={
          hasData
            ? 'Export recorded detector data; exports can contain full stored URLs'
            : 'No recorded data to export'
        }
      >
        <svg
          className="w-4 h-4 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <span className="ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && hasData && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-elevated)] rounded-md shadow-lg border border-[var(--border-primary)] z-50">
            <div className="py-1">
              <div className="px-4 py-2 border-b border-[var(--border-primary)]">
                <div className="text-xs text-[var(--text-secondary)]">
                  Export {events.length} recorded event
                  {events.length === 1 ? '' : 's'}
                </div>
                <div className="text-[10px] text-[var(--warning)] mt-1 leading-relaxed">
                  CSV and JSON include stored event URLs and descriptions. Review
                  the file before sharing it.
                </div>
              </div>

              {EXPORT_FORMATS.map(option => (
                <button
                  key={option.format}
                  onClick={() => void handleExport(option.format)}
                  disabled={isExporting}
                  className={`w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors duration-150 ${
                    isExporting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {option.label}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {isExporting && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-elevated)] bg-opacity-75 rounded-md z-50">
          <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent-primary)] border-t-transparent" />
            <span>Preparing local export...</span>
          </div>
        </div>
      )}

      {exportStatus.type && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-md text-sm z-40 ${
            exportStatus.type === 'success'
              ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30'
              : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/30'
          }`}
        >
          <div className="flex items-center">
            <span>{exportStatus.message}</span>
            <button
              onClick={() => setExportStatus({ type: null, message: '' })}
              className="ml-auto text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
