# HawaSaathi — Phase 4 Product Experience, Architecture & UX Specification

> **Document ID:** HAWASAATHI-P4-PRODUCT-SPEC\
> **Version:** 4.0.0\
> **Status:** APPROVED ENGINEERING SPECIFICATION\
> **Target Audience:** Frontend Engineers, Backend Architects, Accessibility Leads, QA Engineers\
> **Primary Locales:** English (`en`), Bengali (`bn`), Hindi (`hi`)\
> **Compliance Standard:** OWASP ASVS 5.0.0 Level 2, WCAG 2.2 Level AA, CPCB NAQI (2014)

---

## 1. Product Mission & User Value Proposition

HawaSaathi (হাওয়াসাথী / हवासाथी) is a personalised urban air quality intelligence platform for Indian cities. It translates complex atmospheric chemistry and monitoring datasets into defensible, actionable guidance for individuals, households, and daily commuters without distorting source observations or inventing imaginary sensor values.

The product answers five essential citizen questions:
1. **Current Reality:** *What is the validated air quality around me right now?*
2. **Underlying Driver:** *Which specific pollutant ($PM_{2.5}, PM_{10}, NO_2$, etc.) is driving current severity?*
3. **Everyday Meaning:** *What does this mean for my elderly parents, children, or outdoor routine?*
4. **Actionable Step:** *What concrete action should I take today (ventilation, mask, commute timing)?*
5. **Indoor & Commute Context:** *How do cooking methods, travel windows, and room filtration change exposure?*

---

## 2. Information Architecture & Navigation Hierarchy

The product is organized into a cohesive, high-density environmental dashboard with dedicated operational views and modal overlays:

```
+---------------------------------------------------------------------------------------------------+
|  [Logo: HawaSaathi]   [Live Indicators]   [Language: EN|BN|HI]   [Alerts (Count)]   [Profile/Auth]|
+---------------------------------------------------------------------------------------------------+
|  1. LOCATION & TIMEFRAME STRIP                                                                    |
|     - State / City / Station Selector  |  Geographic Coordinates  |  Data Freshness Badge         |
+---------------------------------------------------------------------------------------------------+
|  2. PRIMARY AIR QUALITY STATUS & EVIDENCE PANEL                                                   |
|     - Validated CPCB AQI Badge (Type A/B) or Explicit UNAVAILABLE with Reason                      |
|     - Prominent Pollutant Breakdown with Sub-Index Values                                         |
|     - Provenance Inspector (Station ID, Lat/Lon, Provider, Retrieval UTC vs Observation UTC)      |
+---------------------------------------------------------------------------------------------------+
|  3. MONITORED POLLUTANT MATRIX (8 Statutory Parameters)                                           |
|     - PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb                                                      |
|     - Verified Units, Averaging Period (24h/8h/1h), Sufficiency Status                            |
+---------------------------------------------------------------------------------------------------+
|  4. DUAL EXPLORATION: GEOGRAPHIC MAP & STATION SELECTOR                                           |
|     - OpenStreetMap / Leaflet Stations Layer with CPCB Colour-Coded Markers                       |
|     - Keyboard-Accessible Alternative Station List with Distance & Reporting Status               |
+---------------------------------------------------------------------------------------------------+
|  5. 72-HOUR ATMOSPHERIC DISPERSION FORECAST (Type D CAMS Global ~45 km)                           |
|     - Hourly PM2.5 / PM10 / NO2 Trajectories with Explicit MODEL_FORECAST Tagging                |
+---------------------------------------------------------------------------------------------------+
|  6. PERSONALISED ACTION & HOUSEHOLD WORKFLOWS                                                     |
|     - Personalised Recommendation Cards (Mask, Exercise, Vulnerable Member Precautions)          |
|     - Gemini AI Grounded Explanation with Verified Citation Badges (or Deterministic Fallback)    |
|     - Commute Exposure Planner (Departure Window, Mode, Route Nearest-Station Interpolation)      |
|     - Indoor Air Quality & Source Control Coach (CADR Sizing, Cooking Ventilation, ACH Rules)      |
+---------------------------------------------------------------------------------------------------+
|  7. SYSTEM MODALS & DRAWERS                                                                       |
|     - In-App Notification Center & Alert Preferences (Hysteresis, Quiet Hours, Custom Threshold)  |
|     - Household Context Manager (Dynamic Anti-Enum Members, Age Bands, Sensitivities)             |
|     - Full Provenance & Methodology Audit Inspector                                               |
|     - Authentication & Data Sovereignty Center (1-Click JSON Export, 1-Click Hard Delete)         |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Core User Journeys

### Journey 1: First-Time Guest Citizen Onboarding
- **Entry:** User arrives at `/` on mobile or desktop browser.
- **Privacy Assurance:** Zero mandatory sign-up, zero cookies beyond essential security tokens.
- **Default Baseline:** Nearest major urban centroid (e.g. Kolkata) loaded with live CPCB station data.
- **Language Selection:** Language toggle in header immediately switches UI between English, বাংলা (Bengali), and हिन्दी (Hindi).
- **Guest State Boundary:** Saved city or non-diagnostic household filters are stored strictly in `sessionStorage`.

### Journey 2: Commute & Exposure Planning
- **Goal:** User wants to know whether to cycle, take metro, or walk at 8:30 AM.
- **Inputs:** Origin station/neighborhood, destination, commute mode, departure hour.
- **Environmental Grounding:** System queries observation and CAMS forecast at the departure window.
- **Honest Guidance:** System explicitly states: *"Route guidance based on nearest monitoring stations (Victoria Memorial & Rabindra Bharati). No route-level micro-sensor interpolation invented."*

### Journey 3: Indoor Environment & CADR Optimization
- **Goal:** Resident wants to reduce indoor PM2.5 without an indoor sensor.
- **Inputs:** Room volume ($m^3$), cooking fuel (LPG / Induction / Solid), purifier CADR ($m^3/h$).
- **Deterministic Evaluation:**
  - If outdoor AQI is POOR or worse, open-window ventilation is restricted.
  - Air changes per hour ($\text{ACH} = \text{CADR} / \text{Volume}$) is calculated with documented assumptions.
  - Transparent disclaimer: *"Indoor AQI is an estimate based on filtration mechanics; physical indoor sensor readings are not simulated."*

### Journey 4: In-App Alerts & Hysteresis Protection
- **Goal:** Citizen wants notifications when air quality shifts to SEVERE.
- **Mechanics:**
  - Severity thresholds: MODERATE (101), POOR (201), VERY POOR (301), SEVERE (401).
  - Hysteresis: Alert triggers only when crossing threshold with a 5-point buffer (e.g. crossing 305 upward, clearing below 295 downward) to prevent notification fatigue.
  - Quiet Hours: User can configure quiet hours (e.g. 22:00 - 06:00) during which non-emergency alerts are suppressed.

---

## 4. Component Hierarchy & Modular Architecture

```
src/
├── components/
│   ├── air-quality/
│   │   ├── aqi-summary-card.tsx       # Primary AQI metric, category, freshness badge
│   │   └── pollutant-grid.tsx         # 8-pollutant interactive card matrix
│   ├── alerts/
│   │   ├── notification-center.tsx    # In-app alert drawer with unread badges
│   │   └── alert-preferences-modal.tsx# Thresholds, quiet hours, delivery toggle
│   ├── commute/
│   │   └── commute-planner.tsx        # Route exposure, departure window, mode selector
│   ├── indoor/
│   │   └── indoor-coach-panel.tsx     # CADR calculator, ventilation rules, source control
│   ├── household/
│   │   ├── household-modal.tsx        # Multi-generational members, age bands, sensitivities
│   │   └── user-profile-card.tsx      # DPDP consent, account actions, data export/delete
│   ├── dashboard/
│   │   ├── location-search.tsx        # Autocomplete search with debounce & recent locations
│   │   └── quick-filter-strip.tsx     # State / City quick chips
│   ├── forecast/
│   │   └── forecast-chart.tsx         # SVG 72-hour CAMS trajectory with tooltip
│   ├── maps/
│   │   └── station-map.tsx            # Leaflet / OSM carto tile view with popup metadata
│   ├── recommendations/
│   │   └── recommendations-panel.tsx  # Evidence-grounded cards with Gemini/deterministic badges
│   ├── stations/
│   │   └── station-panel.tsx          # Accessible table & list with sorting & filtering
│   └── shared/
│       ├── navbar.tsx                 # Header with language toggle, alert pill, auth button
│       ├── footer.tsx                 # Legal attribution, OSM copyright, CPCB NAQI notice
│       └── provenance-modal.tsx       # Full JSON provenance & measurement metadata dialog
```

---

## 5. Responsive Design & Accessibility Invariants (WCAG 2.2 AA)

1. **Target Viewports:**
   - Mobile: 320px, 360px, 390px, 430px.
   - Tablet: 768px, 1024px.
   - Desktop: 1280px, 1440px, 1920px.
2. **Reflow & Overflow:** Zero horizontal scrollbars at 320px viewport width (WCAG 1.4.10).
3. **Contrast Ratio:** Minimum 4.5:1 for body text against dark backgrounds (`#020617` / `#0f172a`), 3:1 for graphical UI indicators and badges (WCAG 1.4.3 & 1.4.11).
4. **Touch Target Size:** Minimum 24×24 CSS pixels with adequate spacing, 44×44 CSS pixels for primary interactive touch controls on mobile (WCAG 2.5.8).
5. **Keyboard Operability:** Complete tab navigation order across all search inputs, station selectors, modal dialogs, and map fallback lists. Focus is never obscured (WCAG 2.4.11) or trapped (WCAG 2.1.2).

---

## 6. Error & Degraded States Handling Contract

| Subsystem Failure | UI Representation | Degradation Protocol |
| :--- | :--- | :--- |
| **CPCB API Outage** | Amber warning banner with provider status | Display cached data with explicit `STALE` badge & timestamp; switch to OpenAQ if available. |
| **Insufficient Data (<3 pollutants)** | AQI badge displays `UNAVAILABLE` | Show individual pollutant measurements; explain missing PM2.5/PM10 or insufficient 16h window. |
| **Gemini 503 Spike** | Explanations tagged `DETERMINISTIC_RULES` | Zero impact on user guidance; rules engine provides immediate safe recommendations. |
| **Firestore Disabled** | Profile modal shows `CLOUD_PERSISTENCE_UNAVAILABLE` | Guest mode remains fully active; local session storage preserves preferences. |
| **Offline Network** | Top sticky banner: `OFFLINE_MODE` | Render latest cached observations from localStorage; disable live refetching. |
