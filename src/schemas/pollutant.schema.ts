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
