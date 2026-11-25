// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { HouseholdMemberSchema } from "./household.schema";
import { RoutineActivitySchema } from "./routine.schema";

export const CookingFuelSchema = z.enum([
  "LPG",
  "INDUCTION_ELECTRIC",
  "PIPED_NATURAL_GAS",
  "BIOMASS_KEROSENE",
  "MIXED"
]);

export const DwellingContextSchema = z.object({
  dwellingType: z.enum([
    "STANDALONE_HOUSE",
    "APARTMENT_LOW_RISE",
    "APARTMENT_HIGH_RISE",
    "INFORMAL_SETTLEMENT"
  ]),
  floorLevel: z.number().int().min(0).max(100),
  proximityToMajorRoadMeters: z.number().int().nonnegative(),
  cooking: z.object({
    primaryFuel: CookingFuelSchema,
    kitchenVentilation: z.enum([
      "DEDICATED_EXHAUST_OUTSIDE",
      "KITCHEN_HOOD_CHIMNEY",
      "OPEN_WINDOW_ONLY",
      "UNVENTED_INDOOR"
    ]),
    averageDailyCookingHours: z.number().min(0).max(12)
  }),
  indoorSources: z.object({
    incenseOrDhoopDaily: z.boolean(),
    mosquitoCoilUsage: z.boolean(),
    indoorSmoking: z.boolean(),
    unventedGasHeater: z.boolean()
  }),
  filtration: z.object({
    hasAirPurifier: z.boolean(),
    purifierLocations: z.array(z.string()).default([]),
    filterType: z.enum(["TRUE_HEPA_H13", "BASIC_FILTER", "DIY_CORSI_ROSENTHAL", "UNKNOWN"]).optional(),
    cleanAirDeliveryRateCadrM3H: z.number().positive().optional()
  }),
  windowSealingQuality: z.enum(["WELL_SEALED", "STANDARD_WINDOWS", "LEAKY_OPEN_SLATS"])
});

export type DwellingContext = z.infer<typeof DwellingContextSchema>;

export const AffordabilityTierSchema = z.enum([
  "NO_ADDITIONAL_COST",  // Behavioral adjustments: ventilation timing, wet mopping
  "LOW_COST",            // N95 masks, DIY draft stoppers
  "MODERATE_TO_HIGH"     // True HEPA purifiers, replacement filters, AC rides
]);

export const PriorityGoalSchema = z.enum([
  "PROTECT_VULNERABLE_MEMBER",
  "MAINTAIN_FITNESS_SAFELY",
  "MINIMIZE_COMMUTE_EXPOSURE",
  "OPTIMIZE_INDOOR_AIR",
  "SUSTAINABLE_CHOICES_WHEN_SAFE"
]);

export const UserConstraintsSchema = z.object({
  affordabilityTier: AffordabilityTierSchema,
  priorityGoals: z.array(PriorityGoalSchema).min(1)
});

export type UserConstraints = z.infer<typeof UserConstraintsSchema>;

export const HouseholdContextSchema = z.object({
  householdId: z.string().uuid(),
  updatedAt: z.string().datetime(),
  preferredLanguage: z.string().min(2).default("en"),
  dwelling: DwellingContextSchema,
  members: z.array(HouseholdMemberSchema).min(1),
  routine: z.array(RoutineActivitySchema),
  constraints: UserConstraintsSchema
});

export type HouseholdContext = z.infer<typeof HouseholdContextSchema>;
