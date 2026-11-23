// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const OpenMeteoHourlyUnitsSchema = z.object({
  time: z.string().optional(),
  pm2_5: z.string().optional(),
  pm10: z.string().optional(),
  nitrogen_dioxide: z.string().optional(),
  sulphur_dioxide: z.string().optional(),
  carbon_monoxide: z.string().optional(),
  ozone: z.string().optional()
});

export const OpenMeteoHourlySchema = z.object({
  time: z.array(z.string()),
  pm2_5: z.array(z.number().nullable()).optional(),
  pm10: z.array(z.number().nullable()).optional(),
  nitrogen_dioxide: z.array(z.number().nullable()).optional(),
  sulphur_dioxide: z.array(z.number().nullable()).optional(),
  carbon_monoxide: z.array(z.number().nullable()).optional(),
  ozone: z.array(z.number().nullable()).optional()
});

export const OpenMeteoApiResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  utc_offset_seconds: z.number().optional(),
  timezone: z.string().optional(),
  timezone_abbreviation: z.string().optional(),
  elevation: z.number().optional(),
  hourly_units: OpenMeteoHourlyUnitsSchema.optional(),
  hourly: OpenMeteoHourlySchema
});
export type OpenMeteoApiResponse = z.infer<typeof OpenMeteoApiResponseSchema>;
