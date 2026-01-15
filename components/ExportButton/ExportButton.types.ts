import type { ExportFormat } from '../../lib/export-service';
import type { TrackingEvent, PrivacyScore } from '../../lib/types';

export interface ExportButtonProps {
  events: TrackingEvent[];
  privacyScore: PrivacyScore;
  className?: string;
  disabled?: boolean;
}

export interface ExportDropdownProps extends ExportButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onExport: (format: ExportFormat) => void;
  isExporting: boolean;
}

export interface ExportFormatOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
}
