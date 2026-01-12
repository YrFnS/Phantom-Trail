/**
 * Utility function for combining class names conditionally
 * Similar to clsx but lightweight for our needs
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
