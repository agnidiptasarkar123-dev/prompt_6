import { z } from "zod";

export const AgeBracketSchema = z.enum([
  "INFANT_0_2",
  "CHILD_3_12",
  "ADOLESCENT_13_17",
  "ADULT_18_59",
  "ELDERLY_60_PLUS"
]);

export type AgeBracket = z.infer<typeof AgeBracketSchema>;

/**
 * Minimised, strictly non-diagnostic self-reported sensitivity checkboxes.
 * The system never diagnoses users.
 */
export const SelfReportedSensitivitiesSchema = z.object({
  respiratorySensitivity: z.boolean().default(false),
  cardiovascularSensitivity: z.boolean().default(false),
  pregnancy: z.boolean().default(false),
  allergiesOrSinusitis: z.boolean().default(false)
});

export type SelfReportedSensitivities = z.infer<typeof SelfReportedSensitivitiesSchema>;

export const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1).max(30),
  ageBracket: AgeBracketSchema,
  sensitivities: SelfReportedSensitivitiesSchema,
  dailyOutdoorHoursEstimate: z.number().min(0).max(24)
});

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
