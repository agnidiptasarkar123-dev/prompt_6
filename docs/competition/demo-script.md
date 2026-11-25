# HawaSaathi — Live Evaluator Demo Script & Walkthrough

> **Evaluation Mode:** Standalone Local Walkthrough & Live Interactive Verification\
> **Estimated Walkthrough Duration:** 5–7 Minutes\
> **Prerequisites:** Modern Web Browser (Chrome, Firefox, Safari, or Edge)

---

## 1. Quick Start Execution

1. Start the production development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 2. Step-by-Step Evaluator Walkthrough

### Step 1: Zero-Friction Urban Discovery (Guest Mode)
- **Action:** Notice the application loads immediately in privacy-preserving **Guest Mode**.
- **Action:** Type `"Delhi"` in the location search bar. Select `"New Delhi, Delhi"`.
- **Observation:**
  - The map highlights verified CAAQMS monitoring stations within a 25 km radius.
  - The primary station loads with its current calculated AQI (e.g. `280 POOR`).
  - Notice the badge: `Type B: CPCB Calculated`, indicating this number was independently verified using statutory piecewise linear interpolation.

### Step 2: Scientific Transparency & Provenance Drilldown
- **Action:** Click the **"Data Provenance"** button on the AQI Summary Card.
- **Observation:**
  - A modal opens presenting the exact legal and mathematical audit trail:
    - Provider: `CPCB_CAAQMS` via `data.gov.in`.
    - Station identifier and geographic coordinates.
    - Observation timestamp vs ingestion timestamp.
    - Individual pollutant breakdown ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$) with averaging periods and valid hours.
  - Close the modal with the close button or by pressing `Escape`.

### Step 3: Multi-Modal Commute Exposure Planner
- **Action:** Scroll to the **Commute Exposure Planner**.
- **Action:** Toggle between transport modes: **WALK**, **CYCLE**, **TWO_WHEELER**, **AUTO**, **BUS**, **METRO**, and **AC_CAR**.
- **Observation:**
  - Notice how estimated exposure changes based on physical ventilation and transit micro-environments. Two-wheeler exposure is 5x higher than air-conditioned Metro transit due to in-traffic proximity and absence of HEPA filtration.

### Step 4: Indoor Air Coach & Dwelling Infiltration
- **Action:** Navigate to the **Indoor Air Coach** panel.
- **Action:** Select dwelling parameters: Floor Level (Ground vs 5th+), Proximity to Road, and Cooking Fuel (LPG vs Solid).
- **Observation:**
  - Recommendations adjust dynamically: on high-AQI days with outdoor wind stagnation, the coach recommends natural cross-ventilation during mid-day dispersion windows only, with source control for indoor particulate generation.

### Step 5: Inclusive National Localization (23 Languages)
- **Action:** Click the language selector in the navigation bar.
- **Action:** Select **বাংলা (Bengali)**, **हिन्दी (Hindi)**, or **اردو (Urdu)**.
- **Observation:**
  - The entire interface transforms instantly into the selected Indian scheduled language.
  - For Urdu (`ur-IN`), notice the layout direction cleanly switches to **RTL** (Right-to-Left), while statutory acronyms ($AQI, PM_{2.5}$) preserve scientific left-to-right number orientation.

### Step 6: DPDP Act (2023) Data Rights Verification
- **Action:** Click **"Sign In"** in the navigation bar. Sign in with Google or Email link.
- **Action:** Open Account Settings. Click **"1-Click Data Export (JSON)"**. Notice your complete profile downloads instantly.
- **Action:** Click **"Delete Account"**. Confirm deletion. Notice your profile and active sessions are permanently erased from Firestore and local storage.
