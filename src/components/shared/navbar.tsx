// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { Wind, Globe, User, ShieldCheck } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";

export interface NavbarProps {
  readonly language: SupportedLanguage;
  readonly onLanguageChange: (lang: SupportedLanguage) => void;
  readonly isAuthenticated: boolean;
  readonly userEmail?: string;
  readonly onOpenAuthModal: () => void;
  readonly onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  isAuthenticated,
  userEmail,
  onOpenAuthModal,
  onSignOut
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30">
            <Wind className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t.appTitle}</h1>
            <p className="hidden text-xs text-slate-400 sm:block">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <Globe className="ml-1 h-4 w-4 text-slate-400" aria-hidden="true" />
            {(["en", "bn", "hi"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`rounded px-2 py-1 text-xs font-medium transition ${
                  language === lang
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                aria-label={`Switch to ${TRANSLATIONS[lang].languageName}`}
              >
                {TRANSLATIONS[lang].languageName}
              </button>
            ))}
          </div>

          {/* User / Guest Status */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <span className="hidden text-xs text-slate-300 md:inline-block">
                {userEmail || "Signed In"}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="hidden items-center text-xs text-amber-400 sm:inline-flex">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {t.guestMode}
              </span>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-teal-400"
              >
                <User className="h-3.5 w-3.5" />
                <span>{t.signIn}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
