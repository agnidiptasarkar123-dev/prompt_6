// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { HouseholdContextSchema } from "./user-context.schema";
import { RoutineActivitySchema } from "./routine.schema";

export const SavedLocationSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  latitude: z.number().min(6.0).max(38.0),
  longitude: z.number().min(68.0).max(98.0)
});
export type SavedLocation = z.infer<typeof SavedLocationSchema>;

export const UserPreferencesSchema = z.object({
  language: z.enum(["en", "bn", "hi"]).default("en"),
  temperatureUnit: z.enum(["C", "F"]).default("C"),
  notificationsEnabled: z.boolean().default(false)
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().max(100).optional(),
  preferences: UserPreferencesSchema.default({
    language: "en",
    temperatureUnit: "C",
    notificationsEnabled: false
  }),
  savedLocation: SavedLocationSchema.optional(),
  householdContext: HouseholdContextSchema.optional(),
  routine: z.array(RoutineActivitySchema).optional(),
  cloudPersistenceConsent: z.boolean().default(false),
  consentTimestamp: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UpdateProfileRequestSchema = z.object({
  preferences: UserPreferencesSchema.optional(),
  savedLocation: SavedLocationSchema.optional(),
  householdContext: HouseholdContextSchema.optional(),
  routine: z.array(RoutineActivitySchema).optional(),
  cloudPersistenceConsent: z.boolean().optional()
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
