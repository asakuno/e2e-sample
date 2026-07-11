export function formatNewsDateTime(value: string): string {
  const normalized = value.replace('T', ' ');

  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}
