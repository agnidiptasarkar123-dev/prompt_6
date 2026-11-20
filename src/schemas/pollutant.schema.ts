import { z } from "zod";

/**
 * 8 Official CPCB Monitored Pollutant Identifiers (MoEFCC NAQI 2014)
 */
export const CpcbPollutantIdSchema = z.enum([
  "PM2.5",
  "PM10",
  "NO2",
  "SO2",
  "CO",
  "O3",
  "NH3",
  "Pb"
]);

export type CpcbPollutantId = z.infer<typeof CpcbPollutantIdSchema>;

/**
 * Official regulatory units of measurement:
 * - Carbon Monoxide (CO) is measured in mg/m³
 * - All other 7 parameters are measured in µg/m³
 */
export const PollutantUnitSchema = z.enum(["µg/m³", "mg/m³"]);
export type PollutantUnit = z.infer<typeof PollutantUnitSchema>;

/**
 * Standard CPCB Regulatory Averaging Windows:
 * - 24 hours: PM10, PM2.5, NO2, SO2, NH3, Pb
 * - 8 hours: CO, O3 (with optional 1h peak for ozone > 208 µg/m³)
 */
export const AveragingWindowHoursSchema = z.union([
  z.literal(1),
  z.literal(8),
  z.literal(24)
]);
export type AveragingWindowHours = z.infer<typeof AveragingWindowHoursSchema>;

/**
 * Schema representing a single physical pollutant concentration measurement.
 */
export const RawPollutantMeasurementSchema = z.object({
  pollutant: CpcbPollutantIdSchema,
  concentration: z.number().nonnegative(),
  unit: PollutantUnitSchema,
  averagingWindowHours: AveragingWindowHoursSchema,
  recordedAtUtc: z.string().datetime(),
  validHoursInWindow: z.number().int().min(0).max(24)
});

export type RawPollutantMeasurement = z.infer<typeof RawPollutantMeasurementSchema>;

/**
 * Trusted Aggregation Boundary Type:
 * Ensures only measurements that have passed through the rolling-window aggregator
 * and satisfied continuity, temporal, and station identity validation can be used
 * for official station AQI computation. Prevents raw caller-supplied data from
 * bypassing the rolling-window aggregation boundary.
 */
export const ValidatedAggregatedMeasurementSchema = z.object({
  brand: z.literal("VALIDATED_AGGREGATED_MEASUREMENT"),
  pollutant: CpcbPollutantIdSchema,
  concentration: z.number().nonnegative(),
  unit: PollutantUnitSchema,
  averagingWindowHours: AveragingWindowHoursSchema,
  recordedAtUtc: z.string().datetime(),
  validHoursInWindow: z.number().int().min(0).max(24),
  stationId: z.string().min(1),
  isAggregationValidated: z.literal(true),
  completenessPolicy: z.enum([
    "OFFICIAL_CPCB_STATUTORY_16H", // 16h of 24h (CPCB 2014)
    "ADAPTED_HAWASAATHI_6H"         // 6h of 8h (adapted secondary criterion)
  ])
});

export type ValidatedAggregatedMeasurement = z.infer<typeof ValidatedAggregatedMeasurementSchema>;
