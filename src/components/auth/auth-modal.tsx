// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { X, Download, Trash2, Loader2, Check } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { signInWithGoogle, sendEmailSignInLink } from "@/lib/firebase/client";

export interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly language: SupportedLanguage;
  readonly isAuthenticated: boolean;
  readonly userEmail?: string;
  readonly onExportData: () => Promise<void>;
  readonly onDeleteAccount: () => Promise<void>;
  readonly onAuthSuccess: (email?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  isAuthenticated,
  userEmail,
  onExportData,
  onDeleteAccount,
  onAuthSuccess
}) => {
  const t = TRANSLATIONS[language];
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithGoogle();
      if (cred?.user) {
        // Exchange ID token for session cookie
        const idToken = await cred.user.getIdToken();
        const res = await fetch("/api/v1/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });
        if (res.ok) {
          onAuthSuccess(cred.user.email || undefined);
          onClose();
        } else {
          setError("Failed to create secure server session.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendEmailSignInLink(email, window.location.href);
      setEmailSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send email link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-white">
          {isAuthenticated ? "Account & Privacy Settings" : t.signIn}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          {isAuthenticated
            ? `Signed in as ${userEmail || "Authenticated User"}`
            : "Sign in to persist your household profile across devices, or continue in local guest mode."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300 ring-1 ring-rose-500/30">
            {error}
          </div>
        )}

        {isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                DPDP Act (2023) Data Rights
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                You have the full right to export or delete your personal household and routine data at any time.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  <span>1-Click Data Export (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>1-Click Account & Data Deletion</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-slate-700 bg-white py-2.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Sign In with Google</span>}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-800" />
              <span className="absolute bg-slate-900 px-2 text-[10px] uppercase text-slate-500">Or email link</span>
            </div>

            {emailSent ? (
              <div className="rounded-xl bg-teal-500/10 p-4 text-center text-xs text-teal-300 ring-1 ring-teal-500/30">
                <Check className="mx-auto mb-1 h-5 w-5" />
                Sign-in link sent to {email}. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSendEmailLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-500 py-2 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:opacity-50"
                >
                  Send Passwordless Email Link
                </button>
              </form>
            )}

            <p className="text-center text-[11px] text-slate-500">
              No account required. You can use all public features in Guest Mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
