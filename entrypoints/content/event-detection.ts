import type { TrackingEvent } from '../../lib/types';

// Event deduplication
const recentEventSignatures = new Map<string, number>();
const SIGNATURE_TTL = 10000; // 10 seconds

export function getEventSignature(event: TrackingEvent): string {
  return `${event.domain}-${event.trackerType}-${event.riskLevel}`;
}

export function isDuplicateEvent(event: TrackingEvent): boolean {
  const signature = getEventSignature(event);
  const lastSeen = recentEventSignatures.get(signature);

  if (lastSeen && Date.now() - lastSeen < SIGNATURE_TTL) {
    return true;
  }

  recentEventSignatures.set(signature, Date.now());
  return false;
}

export function cleanupExpiredSignatures(): void {
  const now = Date.now();
  for (const [signature, timestamp] of recentEventSignatures.entries()) {
    if (now - timestamp > SIGNATURE_TTL) {
      recentEventSignatures.delete(signature);
    }
  }
}
