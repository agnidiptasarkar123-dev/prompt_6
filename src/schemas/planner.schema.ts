// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const PlannerActivityCategorySchema = z.enum([
  "WALKING",
  "RUNNING",
  "CYCLING",
  "OUTDOOR_EXERCISE",
  "INDOOR_EXERCISE",
  "SCHOOL_COMMUTE",
  "COLLEGE_COMMUTE",
  "OFFICE_COMMUTE",
  "SHOPPING",
  "OUTDOOR_SPORTS",
  "INDOOR_WORK",
  "VENTILATION_WINDOW"
]);
export type PlannerActivityCategory = z.infer<typeof PlannerActivityCategorySchema>;

export const ActivityEnvironmentSchema = z.enum(["INDOOR", "OUTDOOR", "TRANSIT"]);
export type ActivityEnvironment = z.infer<typeof ActivityEnvironmentSchema>;

export const PlannedActivitySchema = z.object({
  id: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  title: z.string().min(1).max(80),
  category: PlannerActivityCategorySchema,
  environment: ActivityEnvironmentSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  locationName: z.string().min(1).max(100),
  notes: z.string().max(300).optional(),
  isFavorite: z.boolean().default(false),
  reminderEnabled: z.boolean().default(false)
});
export type PlannedActivity = z.infer<typeof PlannedActivitySchema>;

export const SavedPlaceSchema = z.object({
  id: z.string().min(1),
  label: z.enum(["HOME", "WORK", "COLLEGE", "CUSTOM"]),
  customName: z.string().min(1).max(60),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  latitude: z.number().min(6.0).max(38.0),
  longitude: z.number().min(68.0).max(98.0),
  isPrivate: z.boolean().default(true)
});
export type SavedPlace = z.infer<typeof SavedPlaceSchema>;

export const ExposureDiaryEntrySchema = z.object({
  id: z.string().min(1),
  recordedAt: z.string().min(1),
  activityTitle: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(1).max(1440),
  environment: ActivityEnvironmentSchema,
  locationLabel: z.string().min(1).max(80),
  ambientAqiAtTime: z.number().nullable(),
  stationUsed: z.string().nullable(),
  selfReportedNotes: z.string().max(400).optional(),
  isUserEntered: z.literal(true)
});
export type ExposureDiaryEntry = z.infer<typeof ExposureDiaryEntrySchema>;
