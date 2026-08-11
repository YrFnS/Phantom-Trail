/**
 * Keep the graph bounded without delaying newly loaded storage rows.
 *
 * The previous ref-based throttle could capture the initial empty storage
 * value and then suppress a small real batch that arrived during the next
 * second. Because no timer retriggered the memo, the Map view could remain
 * empty until another storage mutation occurred.
 */
export function selectRecentTrackingEvents<T>(
  events: readonly T[],
  limit = 50
): T[] {
  if (events.length === 0) return [];

  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 50;

  if (normalizedLimit === 0) return [];
  return events.slice(-normalizedLimit);
}
