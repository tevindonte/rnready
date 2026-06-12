export function formatModeLabel(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function getSessionDisplayName(session: {
  title?: string | null;
  mode: string;
  started_at: string;
}): string {
  const trimmed = session.title?.trim();
  if (trimmed) return trimmed;
  return `${formatModeLabel(session.mode)} session`;
}
