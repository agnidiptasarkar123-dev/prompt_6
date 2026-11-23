// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const AiGuidanceItemSchema = z.object({
  actionText: z.string().min(1),
  targetGroup: z.string().optional(),
  citedEvidenceIds: z.array(z.string().min(1))
});
export type AiGuidanceItem = z.infer<typeof AiGuidanceItemSchema>;

export const AiExplanationSchema = z.object({
  summary: z.string().min(1),
  primaryPollutantExplanation: z.string().min(1),
  actionGuidance: z.array(AiGuidanceItemSchema),
  forecastTrendSummary: z.string().optional(),
  language: z.enum(["en", "bn", "hi"])
});
export type AiExplanation = z.infer<typeof AiExplanationSchema>;

export const AiEvidenceItemSchema = z.object({
  evidenceId: z.string().min(1),
  source: z.string().min(1),
  pollutant: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  timestamp: z.string().min(1),
  description: z.string().min(1)
});
export type AiEvidenceItem = z.infer<typeof AiEvidenceItemSchema>;
