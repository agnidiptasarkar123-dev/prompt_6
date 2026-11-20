import { z } from "zod";

/**
 * Quality and freshness flag for sensor telemetry.
 */
export const ObservationQualityFlagSchema = z.enum([
  "VERIFIED",                     // Real-time sensor reading within 4 hours, verified sufficiency
  "PROVISIONAL",                  // Reading verified but awaiting 24h rolling window completion
  "STALE",                        // Observation timestamp is older than 4 hours
  "SUSPECT_EXTREME",              // Physical reading exceeds historical distribution but preserved in full
  "INSUFFICIENT_WINDOW",          // Fewer than 16 hours (24h) or 6 hours (8h) available in window
  "INVALID_SENSOR_READING",       // Negative concentration, NaN, or analyzer offline sentinel (e.g. -999)
  "CONFLICTING_MEASUREMENT",      // Multiple contradictory readings for the same station & pollutant
  "INCOMPATIBLE_AVERAGING_WINDOW" // Averaging window does not match regulatory standard for the pollutant
]);

export type ObservationQualityFlag = z.infer<typeof ObservationQualityFlagSchema>;

export const ObservationFreshnessSchema = z.object({
  observationTimestampUtc: z.string().datetime(),
  retrievalTimestampUtc: z.string().datetime(),
  ageMinutes: z.number().nonnegative(),
  isCached: z.boolean(),
  qualityFlag: ObservationQualityFlagSchema
});

export type ObservationFreshness = z.infer<typeof ObservationFreshnessSchema>;
