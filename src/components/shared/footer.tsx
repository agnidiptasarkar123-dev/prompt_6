// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { Shield, Database, MapPin } from "lucide-react";

interface FooterProps {
  readonly language: SupportedLanguage;
}

export function Footer({ language }: FooterProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];

  return (
    <footer className="mt-16 border-t border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] py-8 text-xs text-[var(--hs-text-secondary)] lg:pl-60 rtl:lg:pl-0 rtl:lg:pr-60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--hs-text-primary)] font-semibold">
              <Database className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>CPCB NAQI (2014) Standard</span>
            </div>
            <p className="leading-relaxed hs-wrap-safe">{t.footerDisclaimer}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--hs-text-primary)] font-semibold">
              <Shield className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>DPDP Act 2023 Safeguards</span>
            </div>
            <p className="leading-relaxed hs-wrap-safe">{t.dpdpPrivacyNotice}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--hs-text-primary)] font-semibold">
              <MapPin className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>Cartography &amp; Licences</span>
            </div>
            <p className="leading-relaxed hs-wrap-safe">
              Base maps powered by{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[24px] items-center text-[var(--hs-accent)] underline hover:opacity-80"
              >
                {t.osmAttribution}
              </a>
              . Open-Meteo CAMS atmospheric forecasts licensed under CC BY 4.0.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-[var(--hs-border-subtle)] pt-6 sm:flex-row gap-4">
          <p>HawaSaathi (হাওয়াসাথী / हवासाथी) • Pan-India Urban Air Quality Intelligence Platform</p>
          <div className="flex flex-wrap items-center gap-4">
            <span>Single-branch architecture: main</span>
            <span>•</span>
            <span>Zero third-party analytics trackers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
