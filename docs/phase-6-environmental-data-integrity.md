# HawaSaathi — Phase 6 Environmental Data Integrity & Scientific Provenance

**Document ID:** `HS-SCI-P6-DATA-2026`\
**Scientific Standard:** MoEFCC CPCB NAQI (2014) Final Report / CUPS/82/2014-15\
**Reconciliation Reference:** Official CPCB AQI Calculator (`AQI-Calculator.xls`)\

---

## 1. Four-Way Data Typology Contract

HawaSaathi eliminates ambiguity in environmental measurements by enforcing a strict four-way typology across the entire data lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FOUR-WAY DATA TYPOLOGY MATRIX                         │
├─────────────────┬──────────────────────────────────────────┬────────────────┤
│ Typology Tag    │ Physical Meaning                         │ Engine/Source  │
├─────────────────┼──────────────────────────────────────────┼────────────────┤
│ TYPE_A_OFFICIAL │ Official CPCB-published bulletin AQI     │ CAAQMS Portal  │
│ TYPE_B_CALCULATED│ Independently calculated CPCB AQI       │ HawaSaathi CPCB│
│ TYPE_C_RAW      │ Verified physical sensor concentration   │ Hardware Feed  │
│ TYPE_D_FORECAST │ Modelled atmospheric chemistry forecast  │ CAMS Global 45k│
└─────────────────┴──────────────────────────────────────────┴────────────────┘
```

---

## 2. Regulatory Averaging Windows & Data Sufficiency

### 2.1 Statutory Averaging Windows
- **24-Hour Statutory Average:** Required for $PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$.
  - Minimum Data Sufficiency: **16 hours** of valid hourly readings within the 24-hour window (67% rule).
- **8-Hour Running Average:** Required for $CO$ (in $\text{mg/m}^3$) and $O_3$ (in $\mu\text{g/m}^3$).
  - Minimum Data Sufficiency: **6 hours** of valid hourly readings within the 8-hour window (75% rule).

### 2.2 Overall Station AQI Calculation Constraint
A station AQI is valid and computable ONLY IF:
1. At least **3 distinct monitored pollutants** possess valid sub-indices.
2. At least **one of the 3 pollutants is a particulate** ($PM_{2.5}$ or $PM_{10}$).
- If data sufficiency fails, the overall AQI is reported as `null` with an explicit notice to the user: *"Overall CPCB AQI unavailable: fewer than 3 valid pollutants monitored or missing particulate parameters."* Individual verified pollutant concentrations are displayed alongside their raw physical values.

---

## 3. Disclaimers for Estimated Engineering Models

- **Commute Inhalation Exposure:** Multipliers for commute modes (Walk, Cycle, Auto, Cab/Car with Recirculation, AC Metro) represent empirical environmental engineering estimates based on published literature, NOT personal clinical dosimeters.
- **Indoor Coach Box Model:** Clean Air Delivery Rate (CADR) and Air Changes per Hour (ACH) calculations are single-zone mass-balance approximations. UI explicitly disclaims: *"Guidance is an engineering approximation based on room dimensions. No indoor sensor is installed."*
