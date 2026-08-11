import type { NotificationSettings, TrackingEvent } from './types.ts';
import { qualifyEvidenceEvent } from './evidence-score-policy.mts';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  criticalOnly: true,
  dailySummary: false,
  weeklyReport: false,
  quietHours: { start: '22:00', end: '08:00' },
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

export function normalizeNotificationSettings(
  value: unknown
): NotificationSettings {
  const candidate =
    value && typeof value === 'object'
      ? (value as Partial<NotificationSettings>)
      : {};
  const quietHours =
    candidate.quietHours && typeof candidate.quietHours === 'object'
      ? candidate.quietHours
      : DEFAULT_NOTIFICATION_SETTINGS.quietHours;

  return {
    enabled: candidate.enabled === true,
    criticalOnly: candidate.criticalOnly !== false,
    dailySummary: candidate.dailySummary === true,
    // Weekly notification delivery is not part of P4. Preserve the compatibility
    // field as false so old settings cannot silently activate a dead workflow.
    weeklyReport: false,
    quietHours: {
      start: normalizeTime(
        quietHours.start,
        DEFAULT_NOTIFICATION_SETTINGS.quietHours.start
      ),
      end: normalizeTime(
        quietHours.end,
        DEFAULT_NOTIFICATION_SETTINGS.quietHours.end
      ),
    },
  };
}

export function isWithinQuietHours(
  settings: NotificationSettings,
  date = new Date()
): boolean {
  const normalized = normalizeNotificationSettings(settings);
  const current = date.getHours() * 60 + date.getMinutes();
  const start = timeToMinutes(normalized.quietHours.start);
  const end = timeToMinutes(normalized.quietHours.end);

  if (start === end) return false;
  return start > end
    ? current >= start || current < end
    : current >= start && current < end;
}

export function shouldNotifyForEvent(
  event: TrackingEvent,
  settings: NotificationSettings
): boolean {
  const normalized = normalizeNotificationSettings(settings);
  if (!normalized.enabled) return false;
  if (
    event.riskLevel !== 'critical' &&
    (normalized.criticalOnly || event.riskLevel !== 'high')
  ) {
    return false;
  }

  return 'candidate' in qualifyEvidenceEvent(event, 'dataset', '');
}

function normalizeTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
    ? value
    : fallback;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
