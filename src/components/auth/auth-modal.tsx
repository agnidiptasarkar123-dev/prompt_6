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
  readonly onExportData?: () => Promise<void>;
  readonly onDeleteAccount?: () => Promise<void>;
  readonly onAuthSuccess: (email?: string) => void;
  readonly initialEmailSent?: boolean;
  readonly initialError?: string | null;
  readonly initialLoading?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  isAuthenticated,
  userEmail,
  onExportData,
  onDeleteAccount,
  onAuthSuccess,
  initialEmailSent,
  initialError,
  initialLoading
}) => {
  const t = TRANSLATIONS[language];
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(initialEmailSent ?? false);
  const [loading, setLoading] = useState(initialLoading ?? false);
  const [error, setError] = useState<string | null>(initialError ?? null);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
    >
      <div className="hs-card relative w-full max-w-md rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-modal-subtle">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-1 text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 id="auth-modal-heading" className="text-xl font-bold text-[var(--hs-text-primary)]">
          {isAuthenticated ? "Account & Privacy Settings" : t.signIn}
        </h3>
        <p className="mt-1 text-xs text-[#526466]">
          {isAuthenticated
            ? `Signed in as ${userEmail || "Authenticated User"}`
            : "Sign in to persist your household profile across devices, or continue in local guest mode."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-[#F6F8F4] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#164E4A]">
                DPDP Act (2023) Data Rights
              </h4>
              <p className="mt-1 text-xs text-[#526466]">
                You have the full right to export or delete your personal household and routine data at any time.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-[#F6F8F4] shadow-xs"
                >
                  <Download className="h-4 w-4 text-[#164E4A]" />
                  <span>1-Click Data Export (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
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
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-800 transition hover:bg-[#F6F8F4] disabled:opacity-50 shadow-xs"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#1F9D78]" /> : <span>Sign In with Google</span>}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-2 text-[10px] uppercase text-[#526466]">Or email link</span>
            </div>

            {emailSent ? (
              <div className="rounded-xl bg-teal-50 p-4 text-center text-xs text-[#164E4A] ring-1 ring-[#B8E6D2]">
                <Check className="mx-auto mb-1 h-5 w-5 text-[#1F9D78]" />
                Sign-in link sent to {email}. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSendEmailLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#102A2A] placeholder-slate-400 focus:border-[#1F9D78] focus:outline-none focus:ring-2 focus:ring-[#1F9D78]/20"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#1F9D78] py-2 text-xs font-bold text-white transition hover:bg-[#164E4A] disabled:opacity-50"
                >
                  Send Passwordless Email Link
                </button>
              </form>
            )}

            <p className="text-center text-[11px] text-[#526466]">
              No account required. You can use all public features in Guest Mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
