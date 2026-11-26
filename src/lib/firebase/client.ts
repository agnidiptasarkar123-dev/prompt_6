// SPDX-License-Identifier: Apache-2.0
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
import {
  type GuestState,
  getGuestContext,
  saveGuestContext,
  clearGuestContext
} from "./guest-context";

export {
  type GuestState,
  getGuestContext,
  saveGuestContext,
  clearGuestContext
};

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
