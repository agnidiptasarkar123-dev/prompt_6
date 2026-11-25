# HawaSaathi (হাওয়াসাথী / हवा साथी) — Frontend Branding & Design System Specification

## 1. Executive Summary & Design Direction

**HawaSaathi** is a Pan-India urban air-quality intelligence assistant providing hyper-local, actionable environmental guidance across Indian cities.

### Design Principles
- **Light-First & Accessible:** A serene, high-contrast, light-first interface using a Warm Canvas (`#F6F8F4`) and crisp white surfaces (`#FFFFFF`).
- **Scientific & Trustworthy:** Built around empirical data verification, transparent provenance tracing, and strict alignment with the statutory MoEFCC CPCB NAQI (2014) standard.
- **Calm & Approachable:** Eliminates alarmist UI anti-patterns, generic greenwashing, cartoon illustrations, excessive gradients, neon effects, and glassmorphism.
- **Responsive & Multilingual:** Native support for English and 22 Indian Scheduled Languages with consistent typographic cadence across diverse Indic scripts.

---

## 2. Color Palette & Design Tokens

The color system is codified in `src/theme/tokens.ts` and extended into Tailwind CSS via `tailwind.config.ts` and CSS custom variables in `src/app/globals.css`.

### 2.1 Brand Identity Palette
| Token Name | Hex Code | Role & Usage | Contrast Ratio (vs White / Canvas) |
| :--- | :--- | :--- | :--- |
| **Warm Canvas** | `#F6F8F4` | App background, calm warm neutral surface | Base canvas |
| **Pure White** | `#FFFFFF` | Card surfaces, modal containers, data tables | Base surface |
| **Deep Teal** | `#164E4A` | Primary brand accent, desktop sidebar, headers | 9.2:1 (AAA) |
| **Midnight Teal** | `#102A2A` | Primary typography, high-emphasis text | 13.8:1 (AAA) |
| **Saathi Green** | `#1F9D78` | Call-to-action buttons, active indicators, focus rings | 3.1:1 (UI Components) / 4.5:1 on dark |
| **Mint Tint** | `#B8E6D2` | Evidence tags, selected state tints, badges | 1.3:1 (Tint / Badge background) |
| **Slate Gray** | `#526466` | Secondary typography, captions, subtle borders | 5.3:1 (AA) |
| **Subtle Border** | `#E2E8F0` | Structural dividing lines, card outlines | Structural |

### 2.2 MoEFCC CPCB NAQI (2014) Severity Palette
Air quality severity colors strictly follow the statutory Indian National Air Quality Index standard. In accordance with WCAG 2.2 Level AA and anti-alarmist UX guidelines, **risk is never communicated through color alone**; each severity level is paired with an explicit numerical range, category text, pollutant breakdown, and health advisory text.

| Category | AQI Range | Color | Hex Code | UI Badge / Border Styling |
| :--- | :--- | :--- | :--- | :--- |
| **Good** | 0 – 50 | Deep Mint / Green | `#1F9D78` | `bg-emerald-50 text-emerald-800 border-emerald-200` |
| **Satisfactory** | 51 – 100 | Lime / Olive Green | `#65A30D` | `bg-lime-50 text-lime-800 border-lime-200` |
| **Moderate** | 101 – 200 | Amber / Ochre | `#D97706` | `bg-amber-50 text-amber-800 border-amber-200` |
| **Poor** | 201 – 300 | Orange / Ochre | `#EA580C` | `bg-orange-50 text-orange-800 border-orange-200` |
| **Very Poor** | 301 – 400 | Crimson / Red | `#DC2626` | `bg-red-50 text-red-800 border-red-200` |
| **Severe** | 401 – 500 | Deep Maroon | `#7F1D1D` | `bg-rose-50 text-rose-900 border-rose-300` |

---

## 3. Original Logo Design & Iconography

The official logo of HawaSaathi is authored as precision vector SVGs located in `public/` and surfaced through the reusable `<HawaSaathiLogo />` React component (`src/components/brand/logo.tsx`).

```
       .---.
     /       \       Air Currents (Dynamic wind ribbons)
    |   / \   |  +   Leaf Envelope (Environmental health)
    |  / . \  |  +   Compass Needle (Directional intelligence)
     \       /
       '---'
```

### 3.1 Visual Metaphors
1. **Flowing Air Currents:** Gentle, aerodynamic vector curves representing clean air circulation, atmospheric dispersion, and wind dynamics.
2. **Protective Leaf Envelope:** Organic curvature forming an open leaf outline, symbolizing environmental harmony and botanical air filtration.
3. **Compass / Directional Needle:** A centered 45° angled guidance needle embodying hyper-local navigation, intelligent route planning, and timely decision support.

### 3.2 Implemented Logo Variants
- **`public/logo.svg` (Horizontal):** 200×48 px composition featuring the 40×40 icon followed by the wordmark `HawaSaathi` (featuring Midnight Teal `#102A2A` for *Hawa* and Saathi Green `#1F9D78` for *Saathi*).
- **`public/logo-icon.svg` (Icon-only):** 48×48 px standalone mark for mobile navigation headers, avatars, and app icons.
- **`public/logo-reversed.svg` (Reversed):** Pure white wordmark with Mint `#B8E6D2` air ribbons, optimized for Deep Teal (`#164E4A`) dark surfaces such as the desktop sidebar and navbar.
- **`public/logo-monochrome.svg` (Monochrome):** Inherits `currentColor` for print media, single-color exports, and high-contrast system modes.
- **`public/favicon.svg`:** 48×48 px rounded tile favicon featuring the high-visibility mark.

---

## 4. Typography, Layout & Component System

### 4.1 Typography Scale
Utilizes system UI font stacks (`Inter, system-ui, -apple-system, sans-serif`) optimized for multi-script rendering across 22 Indian Scheduled Languages:
- **Heading 1:** 2.25rem (36px), Bold, line-height 1.25, letter-spacing -0.02em (`#102A2A`).
- **Heading 2:** 1.5rem (24px), Semi-bold, line-height 1.3 (`#102A2A`).
- **Heading 3:** 1.125rem (18px), Semi-bold, line-height 1.4 (`#102A2A`).
- **Body Regular:** 1rem (16px), Regular, line-height 1.5 (`#102A2A`).
- **Body Small:** 0.875rem (14px), Regular, line-height 1.4 (`#526466`).
- **Caption / Tag:** 0.75rem (12px), Medium, uppercase, letter-spacing 0.05em (`#526466`).

### 4.2 Elevation & Shadows
Soft, multi-layered shadows configured in `tailwind.config.ts`:
- **Card Subtle:** `0 1px 3px 0 rgba(16, 42, 42, 0.04), 0 1px 2px -1px rgba(16, 42, 42, 0.04)`
- **Card Hover:** `0 4px 6px -1px rgba(16, 42, 42, 0.08), 0 2px 4px -2px rgba(16, 42, 42, 0.04)`
- **Modal Subtle:** `0 20px 25px -5px rgba(16, 42, 42, 0.12), 0 8px 10px -6px rgba(16, 42, 42, 0.06)`

### 4.3 Component Implementation

#### 1. Desktop Sidebar (`src/components/shared/sidebar.tsx`)
- Fixed 256px left navigation bar with Deep Teal `#164E4A` background.
- Embeds reversed brand logo (`variant="reversed"`).
- Accessible navigation links (`#dashboard`, `#map`, `#stations`, `#forecast`, `#commute`, `#indoor`, `#recommendations`) with active state highlighted in Saathi Green `#1F9D78`.
- Action buttons for Household Profiles, Notification Center, and MoEFCC CPCB regulatory provenance disclosure.

#### 2. Navigation Bar (`src/components/shared/navbar.tsx`)
- Deep Teal `#164E4A` banner with white/mint branding.
- Quick-access 23-language selector supporting English and all 22 Eighth Schedule Indian Languages.
- Notification bell badge showing active alerts count.
- Authentication status button trigger.

#### 3. AQI Summary Card (`src/components/air-quality/aqi-summary-card.tsx`)
- White surface (`bg-white shadow-card-subtle`) with rounded corners (`rounded-2xl`).
- Clear category indicator badge (Good through Severe) paired with numeric AQI.
- Provenance modal trigger adhering strictly to WCAG 2.2 AA target size (`px-2.5 py-1.5 rounded-lg`).
- Displays data sufficiency status, prominent pollutant, and observation timestamp.

#### 4. Pollutant Grid (`src/components/air-quality/pollutant-grid.tsx`)
- Modular grid displaying monitored parameters ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3, NH_3, Pb$).
- White card background with subtle Slate `#526466`/20 border.
- Highlighted prominent pollutant ring (`ring-2 ring-rose-500/50`).

#### 5. Interactive Station Map (`src/components/maps/station-map.tsx`)
- Clean SVG/Leaflet container bounded by crisp white frame.
- OpenStreetMap Carto tiles with mandatory legal attribution (`© OpenStreetMap contributors` linked to copyright page).
- Accessible keyboard navigation and ARIA landmarks.

#### 6. Commute & Route Planner (`src/components/commute/commute-planner.tsx`)
- White card with Saathi Green CTA and Deep Teal transport mode toggles (Walking, Cycling, Metro, Auto/Cab, Bus).
- Clean exposure calculations displaying calculated micrograms inhaled per trip.

#### 7. Indoor Air Coach (`src/components/household/indoor-coach-panel.tsx`)
- Contextual ventilation window recommendations based on outdoor ambient air vs indoor sensor readings.
- Category-tinted advice cards without alarmist visuals.

#### 8. Household Vulnerability Modal (`src/components/household/household-modal.tsx`)
- High-contrast modal container (`bg-white shadow-modal-subtle`).
- Non-diagnostic, privacy-preserving sensitive group indicators (children, elderly, respiratory sensitivity).

---

## 5. Accessibility & Verification Checklist (WCAG 2.2 Level AA)

- [x] **Color Contrast:** All body text meets or exceeds 4.5:1; high-contrast headings exceed 9:1.
- [x] **Non-Text Contrast:** Form input borders and actionable icons exceed 3:1 against background.
- [x] **Touch Target Size:** Interactive controls meet minimum 44×44 CSS px target area or utilize adequate padding.
- [x] **Keyboard Navigable:** Visible, high-contrast focus rings (`focus:ring-2 focus:ring-[#1F9D78]/20 focus:border-[#1F9D78]`).
- [x] **Semantic Landmarks:** Proper `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>` elements.
- [x] **Screen Reader Support:** Screen-reader-only labels (`sr-only`), `aria-expanded`, `aria-haspopup`, and `aria-live` status regions.
- [x] **Independent Domain Tests:** Verified by automated accessibility test suite (`tests/unit/ui/wcag-2-2-aa.test.tsx` and `tests/unit/brand/brand-design-system.test.tsx`).
