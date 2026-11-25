# HawaSaathi 2.0 — Multi-Theme & Appearance Verification

> **Date:** 2026-11-25
> **Primary Modules:** `src/app/globals.css`, `src/app/layout.tsx`, `src/theme/tokens.ts`, `src/theme/theme-provider.tsx`, `src/components/shared/navbar.tsx`, `src/components/settings/settings-workspace.tsx`

---

## 1. Three Appearance Modes + Zero-FOUC Initialization

- **Supported Modes:** `light` (`#FFFFFF` / `#F6F8F4`), `dark` (`#0B1418` / `#111E24`), and `high-contrast` (`#000000` / `#080808` / `#FFD400` focus & accent).
- **Centralised CSS Custom Properties (`src/app/globals.css`):** Complete `--hs-page-bg`, `--hs-surface-bg`, `--hs-subtle-bg`, `--hs-text-primary`, `--hs-text-secondary`, `--hs-accent`, `--hs-border-subtle`, `--hs-focus-ring`, `--hs-map-bg`, `--hs-map-grid`, and `--hs-map-label` definitions for `:root`, `[data-theme="dark"]`, and `[data-theme="high-contrast"]`.
- **Zero-FOUC Boot (`src/app/layout.tsx`):** Synchronous inline `THEME_INIT_SCRIPT` applies `data-theme` from `localStorage.getItem("hs_theme_mode")` (or OS `prefers-color-scheme`) before first paint.
- **UI Synchronization:** Navbar quick-switcher + Settings workspace theme selector + Command Palette (`⌘K`/`Ctrl+K`) update active theme consistently with `aria-pressed` state.

---

## 2. Empirical Verification

- **Unit & Coverage Tests (`tests/unit/v2/v2-final-100-closure.test.tsx`, `tests/unit/v2/v2-domain-planner-alerts-i18n-theme.test.ts`):** 100.00% coverage on `theme-provider.tsx` and `tokens.ts`.
- **Chrome Standalone E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 9 `[THEME] Three Theme Modes & Zero-Flash Reload Persistence`: **PASS (`984ms`)** — selected `High Contrast` in Settings -> `data-theme="high-contrast"` applied -> survived `page.reload()` (`persisted=high-contrast`).
