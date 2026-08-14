import type {
  AnonymousPrivacyData,
  EvidenceCoverageConfidence,
  EvidenceScoreBand,
  RiskLevel,
  TrackerType,
} from './types.ts';
import { P2P_CONSENT_VERSION, P2P_PAYLOAD_VERSION } from './p2p-consent.mts';

export const MAX_P2P_PAYLOAD_BYTES = 2048;
export const MAX_P2P_SAMPLE_AGE_MS = 26 * 60 * 60 * 1000;
export const MAX_P2P_FUTURE_SKEW_MS = 60 * 60 * 1000;

const ALLOWED_KEYS = new Set([
  'payloadVersion',
  'consentVersion',
  'privacyScore',
  'scoreStatus',
  'scoreConfidence',
  'grade',
  'trackerCount',
  'riskDistribution',
  'websiteCategories',
  'timestamp',
  'region',
]);
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const TRACKER_TYPES = new Set<TrackerType>([
  'advertising',
  'analytics',
  'social',
  'fingerprinting',
  'cryptomining',
  'unknown',
]);
const COVERAGE_VALUES = new Set<EvidenceCoverageConfidence>([
  'low',
  'medium',
  'high',
]);
const GRADE_VALUES = new Set(['A', 'B', 'C', 'D', 'F']);
const REGION_PATTERN = /^[A-Za-z0-9 _-]{1,32}$/u;

/**
 * Parse unauthenticated peer input into a fresh, bounded canonical object.
 * Any malformed shape, accessor, proxy trap, oversized payload, or stale value
 * is rejected without allowing an exception to reach the transport callback.
 */
export function parseAnonymousPrivacyData(
  value: unknown,
  now = Date.now()
): AnonymousPrivacyData | null {
  try {
    return parseAnonymousPrivacyDataUnsafe(value, now);
  } catch {
    return null;
  }
}

export function getP2PGradeForScore(
  score: number
): Exclude<EvidenceScoreBand, 'N/A'> {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function parseAnonymousPrivacyDataUnsafe(
  value: unknown,
  now: number
): AnonymousPrivacyData | null {
  if (!Number.isFinite(now)) return null;
  if (!isPlainRecord(value)) return null;

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some(key => typeof key !== 'string' || !ALLOWED_KEYS.has(key))) {
    return null;
  }
  if (!isWithinSerializedLimit(value)) return null;

  const privacyScore = value.privacyScore;
  const trackerCount = value.trackerCount;
  const timestamp = value.timestamp;
  const scoreConfidence = value.scoreConfidence;
  const grade = value.grade;

  if (value.payloadVersion !== P2P_PAYLOAD_VERSION) return null;
  if (value.consentVersion !== P2P_CONSENT_VERSION) return null;
  if (value.scoreStatus !== 'estimated') return null;
  if (!isBoundedInteger(privacyScore, 0, 100) || privacyScore % 5 !== 0) {
    return null;
  }
  if (typeof grade !== 'string' || !GRADE_VALUES.has(grade)) return null;
  if (grade !== getP2PGradeForScore(privacyScore)) return null;
  if (
    typeof scoreConfidence !== 'string' ||
    !COVERAGE_VALUES.has(scoreConfidence as EvidenceCoverageConfidence)
  ) {
    return null;
  }
  if (!isBoundedInteger(trackerCount, 0, 50)) return null;
  if (!isRoundedFreshTimestamp(timestamp, now)) return null;

  const riskDistribution = parseRiskDistribution(value.riskDistribution);
  if (!riskDistribution) return null;
  const websiteCategories = parseCategories(value.websiteCategories);
  if (!websiteCategories) return null;

  let region: string | undefined;
  if (value.region !== undefined) {
    if (typeof value.region !== 'string') return null;
    const normalizedRegion = value.region.trim();
    if (!REGION_PATTERN.test(normalizedRegion)) return null;
    region = normalizedRegion;
  }

  const canonical: AnonymousPrivacyData = {
    payloadVersion: P2P_PAYLOAD_VERSION,
    consentVersion: P2P_CONSENT_VERSION,
    privacyScore,
    scoreStatus: 'estimated',
    scoreConfidence: scoreConfidence as Exclude<
      EvidenceCoverageConfidence,
      'none'
    >,
    grade,
    trackerCount,
    riskDistribution,
    websiteCategories,
    timestamp,
    ...(region ? { region } : {}),
  };

  return isWithinSerializedLimit(canonical) ? canonical : null;
}

function parseRiskDistribution(
  value: unknown
): Record<RiskLevel, number> | null {
  if (!isPlainRecord(value)) return null;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== RISK_LEVELS.length ||
    keys.some(
      key => typeof key !== 'string' || !RISK_LEVELS.includes(key as RiskLevel)
    )
  ) {
    return null;
  }

  const parsed = Object.fromEntries(
    RISK_LEVELS.map(level => [level, value[level]])
  ) as Record<RiskLevel, unknown>;
  if (RISK_LEVELS.some(level => !isBoundedInteger(parsed[level], 0, 100))) {
    return null;
  }

  const total = RISK_LEVELS.reduce(
    (sum, level) => sum + (parsed[level] as number),
    0
  );
  // Independent percentage rounding can produce 99 or 101. Anything further
  // away is not a plausible distribution produced by the local builder.
  if (total !== 0 && (total < 98 || total > 102)) return null;

  return parsed as Record<RiskLevel, number>;
}

function parseCategories(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 3) return null;

  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.entries(descriptors).some(
      ([key, descriptor]) =>
        key !== 'length' &&
        (!/^\d+$/u.test(key) || descriptor.get || descriptor.set)
    )
  ) {
    return null;
  }

  const categories: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return null;
    const category = value[index];
    if (typeof category !== 'string') return null;
    if (!TRACKER_TYPES.has(category as TrackerType)) return null;
    if (categories.includes(category)) return null;
    categories.push(category);
  }
  return categories;
}

function isRoundedFreshTimestamp(value: unknown, now: number): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  const date = new Date(value);
  if (
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0
  ) {
    return false;
  }
  return (
    value >= now - MAX_P2P_SAMPLE_AGE_MS &&
    value <= now + MAX_P2P_FUTURE_SKEW_MS
  );
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Object.values(descriptors).every(
    descriptor => !descriptor.get && !descriptor.set
  );
}

function isWithinSerializedLimit(value: object): boolean {
  try {
    return new Blob([JSON.stringify(value)]).size <= MAX_P2P_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}
