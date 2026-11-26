// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { SupportedAiLanguageSchema } from "@/schemas/ai-explanation.schema";
import { generateLearningAgentReply } from "@/services/ai/learning-agent-service";

export const runtime = "nodejs";

const LearningAgentRequestSchema = z.object({
  topicId: z.string().min(1).max(60),
  question: z.string().min(1).max(800),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  language: SupportedAiLanguageSchema.default("en"),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(1000)
      })
    )
    .max(6)
    .optional()
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 30, 60);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = LearningAgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "SCHEMA_VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const d = parsed.data;
  const result = await generateLearningAgentReply({
    topicId: d.topicId,
    question: d.question,
    level: d.level,
    language: d.language,
    recentMessages: d.recentMessages,
    timeoutMs: 10000
  });

  return successResponse({ data: result });
}
