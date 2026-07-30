function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const o = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(o).sort()) {
    sorted[key] = sortKeys(o[key]);
  }
  return sorted;
}

/** Stable JSON comparison (ignores key order). */
export function jsonDocumentsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

export function serializeDataJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
