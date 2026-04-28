export function normalizeErrorMessage(
  input: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!input) {
    return fallback;
  }

  if (typeof input === "string") {
    const text = input.trim();
    if (!text || text === "[object Event]" || text === "[object Object]") {
      return fallback;
    }
    return text;
  }

  if (typeof input === "object") {
    const maybeError = input as { message?: unknown; error?: unknown };
    const fromMessage = normalizeErrorMessage(maybeError.message, "");
    if (fromMessage) {
      return fromMessage;
    }
    const fromError = normalizeErrorMessage(maybeError.error, "");
    if (fromError) {
      return fromError;
    }
  }

  return fallback;
}
