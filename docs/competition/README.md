# HawaSaathi (হাওয়াসাথী / हवा साथी) — Competition Submission Package

> **Submission Title:** HawaSaathi — Personalised Urban Air Quality Intelligence Platform for Indian Cities\
> **Repository Baseline:** Commit `bc7a474` (main branch)\
> **Release Candidate:** `v1.0.0-rc.1`\
> **Quality Verification:** 10,077 Passing Automated Tests | 100.00% Full-Source Coverage | Zero Synthetic Pragmas\
> **Live Architecture:** Next.js 16 (App Router) + Google Cloud Run + Firebase Auth & Firestore + Google Gemini + Upstash Redis

---

## 1. Submission Overview

HawaSaathi bridges the critical gap between raw, complex air quality monitoring data and actionable, personalized public health interventions across urban India.

Unlike generic weather widgets that display a single city-wide number without scientific context, HawaSaathi delivers:
1. **Deterministic Scientific Precision:** Strictly implements MoEFCC Central Pollution Control Board (CPCB) NAQI (2014) standard sub-index formulas with verified running-window data sufficiency.
2. **Defensible 4-Way Atmospheric Provenance:** Distinguishes official CPCB published AQI (Type A), independently calculated CPCB AQI (Type B), raw monitored physical concentrations (Type C), and modeled atmospheric forecasts (Type D).
3. **Personalized, Non-Diagnostic Environmental Intelligence:** Multi-modal commute exposure planning and dwelling indoor air coaching based on micro-environment physics and user preferences.
4. **National Multilingual Equity:** Complete localization across English and all 22 Eighth Schedule Indian languages with native scripts, RTL directionality, and statutory terminology preservation.
5. **Zero-Trust Security & Privacy Compliance:** Built to OWASP ASVS 5.0.0 Level 2 standards with full DPDP Act 2023 compliance, ephemeral guest mode, 1-click JSON data export, and 1-click cascading account deletion.

---

## 2. Competition Package Index

| Document | File Path | Focus Area |
|:---|:---|:---|
| **Problem & Solution** | [`problem-and-solution.md`](problem-and-solution.md) | Urban air pollution crisis in India, existing gaps, and HawaSaathi's value proposition. |
| **Technical Architecture** | [`technical-architecture.md`](technical-architecture.md) | Full-stack Next.js BFF architecture, Cloud Run deployment, Firebase integration, and Redis caching. |
| **Data & AI Methodology** | [`data-and-ai-methodology.md`](data-and-ai-methodology.md) | CPCB calculation engine, running-window rules, Gemini multi-model routing, and deterministic fallbacks. |
| **Security & Privacy** | [`security-and-privacy.md`](security-and-privacy.md) | ASVS Level 2 implementation, Firebase ID token verification, and DPDP Act 2023 data rights. |
| **Limitations & Roadmap** | [`limitations-and-roadmap.md`](limitations-and-roadmap.md) | Documented scientific and architectural invariants and post-competition expansion roadmap. |
| **Live Demo Script** | [`demo-script.md`](demo-script.md) | Step-by-step evaluator walkthrough covering search, provenance, commute, indoor coach, and i18n. |
| **Judge FAQ** | [`judge-faq.md`](judge-faq.md) | Direct, defensible answers to 10 crucial architectural, scientific, and security questions. |
| **Evidence Register** | [`evidence-register.md`](evidence-register.md) | Traceable index of automated test reports, mutation results, coverage proofs, and deployment configs. |
