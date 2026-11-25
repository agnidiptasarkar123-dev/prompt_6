# HawaSaathi — Problem Statement & Solution Architecture

> **Focus:** The Indian Urban Air Quality Crisis, Structural Gaps, and HawaSaathi's Intervention

---

## 1. The Real-World Problem in Indian Cities

Over 1.4 billion citizens in India face severe, multi-pollutant atmospheric hazards. In the Indo-Gangetic Plain and metropolitan hubs (Delhi-NCR, Kolkata, Mumbai, Bengaluru, Hyderabad, Chennai, Patna, Lucknow):
- Ambient particulate matter ($PM_{2.5}, PM_{10}$) frequently exceeds National Ambient Air Quality Standards (NAAQS) by 500% to 1,500% during winter temperature inversions and post-monsoon crop residue burning.
- Gaseous co-pollutants ($NO_2, SO_2, CO, O_3, NH_3$) create complex photochemical smog and secondary particulate formation.

### The Three Critical Gaps in Existing Solutions:
1. **The Single-Number Illusion:** Popular weather apps report a single "city AQI", obscuring the fact that air quality varies wildly across neighborhoods (e.g. Anand Vihar industrial hub vs Lodhi Road green corridor in Delhi).
2. **Hallucinated & Unscientific Calculations:** Modern consumer AI assistants frequently "hallucinate" AQI figures or compute unscientific linear averages of concentrations without applying MoEFCC piecewise interpolation or data sufficiency rules.
3. **Generic, Impractical Advice:** Generic recommendations tell users to "stay indoors" or "avoid breathing polluted air", ignoring the reality of daily metro/bus/two-wheeler commutes, natural ventilation in tropical dwellings, and multi-generational family living.

---

## 2. The HawaSaathi Solution

HawaSaathi is a personalized, scientific air quality intelligence platform designed specifically for the realities of Indian urban life:

1. **Deterministic Scientific Calculation:**
   - Ingests official CAAQMS station telemetry from `data.gov.in`.
   - Reconciles individual pollutant records and calculates sub-indices using exact MoEFCC CPCB NAQI (2014) equations.
   - Enforces the statutory 16-hour (for 24h) and 6-hour (for 8h) data sufficiency threshold. Overall AQI is strictly declared unavailable if fewer than 3 pollutants are monitored or if both PM2.5 and PM10 are missing.
2. **Transparent 4-Way Atmospheric Provenance:**
   - Clearly labels every data point with its provenance type (Type A official bulletin, Type B independently calculated, Type C raw sensor reading, Type D modeled forecast).
   - Preserves timestamps, physical units, sensor quality flags, and averaging periods.
3. **Actionable, Micro-Environment Personalization:**
   - **Commute Exposure Planner:** Compares walk, cycle, two-wheeler, auto-rickshaw, bus, metro, and AC car exposure profiles across travel times.
   - **Indoor Air Coach:** Models dwelling infiltration based on floor level, street proximity, cooking fuel, and window ventilation physics.
4. **Inclusive National Localization:**
   - Fully localized across English and all 22 Eighth Schedule Indian languages, ensuring linguistic equity from Assamese to Urdu.
