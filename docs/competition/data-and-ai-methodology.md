# HawaSaathi — Data & AI Integration Methodology

> **Focus:** Scientific CPCB AQI Calculation, Sufficiency Standard, Gemini AI Orchestration, and Defensible Evidence Grounding

---

## 1. MoEFCC CPCB NAQI (2014) Calculation Engine

HawaSaathi never prompts an LLM to guess, estimate, or calculate AQI. All air quality index calculations are executed deterministically in TypeScript according to the MoEFCC National Air Quality Index (NAQI) Final Report (2014) and verified against the official CPCB calculation workbook (`AQI-Calculator.xls`).

### 1.1 Piecewise Linear Sub-Index Equation
For each monitored pollutant $p$, the sub-index $I_p$ is calculated from concentration $C_p$ by finding the corresponding breakpoint interval $[BP_{Lo}, BP_{Hi}]$:

$$I_p = \frac{I_{Hi} - I_{Lo}}{BP_{Hi} - BP_{Lo}} \times (C_p - BP_{Lo}) + I_{Lo}$$

Where:
- $BP_{Lo}$ and $BP_{Hi}$ are concentration breakpoints.
- $I_{Lo}$ and $I_{Hi}$ are AQI sub-index category anchors ($0, 50, 100, 200, 300, 400, 500$).

### 1.2 Statutory Running-Window Sufficiency Rules
- **24-Hour Averaging ($PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$):** Requires a minimum of **16 valid hours** out of 24 (67% data availability rule).
- **8-Hour Averaging ($CO, O_3$):** Requires a minimum of **6 valid hours** out of 8 (75% data availability rule).
- If valid hours fall below these statutory thresholds, the sub-index is flagged as `INSUFFICIENT_WINDOW` and cannot be computed.

### 1.3 Station AQI Sufficiency Standard
An overall station AQI is mathematically valid ONLY IF:
1. At least **3 distinct pollutants** have sufficient data and valid sub-indices.
2. At least **ONE** of those pollutants is either $PM_{2.5}$ or $PM_{10}$.
If either condition fails, overall AQI is reported as `null` with transparent explanation: *"Overall CPCB AQI unavailable: fewer than 3 valid pollutants monitored or missing particulate parameters."*

---

## 2. Gemini Multi-Model AI Orchestration

Google Gemini is integrated to synthesize personalized, actionable environmental advice from pre-calculated physical facts without altering or recalculating scientific data.

### 2.1 The Defensible Factuality Pipeline
1. **Pre-Calculated Evidence Injection:**
   The server injects immutable facts (station name, exact CPCB AQI, category, prominent pollutant, CAMS forecast trend, and ventilation physics) into the prompt alongside structured evidence IDs (`EV-01`, `EV-02`, ...).
2. **Strict System Instructions:**
   Gemini is explicitly instructed:
   - "You are forbidden from computing, recalculating, or modifying AQI numbers."
   - "Every recommendation must cite a valid evidence ID from the provided context."
3. **Structured Output Validation:**
   Completions are parsed against Zod `RecommendationResponseSchema`. Any completion with invalid citations or malformed JSON fails validation.
4. **Deterministic Rule-Based Fallback:**
   If Gemini times out (> 5,000ms), returns schema-violating output, or fails upstream, the system immediately switches to our deterministic rule-based engine (`DeterministicRecommender`), ensuring 100% operational uptime without hallucination.
