// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { CpcbPollutantIdSchema, PollutantUnitSchema } from "./pollutant.schema";
import { ObservationQualityFlagSchema } from "./freshness.schema";

/**
 * CPCB NAQI Health Categories (MoEFCC 2014)
 */
export const CpcbCategorySchema = z.enum([
  "GOOD",          // 0 - 50
  "SATISFACTORY",  // 51 - 100
  "MODERATE",      // 101 - 200
  "POOR",          // 201 - 300
  "VERY_POOR",     // 301 - 400
  "SEVERE"         // 401 - 500 (and extrapolated beyond 500)
]);

export type CpcbCategory = z.infer<typeof CpcbCategorySchema>;

/**
 * Calculated sub-index for an individual pollutant.
 * Distinguishes:
 * 1. Integer rounded subIndex (can exceed 500 if formula continues beyond nominal anchor).
 * 2. Full-precision raw mathematical subIndex (unrounded float).
 * 3. Whether the result exceeds nominal AQI 500 calculation scale (isBeyondNominalScale).
 * 4. Display ceiling capped value (reportingCeilingCappedAqi: min(500, subIndex) for visual gauges).
 */
export const CpcbSubIndexSchema = z.object({
  pollutant: CpcbPollutantIdSchema,
  concentration: z.number().nonnegative(),
  unit: PollutantUnitSchema,
  subIndex: z.number().int().min(0).nullable(),
  rawMathematicalSubIndex: z.number().min(0).nullable(),
  category: CpcbCategorySchema.nullable(),
  windowHours: z.union([z.literal(1), z.literal(8), z.literal(24)]),
  validHours: z.number().int().min(0).max(24),
  qualityFlag: ObservationQualityFlagSchema,
  isBeyondNominalScale: z.boolean().default(false),
  reportingCeilingCappedAqi: z.number().int().min(0).max(500).nullable()
});

export type CpcbSubIndex = z.infer<typeof CpcbSubIndexSchema>;

/**
 * Overall CPCB AQI Calculation Result:
 * Strictly enforces that overall AQI is null when fewer than 3 pollutants are available
 * or when both PM2.5 and PM10 are missing.
 * Preserves un-clamped mathematical AQI while providing display-capped metric.
 */
export const CpcbAqiResultSchema = z.object({
  stationId: z.string().min(1),
  calculatedAtUtc: z.string().datetime(),
  overallAqi: z.number().int().min(0).nullable(),
  rawMathematicalAqi: z.number().min(0).nullable(),
  category: CpcbCategorySchema.nullable(),
  prominentPollutant: CpcbPollutantIdSchema.nullable(),
  sufficiencyStatus: z.enum(["SUFFICIENT", "INSUFFICIENT_DATA"]),
  completenessPolicy: z.enum([
    "OFFICIAL_CPCB_STATUTORY_16H",
    "ADAPTED_HAWASAATHI_6H"
  ]),
  subIndices: z.array(CpcbSubIndexSchema),
  isBeyondNominalScale: z.boolean().default(false),
  reportingCeilingCappedAqi: z.number().int().min(0).max(500).nullable(),
  explanation: z.string().min(1)
});

export type CpcbAqiResult = z.infer<typeof CpcbAqiResultSchema>;
