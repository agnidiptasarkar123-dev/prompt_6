// SPDX-License-Identifier: Apache-2.0
import { readValidatedJsonStorage, writeJsonStorage } from "@/lib/storage/safe-storage";
import type { SupportedLanguage } from "@/i18n/translations";

// Guest Mode Management (Local-only sessionStorage, zero Firebase Web SDK weight)
const GUEST_STORAGE_KEY = "hawasaathi_guest_context";

export interface GuestState {
  savedLocation?: {
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  householdContext?: Record<string, unknown>;
  routine?: Record<string, unknown>;
  language?: SupportedLanguage;
}

function isGuestState(raw: unknown): raw is GuestState {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

export function getGuestContext(): GuestState | null {
  if (typeof window === "undefined") return null;
  return readValidatedJsonStorage(window.sessionStorage, GUEST_STORAGE_KEY, isGuestState);
}

export function saveGuestContext(state: GuestState): void {
  if (typeof window === "undefined") return;
  writeJsonStorage(window.sessionStorage, GUEST_STORAGE_KEY, state);
}

export function clearGuestContext(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
}
