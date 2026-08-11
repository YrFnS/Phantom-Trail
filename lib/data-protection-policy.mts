import type {
  DataProtectionSettings,
  TrackingEvent,
  TrackingEventDataProtection,
  UrlRetentionMode,
} from './types.ts';

export const DATA_PROTECTION_POLICY_VERSION = 1 as const;
export const ALLOWED_RETENTION_DAYS = [1, 7, 14, 30] as const;
export const MINIMIZED_DETAILS_NOTICE =
  'Raw detector detail removed before local storage by the Phantom Trail data-protection policy.';

export const DEFAULT_DATA_PROTECTION_SETTINGS: DataProtectionSettings = {
  schemaVersion: DATA_PROTECTION_POLICY_VERSION,
  urlRetentionMode: 'origin-only',
  retentionDays: 7,
  rememberOpenRouterKey: false,
  aiOutboundMode: 'counts-only',
};

export interface SanitizedUrlResult {
  value: string;
  queryStripped: boolean;
  fragmentStripped: boolean;
  credentialsStripped: boolean;
  pathSegmentsRedacted: number;
}

export interface EventSanitizationResult {
  event: TrackingEvent;
  changed: boolean;
}

const URL_PATTERN = /https?:\/\/[^\s<>'"`]+/giu;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LONG_HEX_PATTERN = /^[0-9a-f]{16,}$/iu;
const LONG_NUMBER_PATTERN = /^\d{4,}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,}$/u;
const JWT_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/u;
const INLINE_EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const INLINE_UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const INLINE_LONG_HEX_PATTERN = /\b[0-9a-f]{16,}\b/giu;
const INLINE_LONG_NUMBER_PATTERN = /\b\d{6,}\b/gu;
const INLINE_SECRET_ASSIGNMENT_PATTERN =
  /\b(token|secret|session|auth|key)=([^\s&#,;]+)/giu;

export function normalizeDataProtectionSettings(
  value: unknown
): DataProtectionSettings {
  const candidate =
    value && typeof value === 'object'
      ? (value as Partial<DataProtectionSettings>)
      : {};
  const retentionDays = ALLOWED_RETENTION_DAYS.includes(
    candidate.retentionDays as (typeof ALLOWED_RETENTION_DAYS)[number]
  )
    ? (candidate.retentionDays as DataProtectionSettings['retentionDays'])
    : DEFAULT_DATA_PROTECTION_SETTINGS.retentionDays;

  return {
    schemaVersion: DATA_PROTECTION_POLICY_VERSION,
    urlRetentionMode:
      candidate.urlRetentionMode === 'origin-and-path'
        ? 'origin-and-path'
        : 'origin-only',
    retentionDays,
    rememberOpenRouterKey: candidate.rememberOpenRouterKey === true,
    aiOutboundMode:
      candidate.aiOutboundMode === 'include-domain-labels'
        ? 'include-domain-labels'
        : 'counts-only',
  };
}

export function sanitizeUrlForStorage(
  input: string | undefined,
  mode: UrlRetentionMode
): SanitizedUrlResult {
  if (!input) return emptySanitizedUrl();

  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return emptySanitizedUrl();
    }

    const queryStripped = Boolean(parsed.search);
    const fragmentStripped = Boolean(parsed.hash);
    const credentialsStripped = Boolean(parsed.username || parsed.password);
    const sanitizedPath =
      mode === 'origin-and-path'
        ? sanitizePathname(parsed.pathname)
        : { pathname: '/', redacted: countNonEmptySegments(parsed.pathname) };

    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = sanitizedPath.pathname;

    return {
      value: parsed.toString(),
      queryStripped,
      fragmentStripped,
      credentialsStripped,
      pathSegmentsRedacted: sanitizedPath.redacted,
    };
  } catch {
    const queryIndex = input.indexOf('?');
    const fragmentIndex = input.indexOf('#');
    const firstCut = [queryIndex, fragmentIndex]
      .filter(index => index >= 0)
      .reduce((minimum, index) => Math.min(minimum, index), input.length);
    const stripped = input.slice(0, firstCut);

    return {
      value: mode === 'origin-and-path' ? stripped.slice(0, 256) : '',
      queryStripped: queryIndex >= 0,
      fragmentStripped: fragmentIndex >= 0,
      credentialsStripped: /:\/\/[^/@\s]+@/u.test(input),
      pathSegmentsRedacted: 0,
    };
  }
}

export function sanitizeTextForStorage(
  value: string | undefined,
  mode: UrlRetentionMode,
  maximumLength = 600
): string {
  if (!value) return '';

  const urlSanitized = value.replace(URL_PATTERN, match => {
    const trailing = match.match(/[),.;!?]+$/u)?.[0] || '';
    const urlValue = trailing ? match.slice(0, -trailing.length) : match;
    return `${sanitizeUrlForStorage(urlValue, mode).value || '[url removed]'}${trailing}`;
  });

  return redactSensitiveTextTokens(urlSanitized).slice(0, maximumLength);
}

export function sanitizeTrackingEventForStorage(
  event: TrackingEvent,
  settings: DataProtectionSettings,
  now = Date.now()
): EventSanitizationResult {
  const mode = settings.urlRetentionMode;
  const page = sanitizeUrlForStorage(event.context?.pageUrl, mode);
  const resource = sanitizeUrlForStorage(event.context?.resourceUrl, mode);
  const initiator = sanitizeUrlForStorage(event.context?.initiator, 'origin-only');
  const compatibilityUrl = sanitizeUrlForStorage(
    event.context?.resourceUrl || event.context?.pageUrl || event.url,
    mode
  );

  const rawDetailsRemoved = Boolean(
    event.inPageTracking?.details &&
      event.inPageTracking.details !== MINIMIZED_DETAILS_NOTICE
  );

  const sanitizedEvent: TrackingEvent = {
    ...event,
    url: compatibilityUrl.value,
    description: sanitizeTextForStorage(event.description, mode),
    context: event.context
      ? {
          ...event.context,
          pageUrl: page.value,
          resourceUrl: event.context.resourceUrl ? resource.value : undefined,
          initiator: event.context.initiator ? initiator.value : undefined,
        }
      : undefined,
    detector: event.detector
      ? {
          ...event.detector,
          rule: event.detector.rule
            ? sanitizeTextForStorage(event.detector.rule, mode, 160)
            : undefined,
          evidence: event.detector.evidence
            .slice(0, 10)
            .map(item => sanitizeTextForStorage(item, mode, 300)),
        }
      : undefined,
    inPageTracking: event.inPageTracking
      ? {
          ...event.inPageTracking,
          details: MINIMIZED_DETAILS_NOTICE,
          apiCalls: event.inPageTracking.apiCalls
            ?.slice(0, 10)
            .map(sanitizeApiCallLabel)
            .filter(Boolean),
        }
      : undefined,
  };

  // Redaction metadata is cumulative. Once a row records that material was
  // removed, a later idempotent pass over the already-minimized value must not
  // erase that fact or rewrite the row indefinitely.
  const metadataWithoutTimestamp: Omit<
    TrackingEventDataProtection,
    'sanitizedAt'
  > = {
    policyVersion: DATA_PROTECTION_POLICY_VERSION,
    urlRetentionMode: mode,
    queryStripped:
      event.dataProtection?.queryStripped === true ||
      page.queryStripped ||
      resource.queryStripped ||
      initiator.queryStripped ||
      compatibilityUrl.queryStripped,
    fragmentStripped:
      event.dataProtection?.fragmentStripped === true ||
      page.fragmentStripped ||
      resource.fragmentStripped ||
      initiator.fragmentStripped ||
      compatibilityUrl.fragmentStripped,
    credentialsStripped:
      event.dataProtection?.credentialsStripped === true ||
      page.credentialsStripped ||
      resource.credentialsStripped ||
      initiator.credentialsStripped ||
      compatibilityUrl.credentialsStripped,
    pathSegmentsRedacted: Math.max(
      event.dataProtection?.pathSegmentsRedacted || 0,
      page.pathSegmentsRedacted,
      resource.pathSegmentsRedacted,
      compatibilityUrl.pathSegmentsRedacted
    ),
    rawDetailsRemoved:
      rawDetailsRemoved || event.dataProtection?.rawDetailsRemoved === true,
  };

  const previousComparable = JSON.stringify({
    ...event,
    dataProtection: undefined,
  });
  const nextComparable = JSON.stringify({
    ...sanitizedEvent,
    dataProtection: undefined,
  });
  const metadataChanged = !protectionMetadataMatches(
    event.dataProtection,
    metadataWithoutTimestamp
  );
  const changed = previousComparable !== nextComparable || metadataChanged;

  sanitizedEvent.dataProtection = {
    ...metadataWithoutTimestamp,
    sanitizedAt:
      !changed && event.dataProtection?.sanitizedAt
        ? event.dataProtection.sanitizedAt
        : now,
  };

  return { event: sanitizedEvent, changed };
}

export function sanitizeTrackingEventsForStorage(
  events: TrackingEvent[],
  settings: DataProtectionSettings,
  now = Date.now()
): { events: TrackingEvent[]; changedRows: number } {
  let changedRows = 0;
  const sanitized = events.map(event => {
    const result = sanitizeTrackingEventForStorage(event, settings, now);
    if (result.changed) changedRows += 1;
    return result.event;
  });
  return { events: sanitized, changedRows };
}

export function eventContainsForbiddenUrlMaterial(event: TrackingEvent): boolean {
  const serialized = JSON.stringify(event);
  return (
    /https?:\/\/[^\s"']+[?#][^\s"']*/iu.test(serialized) ||
    /https?:\/\/[^/@\s"']+@/iu.test(serialized) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(serialized) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu.test(
      serialized
    ) ||
    /\b(token|secret|session|auth|key)=([^\s&#,;]+)/iu.test(serialized) ||
    Boolean(
      event.inPageTracking?.details &&
        event.inPageTracking.details !== MINIMIZED_DETAILS_NOTICE
    )
  );
}

function redactSensitiveTextTokens(value: string): string {
  return value
    .replace(INLINE_EMAIL_PATTERN, ':redacted')
    .replace(INLINE_UUID_PATTERN, ':redacted')
    .replace(INLINE_LONG_HEX_PATTERN, ':redacted')
    .replace(INLINE_LONG_NUMBER_PATTERN, ':redacted')
    .replace(INLINE_SECRET_ASSIGNMENT_PATTERN, '$1=:redacted');
}

function sanitizePathname(pathname: string): {
  pathname: string;
  redacted: number;
} {
  const segments = pathname.split('/');
  let redacted = 0;
  const sanitizedSegments = segments.map(segment => {
    if (!segment) return '';
    const decoded = safeDecode(segment);
    if (isSensitivePathSegment(decoded)) {
      redacted += 1;
      return ':redacted';
    }
    return segment.slice(0, 80);
  });
  const normalized = sanitizedSegments.join('/') || '/';
  return {
    pathname: normalized.startsWith('/') ? normalized : `/${normalized}`,
    redacted,
  };
}

function isSensitivePathSegment(segment: string): boolean {
  return (
    segment.length > 80 ||
    EMAIL_PATTERN.test(segment) ||
    UUID_PATTERN.test(segment) ||
    LONG_HEX_PATTERN.test(segment) ||
    LONG_NUMBER_PATTERN.test(segment) ||
    TOKEN_PATTERN.test(segment) ||
    JWT_SEGMENT_PATTERN.test(segment) ||
    /(?:token|secret|session|auth|key)[=_-]/iu.test(segment)
  );
}

function sanitizeApiCallLabel(value: string): string {
  const withoutUrls = sanitizeTextForStorage(value, 'origin-only', 120);
  return withoutUrls
    .replace(/\([^)]*\)/gu, '()')
    .replace(/[^A-Za-z0-9_.:\-/()[\] ]/gu, '')
    .trim()
    .slice(0, 100);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function countNonEmptySegments(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

function emptySanitizedUrl(): SanitizedUrlResult {
  return {
    value: '',
    queryStripped: false,
    fragmentStripped: false,
    credentialsStripped: false,
    pathSegmentsRedacted: 0,
  };
}

function protectionMetadataMatches(
  current: TrackingEventDataProtection | undefined,
  expected: Omit<TrackingEventDataProtection, 'sanitizedAt'>
): boolean {
  if (!current) return false;
  return (
    current.policyVersion === expected.policyVersion &&
    current.urlRetentionMode === expected.urlRetentionMode &&
    current.queryStripped === expected.queryStripped &&
    current.fragmentStripped === expected.fragmentStripped &&
    current.credentialsStripped === expected.credentialsStripped &&
    current.pathSegmentsRedacted === expected.pathSegmentsRedacted &&
    current.rawDetailsRemoved === expected.rawDetailsRemoved
  );
}
