// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const AiGuidanceItemSchema = z.object({
  actionText: z.string().min(1),
  targetGroup: z.string().optional(),
  citedEvidenceIds: z.array(z.string().min(1))
});
export type AiGuidanceItem = z.infer<typeof AiGuidanceItemSchema>;

export const SupportedAiLanguageSchema = z.enum([
  "en",
  "bn",
  "hi",
  "en-IN",
  "as-IN",
  "bn-IN",
  "brx-IN",
  "doi-IN",
  "gu-IN",
  "hi-IN",
  "kn-IN",
  "ks-IN",
  "kok-IN",
  "mai-IN",
  "ml-IN",
  "mni-IN",
  "mr-IN",
  "ne-IN",
  "or-IN",
  "pa-IN",
  "sa-IN",
  "sat-IN",
  "sd-IN",
  "ta-IN",
  "te-IN",
  "ur-IN"
]);
export type SupportedAiLanguage = z.infer<typeof SupportedAiLanguageSchema>;

export const AiExplanationSchema = z.object({
  summary: z.string().min(1),
  primaryPollutantExplanation: z.string().min(1),
  actionGuidance: z.array(AiGuidanceItemSchema),
  forecastTrendSummary: z.string().optional(),
  language: SupportedAiLanguageSchema
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
