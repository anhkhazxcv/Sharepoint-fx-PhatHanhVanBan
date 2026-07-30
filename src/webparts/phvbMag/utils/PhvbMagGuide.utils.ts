/**
 * Accept only http(s) absolute URLs for PDF embed / open.
 * Rejects javascript:, data:, and relative paths that cannot be parsed as absolute URL.
 */
export function resolveGuidePdfUrl(raw?: string): string | undefined {
  const trimmed = (raw || '').trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    return parsed.href;
  } catch {
    return undefined;
  }
}
