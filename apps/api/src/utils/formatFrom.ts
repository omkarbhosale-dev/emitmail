/**
 * Ensures the "From" header contains an RFC-5322 compliant display name
 * (e.g., "Support" <support@domain.com> or "Acme Team" <team@domain.com>)
 * rather than a bare email address which can trigger spam heuristic filters.
 */
export function formatFromHeader(rawFrom: string, fallbackName?: string | null): string {
  if (!rawFrom) return rawFrom;
  const trimmed = rawFrom.trim();

  // Check if already in "Display Name <email@domain>" format
  const angledMatch = trimmed.match(/^([^<]+)<([^>]+@[^>]+)>$/);
  if (angledMatch) {
    const existingName = angledMatch[1].trim().replace(/^["']|["']$/g, '').trim();
    const emailAddr = angledMatch[2].trim();
    if (existingName.length > 0) {
      return `"${existingName}" <${emailAddr}>`;
    }
    rawFrom = emailAddr;
  }

  // Extract bare email address
  const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const emailAddr = emailMatch ? emailMatch[1] : trimmed;

  if (fallbackName && fallbackName.trim()) {
    const cleanName = fallbackName.trim().replace(/^["']|["']$/g, '').trim();
    return `"${cleanName}" <${emailAddr}>`;
  }

  // Derive display name from the local-part (e.g. 'support' -> 'Support', 'no-reply' -> 'No Reply')
  const localPart = emailAddr.split('@')[0] || 'Notifications';
  const derivedName = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return `"${derivedName || 'Notifications'}" <${emailAddr}>`;
}
