// SPDX-License-Identifier: Apache-2.0
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

export function getGuestContext(): GuestState | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  const raw = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestState;
  } catch {
    return null;
  }
}

export function saveGuestContext(state: GuestState): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
}

export function clearGuestContext(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
}
