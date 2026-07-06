/**
 * Thin localStorage wrapper: namespaced keys, JSON (de)serialization,
 * and silent fallback to an in-memory map when storage is unavailable
 * (privacy mode, embedded webviews, quota exceeded).
 */
const NAMESPACE = 'glimmerbonk';
const memoryFallback = new Map<string, string>();
let storageOk = true;

try {
  const testKey = `${NAMESPACE}:__test__`;
  localStorage.setItem(testKey, '1');
  localStorage.removeItem(testKey);
} catch {
  storageOk = false;
}

function key(k: string): string {
  return `${NAMESPACE}:${k}`;
}

export function loadJSON<T>(k: string, fallback: T): T {
  try {
    const raw = storageOk ? localStorage.getItem(key(k)) : (memoryFallback.get(key(k)) ?? null);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(k: string, value: unknown): void {
  const raw = JSON.stringify(value);
  try {
    if (storageOk) localStorage.setItem(key(k), raw);
    else memoryFallback.set(key(k), raw);
  } catch {
    memoryFallback.set(key(k), raw);
  }
}
