// SPDX-License-Identifier: Apache-2.0
import type { SupportedLanguage } from "@/i18n/translations";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signOut,
  type Auth,
  type UserCredential
} from "firebase/auth";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function _resetClientAuthForTesting(): void {
  firebaseApp = null;
  firebaseAuth = null;
}

export function getClientAuth(): Auth | null {
  if (typeof window === "undefined") return null;

  const apiKey = process.env["NEXT_PUBLIC_FIREBASE_API_KEY"];
  const authDomain = process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"];
  const projectId = process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"];

  if (!apiKey || !projectId) {
    return null;
  }

  if (!firebaseApp) {
    if (!getApps().length) {
      firebaseApp = initializeApp({
        apiKey,
        authDomain,
        projectId
      });
    } else {
      firebaseApp = getApps()[0] || null;
    }
  }

  if (firebaseApp && !firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }

  return firebaseAuth;
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error("Client Firebase Auth is NOT_CONFIGURED.");
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function sendEmailSignInLink(email: string, redirectUrl: string): Promise<void> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error("Client Firebase Auth is NOT_CONFIGURED.");
  }
  const actionCodeSettings = {
    url: redirectUrl,
    handleCodeInApp: true
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeEmailSignInLink(email: string, href: string): Promise<UserCredential | null> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error("Client Firebase Auth is NOT_CONFIGURED.");
  }
  if (!isSignInWithEmailLink(auth, href)) {
    throw new Error("Invalid or expired sign-in email link.");
  }
  return signInWithEmailLink(auth, email, href);
}

export async function clientSignOut(): Promise<void> {
  const auth = getClientAuth();
  if (auth) {
    await signOut(auth);
  }
}

// Guest Mode Management (Local-only sessionStorage)
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
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestState;
  } catch {
    return null;
  }
}

export function saveGuestContext(state: GuestState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
}

export function clearGuestContext(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
}

export async function exportUserData(uid: string): Promise<Record<string, unknown>> {
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: "1.0.0",
    dpdpCompliance: true,
    uid,
    guestState: getGuestContext()
  };
}

export async function deleteAccountAndData(uid: string): Promise<void> {
  clearGuestContext();
  const auth = getClientAuth();
  if (auth?.currentUser && auth.currentUser.uid === uid) {
    await auth.currentUser.delete();
  }
}
