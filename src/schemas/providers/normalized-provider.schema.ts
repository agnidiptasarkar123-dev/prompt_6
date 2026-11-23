// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { CpcbPollutantIdSchema, type CpcbPollutantId } from "../pollutant.schema";

export type PollutantType = CpcbPollutantId;
export const PollutantTypeSchema = CpcbPollutantIdSchema;

export const DataTypologySchema = z.enum([
  "TYPE_A_OFFICIAL_AQI",
  "TYPE_B_CALCULATED_AQI",
  "TYPE_C_RAW_MEASUREMENT",
  "TYPE_D_MODEL_FORECAST"
]);
export type DataTypology = z.infer<typeof DataTypologySchema>;

export const QualityFlagSchema = z.enum([
  "VERIFIED",
  "PROVISIONAL",
  "SUSPICIOUS",
  "STALE",
  "MODEL_FORECAST"
]);
export type QualityFlag = z.infer<typeof QualityFlagSchema>;

export const AveragingPeriodSchema = z.enum(["1h", "8h", "24h", "UNKNOWN"]);
export type AveragingPeriod = z.infer<typeof AveragingPeriodSchema>;

export const NormalizedStationSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceKm: z.number().nonnegative().optional(),
  availablePollutants: z.array(PollutantTypeSchema),
  lastReportedAt: z.string().nullable(),
  license: z.string().min(1),
  attribution: z.string().min(1)
});
export type NormalizedStation = z.infer<typeof NormalizedStationSchema>;

export const NormalizedObservationSchema = z.object({
  id: z.string().min(1),
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  providerId: z.string().min(1),
  pollutant: PollutantTypeSchema,
  value: z.number().nonnegative(),
  unit: z.string().min(1),
  averagingPeriod: AveragingPeriodSchema,
  typology: DataTypologySchema,
  observationTime: z.string().datetime(),
  sourceUpdateTime: z.string().nullable(),
  retrievalTime: z.string().datetime(),
  qualityFlag: QualityFlagSchema,
  license: z.string().min(1),
  attribution: z.string().min(1)
});
export type NormalizedObservation = z.infer<typeof NormalizedObservationSchema>;

export const NormalizedForecastSchema = z.object({
  id: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  modelDomain: z.string().min(1),
  spatialResolutionKm: z.number().positive(),
  temporalResolutionHours: z.number().positive(),
  pollutant: PollutantTypeSchema,
  forecastValue: z.number().nonnegative(),
  unit: z.string().min(1),
  validTime: z.string().datetime(),
  issueTime: z.string().nullable(),
  retrievalTime: z.string().datetime(),
  typology: z.literal("TYPE_D_MODEL_FORECAST"),
  license: z.string().min(1),
  attribution: z.string().min(1)
});
export type NormalizedForecast = z.infer<typeof NormalizedForecastSchema>;
