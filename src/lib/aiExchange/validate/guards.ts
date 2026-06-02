export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isSemanticVec2(value: unknown): value is { x: number; z: number } {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.z);
}
