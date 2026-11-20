import { CpcbPollutantId } from "@/schemas/pollutant.schema";
import { CPCB_POLLUTANT_CONFIGS } from "./cpcb-constants";

export interface WindowSufficiencyResult {
  isSufficient: boolean;
  requiredHours: number;
  actualHours: number;
  windowHours: number;
  dataAvailabilityRatio: number;
  regulatoryStatus: "STATUTORY_CPCB_2014" | "SECONDARY_75_PERCENT_CRITERION" | "ACUTE_1_HOUR_PEAK";
  sufficiencyNote: string;
}

/**
 * Evaluates running-average data sufficiency:
 * - 24-hr window requires at least 16 valid hours (66.7% availability, statutory MoEFCC 2014).
 * - 8-hr window requires at least 6 valid hours (75.0% availability, adapted from CAAQMS/USEPA).
 * - 1-hr peak requires at least 1 valid hour.
 */
export function checkRunningWindowSufficiency(
  pollutant: CpcbPollutantId,
  validHoursInWindow: number,
  windowHoursOverride?: 1 | 8 | 24
): WindowSufficiencyResult {
  const config = CPCB_POLLUTANT_CONFIGS[pollutant];
  const windowHours = windowHoursOverride ?? config.standardAveragingHours;

  let requiredHours: number;
  let regulatoryStatus: "STATUTORY_CPCB_2014" | "SECONDARY_75_PERCENT_CRITERION" | "ACUTE_1_HOUR_PEAK";
  let sufficiencyNote: string;

  if (windowHours === 24) {
    requiredHours = 16;
    regulatoryStatus = "STATUTORY_CPCB_2014";
    sufficiencyNote = "Statutory CPCB NAQI (2014) Section 4.1 rule: minimum 16 valid hours required for 24-hour average.";
  } else if (windowHours === 8) {
    requiredHours = 6;
    regulatoryStatus = "SECONDARY_75_PERCENT_CRITERION";
    sufficiencyNote = "Adapted 75% completeness criterion (6 out of 8 hours) from CAAQMS / USEPA guidelines. Identified as secondary regulatory standard pending explicit MoEFCC gazette update.";
  } else {
    requiredHours = 1;
    regulatoryStatus = "ACUTE_1_HOUR_PEAK";
    sufficiencyNote = "1-hour acute monitoring window for high Ozone spikes (> 208 µg/m³).";
  }

  const ratio = validHoursInWindow / windowHours;

  return {
    isSufficient: validHoursInWindow >= requiredHours,
    requiredHours,
    actualHours: validHoursInWindow,
    windowHours,
    dataAvailabilityRatio: Math.min(1.0, Math.max(0, ratio)),
    regulatoryStatus,
    sufficiencyNote
  };
}
