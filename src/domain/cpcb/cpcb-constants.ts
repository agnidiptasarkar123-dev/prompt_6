import { CpcbCategory } from "@/schemas/cpcb.schema";
import { CpcbPollutantId, PollutantUnit } from "@/schemas/pollutant.schema";

export interface BreakpointRange {
  category: CpcbCategory;
  aqiLo: number;
  aqiHi: number;
  bpLo: number;
  bpHi: number;
}

export interface PollutantConfig {
  name: string;
  unit: PollutantUnit;
  averagingHours: 1 | 8 | 24;
  minRequiredHours: number; // 16 for 24h, 6 for 8h
  breakpoints: BreakpointRange[];
}

/**
 * Official CPCB NAQI (2014) Breakpoints Table for all 8 parameters.
 * Concentrations in µg/m³ except CO in mg/m³.
 */
export const CPCB_POLLUTANT_CONFIGS: Record<CpcbPollutantId, PollutantConfig> = {
  "PM2.5": {
    name: "Particulate Matter 2.5",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 30 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 31, bpHi: 60 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 61, bpHi: 90 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 91, bpHi: 120 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 121, bpHi: 250 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 251, bpHi: 500 }
    ]
  },
  "PM10": {
    name: "Particulate Matter 10",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 50 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 51, bpHi: 100 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 101, bpHi: 250 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 251, bpHi: 350 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 351, bpHi: 430 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 431, bpHi: 600 }
    ]
  },
  "NO2": {
    name: "Nitrogen Dioxide",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 40 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 41, bpHi: 80 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 81, bpHi: 180 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 181, bpHi: 280 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 281, bpHi: 400 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 401, bpHi: 600 }
    ]
  },
  "O3": {
    name: "Ozone",
    unit: "µg/m³",
    averagingHours: 8,
    minRequiredHours: 6,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 50 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 51, bpHi: 100 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 101, bpHi: 168 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 169, bpHi: 208 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 209, bpHi: 748 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 749, bpHi: 1000 }
    ]
  },
  "CO": {
    name: "Carbon Monoxide",
    unit: "mg/m³", // CRITICAL: mg/m³
    averagingHours: 8,
    minRequiredHours: 6,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 1.0 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 1.1, bpHi: 2.0 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 2.1, bpHi: 10.0 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 10.1, bpHi: 17.0 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 17.1, bpHi: 34.0 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 34.1, bpHi: 50.0 }
    ]
  },
  "SO2": {
    name: "Sulfur Dioxide",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 40 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 41, bpHi: 80 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 81, bpHi: 380 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 381, bpHi: 800 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 801, bpHi: 1600 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 1601, bpHi: 2000 }
    ]
  },
  "NH3": {
    name: "Ammonia",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 200 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 201, bpHi: 400 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 401, bpHi: 800 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 801, bpHi: 1200 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 1201, bpHi: 1800 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 1801, bpHi: 2500 }
    ]
  },
  "Pb": {
    name: "Lead",
    unit: "µg/m³",
    averagingHours: 24,
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", aqiLo: 0, aqiHi: 50, bpLo: 0, bpHi: 0.5 },
      { category: "SATISFACTORY", aqiLo: 51, aqiHi: 100, bpLo: 0.6, bpHi: 1.0 },
      { category: "MODERATE", aqiLo: 101, aqiHi: 200, bpLo: 1.1, bpHi: 2.0 },
      { category: "POOR", aqiLo: 201, aqiHi: 300, bpLo: 2.1, bpHi: 3.0 },
      { category: "VERY_POOR", aqiLo: 301, aqiHi: 400, bpLo: 3.1, bpHi: 3.5 },
      { category: "SEVERE", aqiLo: 401, aqiHi: 500, bpLo: 3.6, bpHi: 5.0 }
    ]
  }
};
