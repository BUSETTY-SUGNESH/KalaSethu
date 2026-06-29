/** Resolve a non-empty display name for messaging callables. */
export function resolveDisplayName(
  displayName?: string | null,
  email?: string | null
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const fromEmail = email?.split('@')[0]?.trim();
  if (fromEmail) return fromEmail;
  return 'User';
}

/** Extract a user-facing message from a Firebase callable error. */
export function getCallableErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; details?: unknown };
    if (typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
