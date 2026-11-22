// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

/**
 * 5-Day Modelled Atmospheric Dispersion Forecast Schema (Open-Meteo CAMS Global)
 * Strictly tagged as a model estimate over a ~45 km grid cell.
 */
export const ForecastHourlyStepSchema = z.object({
  timestampUtc: z.string().datetime(),
  pm10: z.number().nonnegative().optional(),
  pm2_5: z.number().nonnegative().optional(),
  carbonMonoxide: z.number().nonnegative().optional(),
  nitrogenDioxide: z.number().nonnegative().optional(),
  sulphurDioxide: z.number().nonnegative().optional(),
  ozone: z.number().nonnegative().optional(),
  dust: z.number().nonnegative().optional()
});

export type ForecastHourlyStep = z.infer<typeof ForecastHourlyStepSchema>;

export const ModelForecastSchema = z.object({
  forecastId: z.string().uuid(),
  modelName: z.literal("CAMS_GLOBAL"),
  gridResolutionKm: z.number().default(45),
  generatedAtUtc: z.string().datetime(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  disclaimer: z.string().min(1),
  hourlySteps: z.array(ForecastHourlyStepSchema).min(1)
});

export type ModelForecast = z.infer<typeof ModelForecastSchema>;
