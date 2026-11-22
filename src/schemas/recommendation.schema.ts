// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

/**
 * Citation reference linking recommendation to verified physical evidence.
 */
export const EvidenceCitationSchema = z.object({
  evidenceId: z.string().min(1), // e.g. "EVID-STATION-KARALA-PM25", "EVID-CAMS-WIND"
  source: z.string().min(1),
  measuredValue: z.string().min(1),
  timestamp: z.string().datetime()
});

export type EvidenceCitation = z.infer<typeof EvidenceCitationSchema>;

export const RecommendationActionSchema = z.object({
  actionId: z.string().uuid(),
  category: z.enum([
    "VENTILATION_WINDOW",
    "COMMUTE_TIMING",
    "TRANSIT_MODE_SWAP",
    "RESPIRATOR_USAGE",
    "EXERCISE_ADAPTATION",
    "SOURCE_CONTROL_INDOOR",
    "AIR_CLEANING"
  ]),
  urgency: z.enum(["IMMEDIATE", "SCHEDULED", "INFORMATIONAL"]),
  actionSummary: z.string().min(1).max(140),
  reasoning: z.string().min(1).max(300),
  implementationMethod: z.string().min(1).max(300),
  expectedExposureReduction: z.string().min(1).max(140),
  applicableConstraintsOrLimits: z.string().min(1).max(200),
  evidenceReferences: z.array(EvidenceCitationSchema).min(1)
});

export type RecommendationAction = z.infer<typeof RecommendationActionSchema>;

export const RecommendationResponseSchema = z.object({
  recommendationId: z.string().uuid(),
  generatedAtUtc: z.string().datetime(),
  generator: z.enum(["GEMINI_AI", "RULE_ENGINE"]),
  overallRiskSummary: z.string().min(1),
  actions: z.array(RecommendationActionSchema).min(1)
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
