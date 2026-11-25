# HawaSaathi 2.0 — Performance & Responsive Viewport Report

> **Date:** 2026-11-25
> **Target:** Next.js 16.4.6 Standalone Production Build (`.next/standalone/server.js`)

---

## 1. Responsive Layout Fix Verified (`src/components/shared/navbar.tsx`)

During initial real Chrome E2E verification (`task-10877`), viewport matrix testing caught genuine horizontal overflow (`scrollWidth > innerWidth`) at `320px` (`903px`), `375px` (`903px`), `768px` (`1217px`), and `1280px` (`1425px`) caused by non-wrapping Navbar controls and an unconstrained 23-locale `<select>` element.

Refactoring `Navbar` with `flex-wrap`, `min-w-0`, responsive action hiding (`hidden sm:inline-flex` on quick language pills at mobile widths while keeping them in the DOM & accessible), and constrained dropdown width (`max-w-[105px] sm:max-w-[140px] truncate`) eliminated 100% of horizontal overflow across all viewports.

---

## 2. Measured Chrome Production Build Metrics (`scripts/run-browser-e2e.ts`)

Measured in headless Google Chrome against live `node .next/standalone/server.js` on `http://127.0.0.1:64419`:

| Metric / Viewport | Measured Value | Target / Threshold | Status |
|---|---|---|---|
| **DOMContentLoaded** | `197 ms` | `< 1500 ms` | **PASS** |
| **Window Load Event** | `270 ms` | `< 2500 ms` | **PASS** |
| **First Contentful Paint (FCP)** | `264 ms` | `< 1800 ms` | **PASS** |
| **320 px Mobile Width** | `scrollWidth = 320 / 320 px` | No horizontal overflow | **PASS** |
| **375 px Mobile Width** | `scrollWidth = 375 / 375 px` | No horizontal overflow | **PASS** |
| **768 px Tablet Width** | `scrollWidth = 768 / 768 px` | No horizontal overflow | **PASS** |
| **1280 px Desktop Width** | `scrollWidth = 1280 / 1280 px` | No horizontal overflow | **PASS** |
| **1920 px Wide Desktop** | `scrollWidth = 1920 / 1920 px` | No horizontal overflow | **PASS** |
| **Language Switch Station Refetch** | `0 extra requests` | Zero spurious refetches | **PASS** |
| **Runtime Page Errors** | `0 errors` | `0` | **PASS** |

---

## 3. Build & Concurrency Verification

- `next build --webpack` (`Next.js 16.4.6`): Compiled in `2.7s`, TypeScript check `2.7s`, `14/14` routes generated cleanly.
- `tests/unit/p7/p7-performance-concurrency.test.ts` and `tests/unit/p4/p4-concurrency-performance-recovery.test.ts` passed inside the full `82/82` suite run (`10,133` tests).
