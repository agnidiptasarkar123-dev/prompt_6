// SPDX-License-Identifier: Apache-2.0
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
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
        const apps = getApps();
        this.app = apps[0]!;
      }
    } else if (projectId) {
      if (!getApps().length) {
        try {
          this.app = initializeApp({
            credential: applicationDefault(),
            projectId
          });
        } catch {
          this.app = initializeApp({ projectId });
        }
      } else {
        const apps = getApps();
        this.app = apps[0]!;
      }
    }

    if (this.app) {
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      try {
        this.firestore.settings({ ignoreUndefinedProperties: true });
      } catch {
        // Settings can only be applied once, or ignored if mocked
      }
    }
  }

  public static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  public isConfigured(): boolean {
    return this.app !== null;
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
