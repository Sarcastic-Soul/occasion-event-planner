/**
 * Small wrappers around localStorage. Storage can be missing or blocked
 * (private windows, strict settings), so every call fails quietly.
 */
export function loadJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Saving is a convenience; the plan still works without it.
  }
}
