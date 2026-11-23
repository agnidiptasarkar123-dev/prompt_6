// SPDX-License-Identifier: Apache-2.0
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class FirebaseAdminService {
  private static instance: FirebaseAdminService | null = null;
  private readonly app: App | null = null;
  private readonly auth: Auth | null = null;
  private readonly firestore: Firestore | null = null;

  constructor() {
    const projectId = process.env["FIREBASE_PROJECT_ID"];
    const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
    const privateKey = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      if (!getApps().length) {
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
      } else {
        this.app = getApps()[0] || null;
      }
    } else if (projectId) {
      if (!getApps().length) {
        this.app = initializeApp({ projectId });
      } else {
        this.app = getApps()[0] || null;
      }
    }

    if (this.app) {
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
    }
  }

  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  public isConfigured(): boolean {
    return this.app !== null && this.auth !== null;
  }

  public async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.auth) {
      throw new Error("Firebase Admin is NOT_CONFIGURED. Check server credentials.");
    }
    return this.auth.verifyIdToken(idToken, true);
  }

  public async createSessionCookie(
    idToken: string,
    expiresInMs: number = 5 * 24 * 60 * 60 * 1000 // 5 days
  ): Promise<string> {
    if (!this.auth) {
      throw new Error("Firebase Admin is NOT_CONFIGURED. Check server credentials.");
    }
    return this.auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  public async verifySessionCookie(
    sessionCookie: string,
    checkRevoked: boolean = true
  ): Promise<DecodedIdToken> {
    if (!this.auth) {
      throw new Error("Firebase Admin is NOT_CONFIGURED. Check server credentials.");
    }
    return this.auth.verifySessionCookie(sessionCookie, checkRevoked);
  }

  public async revokeRefreshTokens(uid: string): Promise<void> {
    if (!this.auth) {
      throw new Error("Firebase Admin is NOT_CONFIGURED. Check server credentials.");
    }
    return this.auth.revokeRefreshTokens(uid);
  }

  public getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error("Firebase Admin is NOT_CONFIGURED. Check server credentials.");
    }
    return this.firestore;
  }
}

export const globalFirebaseAuth = FirebaseAdminService.getInstance();
