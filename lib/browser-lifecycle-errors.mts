/**
 * Browser shutdown and extension-context invalidation are controlled lifecycle
 * transitions, not actionable storage failures.
 */
export function isControlledBrowserShutdown(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /browser is shutting down|extension context (?:was )?invalidated/iu.test(
    message
  );
}
