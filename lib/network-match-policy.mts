import type {
  DetectionConfidence,
  TrackingEventContext,
} from './types.ts';

/**
 * Decide whether an attributed network rule match is strong enough to store.
 *
 * This policy intentionally favors avoiding false accusations:
 * - first-party matches are not stored as third-party tracking evidence;
 * - unattributed low-confidence broad rules are dropped; and
 * - attributed third-party catalog or heuristic matches remain inspectable.
 */
export function shouldStoreNetworkMatch(
  context: TrackingEventContext,
  detectorConfidence: DetectionConfidence
): boolean {
  if (context.party === 'first-party') return false;
  if (context.party === 'unknown' && detectorConfidence === 'low') return false;
  return Boolean(context.resourceDomain);
}
