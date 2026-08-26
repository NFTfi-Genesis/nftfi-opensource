const IGNORED_KEYS = ['caller'];

export function serializeContext(context: Record<string, unknown>): string {
  const parts = serializeEntry(context, '');
  return parts.join('&');
}

export function serializeEntry(value: unknown, path: string): string[] {
  if (value === null || value === undefined || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)) {
    return [`${path}=${String(value)}`];
  }

  if (value instanceof Date) {
    return [`${path}=${value.toISOString()}`];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => serializeEntry(item, `${path}[${index}]`));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => path || !IGNORED_KEYS.includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, val]) => {
        const nextPath = path ? `${path}.${key}` : key;
        return serializeEntry(val, nextPath);
      });
  }

  return [`${path}=${String(value)}`];
}
