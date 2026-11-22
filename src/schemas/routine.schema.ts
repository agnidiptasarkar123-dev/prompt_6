// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const TransitModeSchema = z.enum([
  "WALKING",
  "BICYCLING",
  "OPEN_AUTO_RICKSHAW",
  "NON_AC_BUS",
  "AC_BUS",
  "METRO_TRAIN",
  "TWO_WHEELER_MOTORBIKE",
  "AC_CAR_CAB",
  "WORK_FROM_HOME"
]);

export type TransitMode = z.infer<typeof TransitModeSchema>;

export const PhysicalIntensitySchema = z.enum([
  "RESTING_SEDENTARY", // Desk work, resting, sleeping
  "LIGHT",              // Slow walking, shopping, casual standing
  "MODERATE",           // Brisk walk, cleaning, easy cycle
  "VIGOROUS"            // Running, outdoor physical labor, strenuous workout
]);

export type PhysicalIntensity = z.infer<typeof PhysicalIntensitySchema>;

export const TimeWindowSchema = z.object({
  startMinuteOfDay: z.number().int().min(0).max(1439), // 0 = 00:00, 540 = 09:00
  durationMinutes: z.number().int().min(5).max(1440)
});

export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const FlexibilityWindowSchema = z.object({
  canShiftEarlierMinutes: z.number().int().min(0).max(180).default(0),
  canShiftLaterMinutes: z.number().int().min(0).max(180).default(0),
  canSubstituteWithIndoorAlternative: z.boolean().default(false),
  canChangeTransitMode: z.boolean().default(false)
});

export type FlexibilityWindow = z.infer<typeof FlexibilityWindowSchema>;

export const RoutineActivitySchema = z.object({
  activityId: z.string().uuid(),
  label: z.string().min(1).max(60),
  memberIds: z.array(z.string().uuid()),
  locationType: z.enum(["INDOOR", "OUTDOOR", "TRANSIT"]),
  physicalIntensity: PhysicalIntensitySchema,
  timeWindow: TimeWindowSchema,
  transitMode: TransitModeSchema.optional(),
  flexibility: FlexibilityWindowSchema
});

export type RoutineActivity = z.infer<typeof RoutineActivitySchema>;
