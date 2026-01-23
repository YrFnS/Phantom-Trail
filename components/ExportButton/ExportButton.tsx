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
    description: 'Spreadsheet format for Excel/Google Sheets',
    icon: '📊',
  },
  {
    format: 'json',
    label: 'JSON',
    description: 'Structured data format for developers',
    icon: '🔧',
  },
  {
    format: 'pdf',
    label: 'Report',
    description: 'Human-readable summary report',
    icon: '📄',
  },
];

/**
 * Export Button Component
 */
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
                start: new Date(Math.min(...events.map(e => e.timestamp))),
                end: new Date(Math.max(...events.map(e => e.timestamp))),
              }
            : undefined,
      };

      const { blob, filename } = await ExportService.prepareExport(
        events,
        privacyScore,
        options
      );
      ExportService.downloadBlob(blob, filename);

      setExportStatus({
        type: 'success',
        message: `Successfully exported ${events.length} events as ${format.toUpperCase()}`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = events.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Main Export Button */}
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
          hasData ? 'Export tracking data (Ctrl+Shift+E)' : 'No data to export'
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

      {/* Dropdown Menu */}
      {isOpen && hasData && (
        <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-elevated)] rounded-md shadow-lg border border-[var(--border-primary)] z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs text-[var(--text-tertiary)] border-b border-[var(--border-primary)]">
              Export {events.length} tracking event
              {events.length !== 1 ? 's' : ''}
            </div>

            {EXPORT_FORMATS.map(option => (
              <button
                key={option.format}
                onClick={() => handleExport(option.format)}
                disabled={isExporting}
                className={`
                  w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)]
                  transition-colors duration-150
                  ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
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
      )}

      {/* Loading Indicator */}
      {isExporting && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-elevated)] bg-opacity-75 rounded-md">
          <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent-primary)] border-t-transparent"></div>
            <span>Exporting...</span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {exportStatus.type && (
        <div
          className={`
          absolute top-full left-0 right-0 mt-2 p-3 rounded-md text-sm z-40
          ${
            exportStatus.type === 'success'
              ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30'
              : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/30'
          }
        `}
        >
          <div className="flex items-center">
            <span className="mr-2">
              {exportStatus.type === 'success' ? '✅' : '❌'}
            </span>
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

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
