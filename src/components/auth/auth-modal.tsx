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
        <p className="mt-1 text-xs text-[var(--hs-text-secondary)]">
          {isAuthenticated
            ? `Signed in as ${userEmail || "Authenticated User"}`
            : "Sign in to persist your household profile across devices, or continue in local guest mode."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-[var(--hs-accent-coral)]/35 bg-[var(--hs-accent-coral)]/10 p-3 text-xs text-[var(--hs-accent-coral)]">
            {error}
          </div>
        )}

        {isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--hs-accent)]">
                DPDP Act (2023) Data Rights
              </h4>
              <p className="mt-1 text-xs text-[var(--hs-text-secondary)]">
                You have the full right to export or delete your personal household and routine data at any time.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-4 py-2 text-xs font-semibold text-[var(--hs-text-primary)] hover:bg-[var(--hs-elevated-bg)] shadow-xs"
                >
                  <Download className="h-4 w-4 text-[var(--hs-accent)]" />
                  <span>1-Click Data Export (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-[var(--hs-accent-coral)]/40 bg-[var(--hs-accent-coral)]/10 px-4 py-2 text-xs font-semibold text-[var(--hs-accent-coral)] hover:bg-[var(--hs-accent-coral)]/20"
                >
                  <Trash2 className="h-4 w-4 text-[var(--hs-accent-coral)]" />
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
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-elevated-bg)] py-2.5 text-xs font-bold text-[var(--hs-text-primary)] transition hover:bg-[var(--hs-subtle-bg)] disabled:opacity-50 shadow-xs"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--hs-accent)]" /> : <span>Sign In with Google</span>}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[var(--hs-border-subtle)]" />
              <span className="absolute bg-[var(--hs-surface-bg)] px-2 text-[10px] uppercase text-[var(--hs-text-secondary)]">Or email link</span>
            </div>

            {emailSent ? (
              <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 text-center text-xs text-[var(--hs-accent)]">
                <Check className="mx-auto mb-1 h-5 w-5 text-[var(--hs-accent)]" />
                Sign-in link sent to {email}. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSendEmailLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)] placeholder:text-[var(--hs-text-secondary)] focus:border-[var(--hs-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--hs-accent)]/20"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--hs-accent)] py-2 text-xs font-bold text-[var(--hs-accent-text)] transition hover:opacity-90 disabled:opacity-50"
                >
                  Send Passwordless Email Link
                </button>
              </form>
            )}

            <p className="text-center text-[11px] text-[var(--hs-text-secondary)]">
              No account required. You can use all public features in Guest Mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
