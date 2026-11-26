# HawaSaathi 🌍
### AI-Powered Urban Air Quality Intelligence Platform

**Live Application:** https://prompt-6-lemon.vercel.app/  
**GitHub Repository:** https://github.com/agnidiptasarkar123-dev/prompt_6

---

## 1. Project Overview

HawaSaathi is an AI-powered urban air quality intelligence platform designed to help individuals and families understand air pollution and make informed everyday decisions.

Air quality information is often presented as numerical readings or AQI values, leaving people unsure about what those measurements mean and how they should respond.

HawaSaathi addresses this gap by combining environmental data, contextual recommendations, AI-powered assistance, indoor air quality tools and interactive environmental education in a single platform.

The goal is to make air quality information understandable, accessible and actionable.

## 2. Chosen Challenge Vertical

**Challenge 6 — Urban Air Quality Assistant**

HawaSaathi is designed around the Urban Air Quality Assistant challenge.

The solution focuses on helping families and communities navigate urban air pollution through:

- Understanding local air quality and pollutant concentrations.
- Receiving contextual guidance for everyday activities.
- Learning about indoor air quality and ventilation.
- Exploring sustainable alternatives to daily activities.
- Understanding the environmental impact of personal choices.
- Accessing environmental education through AI-assisted learning.

The platform is designed primarily for Indian urban environments, with a focus on making environmental information useful to everyday users.

## 3. Approach and Logic

HawaSaathi follows a data-driven and context-aware approach. Instead of treating an AI chatbot as the entire solution, the platform combines environmental data, deterministic calculations, rule-based decision-making and generative AI.

### A. Environmental Data Integration

The platform integrates environmental information from sources including:

- CPCB-related datasets and data.gov.in.
- OpenAQ API v3.
- Open-Meteo CAMS Global air quality forecasts.

Available measurements are used to present pollutant information, monitoring station details and forecast visualisations.

The platform distinguishes ground monitoring observations from model-based forecasts to preserve data provenance.

### B. Context-Aware Recommendations

HawaSaathi uses available air quality information and relevant household context to provide practical recommendations.

Its decision-making approach combines deterministic rules with AI-generated explanations.

This helps users understand why a recommendation is being made and what assumptions are involved.

### C. Deterministic Impact Calculations

Environmental impact calculations are handled through defined calculation logic rather than relying entirely on generated AI responses.

The sustainable alternatives engine compares supported activities and estimates the difference in carbon emissions using defined emission factors and assumptions.

### D. AI-Powered Assistance

Google Gemini powers the conversational assistance features.

The assistant uses relevant environmental context to explain pollution-related information and respond to user questions.

A separate Learning Agent is designed specifically for educational interactions within the Learning Centre.

### E. Data Reliability

The application distinguishes between measured, calculated, forecast and unavailable information.

Unverified units are not treated as valid inputs for sub-index calculations, and missing pollutant measurements are not represented as zero.

This reduces the risk of presenting misleading environmental information.

## 4. How the Solution Works

The application is organised into interconnected workspaces.

### 4.1 Overview Dashboard

Provides an overview of available environmental information, including eight major pollutants:

- PM2.5
- PM10
- Nitrogen Dioxide (NO2)
- Sulphur Dioxide (SO2)
- Carbon Monoxide (CO)
- Ozone (O3)
- Ammonia (NH3)
- Lead (Pb)

Users can inspect pollutant concentrations, measurement sources, verification status and available sub-indices.

The dashboard also presents contextual health and routine actions.

### 4.2 Explore Map

Provides a geographical view of available air quality information and monitoring locations.

### 4.3 Monitoring Stations

Allows users to explore monitoring stations and their available environmental observations.

Station status is considered when presenting monitoring information.

### 4.4 Insights

Helps users explore available environmental information and understand air quality conditions through the platform's insight interface.

### 4.5 Daily Planner

Provides guidance for everyday activities using available environmental information and relevant household context.

Users can consider air quality conditions while planning outdoor activities and daily routines.

### 4.6 Indoor Air

Provides indoor air quality guidance and ventilation-related information.

The platform includes Air Changes per Hour (ACH) calculations and distinguishes calculated ventilation metrics from actual indoor sensor measurements.

### 4.7 Intelligent Agent

Provides an AI-assisted interface for exploring environmental information and air quality-related questions.

### 4.8 AI Chat Assistant

Uses Google Gemini to answer natural-language questions about pollutants, air quality and practical precautions.

Responses support structured formatting, including headings, lists, tables and mathematical expressions.

### 4.9 Alerts

Provides access to the application's available air quality alerts and notifications.

### 4.10 Learning Centre

An interactive environmental education workspace covering:

- Eight major air pollutants.
- CPCB National Air Quality Index.
- Environmental data types (Type A–D).
- Clean Air Delivery Rate (CADR).
- Indoor ventilation.

Each topic includes Beginner, Intermediate and Advanced learning levels.

Additional learning tools include:

- Interactive flashcards.
- Quick quizzes.
- Revision mode.
- Topic recaps.
- Learn Mode.
- A dedicated topic-focused Learning Agent.

### 4.11 Sustainable Alternatives

Helps users explore alternatives to everyday activities and understand their estimated carbon emissions impact.

Calculations use defined emission factors and disclose relevant assumptions.

### 4.12 Settings and Accessibility

Provides available application preferences and visual accessibility options, including Light Mode, Dark Mode and High Contrast.

The interface is designed to support different screen sizes and accessible interactions.

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Next.js API Routes |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Rate Limiting | Upstash Redis |
| Generative AI | Google Gemini |
| Environmental Data | CPCB-related sources, OpenAQ, Open-Meteo CAMS |
| Deployment | Vercel |

## 6. Assumptions and Limitations

HawaSaathi uses the following assumptions to keep its recommendations and calculations transparent.

1. **Monitoring station representation:** A station's measurement represents its monitoring location and surrounding area. It does not establish the exact air quality or personal exposure of every individual in that area.

2. **Forecast interpretation:** CAMS data represents model-based atmospheric forecasts, not direct ground-level sensor measurements. Hourly forecast values may be interpolated from the underlying model's native temporal resolution.

3. **Personal exposure:** Ambient air quality readings are used as environmental indicators. They are not presented as direct measurements of an individual's inhaled pollutant dose.

4. **Indoor air measurements:** Indoor PM2.5 is labelled as measured only when suitable validated sensor data is available, sufficiently fresh and expressed in the correct unit. Ventilation calculations such as ACH are identified as calculated values.

5. **Emissions estimates:** Carbon emissions calculations depend on defined vehicle categories, emission factors, travel distance and occupancy assumptions. Results are estimates, not direct measurements, and are not presented as universal emission values.

6. **AI-generated guidance:** Gemini responses are informational and depend on the quality and availability of the supplied context. They should not be treated as medical diagnoses or emergency instructions.

7. **Data availability:** External data providers may have missing, delayed, stale or unavailable measurements. HawaSaathi aims to preserve these limitations rather than inventing missing values.

8. **Learning Agent scope:** The dedicated Learning Agent is intended for environmental education and operates separately from the general AI Chat Assistant.

9. **Guest learning progress:** Guest learning progress is maintained locally for the session and does not require cloud persistence.

## 7. Security, Testing and Accessibility

The project considers the following engineering areas:

- Input validation and controlled AI interactions.
- Safe Markdown and mathematical expression rendering.
- Environment-based configuration for sensitive credentials.
- Rate limiting for API protection.
- Automated unit and integration testing.
- Code coverage and mutation testing.
- Browser-based end-to-end testing.
- Responsive layouts and accessibility-focused interactions.
- Multiple visual themes, including High Contrast.

### Verification Commands

Run the following commands from the project directory:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run test:mutation
npm run build
```

Browser end-to-end verification:

```bash
node --experimental-strip-types scripts/run-browser-e2e.ts
```

## 8. Local Development Setup

### Prerequisites

- Node.js 24.x
- npm
- Git
- A Firebase project
- Required API credentials for the configured integrations

### Installation

Clone the repository:

```bash
git clone https://github.com/agnidiptasarkar123-dev/prompt_6.git
```

Navigate to the project directory:

```bash
cd prompt_6
```

Install dependencies:

```bash
npm ci
```

Configure the environment variables required by the application and its integrations. Keep all credentials private and never commit `.env.local`, service account files or API secrets.

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 9. Project Links

- **Live Application:** https://prompt-6-lemon.vercel.app/
- **Public GitHub Repository:** https://github.com/agnidiptasarkar123-dev/prompt_6

---

## 10. Conclusion

HawaSaathi aims to bridge the gap between environmental data and everyday decision-making.

By bringing together air quality monitoring, forecast visualisation, context-aware recommendations, AI-powered assistance, indoor air tools, sustainable alternatives and interactive environmental education, it provides a unified platform for understanding urban air pollution.

**HawaSaathi — Breathe smarter. Live better.**
