import { CpcbPollutantId } from "@/schemas/pollutant.schema";
import { CPCB_POLLUTANT_CONFIGS } from "./cpcb-constants";

export interface WindowSufficiencyResult {
  isSufficient: boolean;
  requiredHours: number;
  actualHours: number;
  windowHours: number;
  dataAvailabilityRatio: number;
}

/**
 * Evaluates running-average data sufficiency:
 * - 24-hr window requires at least 16 valid hours (67% availability).
 * - 8-hr window requires at least 6 valid hours (75% availability).
 */
export function checkRunningWindowSufficiency(
  pollutant: CpcbPollutantId,
  validHoursInWindow: number
): WindowSufficiencyResult {
  const config = CPCB_POLLUTANT_CONFIGS[pollutant];
  const required = config.minRequiredHours;
  const total = config.averagingHours;
  const ratio = validHoursInWindow / total;

  return {
    isSufficient: validHoursInWindow >= required,
    requiredHours: required,
    actualHours: validHoursInWindow,
    windowHours: total,
    dataAvailabilityRatio: Math.min(1.0, ratio)
  };
}
