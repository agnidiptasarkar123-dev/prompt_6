// SPDX-License-Identifier: Apache-2.0

export type StorageReader = Pick<Storage, "getItem">;
export type StorageWriter = Pick<Storage, "setItem">;

export function getBrowserLocalStorage(): Storage | undefined {
  return typeof globalThis.window !== "undefined" ? globalThis.window.localStorage : undefined;
}

/**
 * Safely reads, JSON-parses, and runtime-validates untrusted client storage entries.
 */
export function readValidatedJsonStorage<T>(
  storage: StorageReader | undefined,
  key: string,
  guard: (raw: unknown) => raw is T
): T | null {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Safely serializes JSON state to Web Storage while tolerating quota or privacy errors.
 */
export function writeJsonStorage(
  storage: StorageWriter | undefined,
  key: string,
  value: unknown
): void {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or restricted-context failures cleanly
  }
}
