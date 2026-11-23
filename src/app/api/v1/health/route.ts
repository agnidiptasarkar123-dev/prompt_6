// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse } from "@/lib/http/api-response";
import { globalFirebaseAuth } from "@/lib/firebase/admin";
import { globalRedisService } from "@/lib/redis/redis-client";
import { globalAiExplainer } from "@/services/ai/ai-explainer";

export async function GET(_req: NextRequest) {
  const cpcbConfigured = Boolean(process.env["DATA_GOV_IN_API_KEY"]);
  const openaqConfigured = Boolean(process.env["OPENAQ_API_KEY"]);
  const firebaseConfigured = globalFirebaseAuth.isConfigured();
  const redisDistributed = globalRedisService.isDistributed();
  const geminiConfigured = globalAiExplainer.isConfigured();

  const isDegraded = !cpcbConfigured && !openaqConfigured;

  return successResponse({
    data: {
      status: isDegraded ? "DEGRADED" : "HEALTHY",
      version: "0.2.0-phase2",
      environment: process.env.NODE_ENV || "development",
      providers: {
        cpcb: cpcbConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
        openaq: openaqConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
        openMeteoCams: "CONFIGURED"
      },
      infrastructure: {
        redis: redisDistributed ? "DISTRIBUTED_UPSTASH" : "LOCAL_MEMORY_FALLBACK",
        firebase: firebaseConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
        gemini: geminiConfigured ? "CONFIGURED" : "NOT_CONFIGURED"
      }
    }
  });
}
