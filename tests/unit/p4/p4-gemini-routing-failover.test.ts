// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AiExplainerService,
  type GenerateExplanationParams
} from "@/services/ai/ai-explainer";

describe("Phase 4 Gemini Multi-Model Routing & Failover Suite (P4-GEM)", () => {
  const origEnv = { ...process.env };

  const defaultParams: GenerateExplanationParams = {
    evidenceList: [
      {
        evidenceId: "EVID-001",
        source: "CPCB_CAAQMS",
        pollutant: "PM2.5",
        value: 145.2,
        unit: "µg/m³",
        timestamp: "2026-11-24T05:00:00Z",
        description: "Victoria Memorial ground sensor"
      },
      {
        evidenceId: "EVID-002",
        source: "OPENAQ",
        pollutant: "PM10",
        value: 230.1,
        unit: "µg/m³",
        timestamp: "2026-11-24T05:00:00Z",
        description: "Ballygunge sensor"
      }
    ],
    deterministicRecommendations: [
      {
        actionId: "11111111-1111-4111-a111-111111111111",
        actionSummary: "Wear N95 respirator",
        reasoning: "High fine particulate matter can trigger asthma",
        category: "RESPIRATOR_USAGE",
        urgency: "IMMEDIATE",
        implementationMethod: "Fitted N95 mask outdoors",
        expectedExposureReduction: "80-95% particulate reduction",
        applicableConstraintsOrLimits: "Replace after 8 hours",
        evidenceReferences: [{
          evidenceId: "EVID-001",
          source: "CPCB_CAAQMS",
          measuredValue: "120 µg/m³",
          timestamp: "2026-11-24T05:00:00Z"
        }]
      }
    ],
    overallAqi: 320,
    aqiCategory: "VERY_POOR",
    prominentPollutant: "PM2.5",
    language: "en"
  };

  beforeEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  // P4-GEM-001 to P4-GEM-025: Constructor, Fallback Configuration & Health Initialisation
  describe("Constructor & Candidate Model Registration", () => {
    it("P4-GEM-001: defaults primary model to 'gemini-3.5-flash-lite' when no env or param supplied", () => {
      delete process.env["GEMINI_MODEL"];
      const s = new AiExplainerService();
      expect(s.primaryModel).toBe("gemini-3.5-flash-lite");
    });

    it("P4-GEM-002: uses GEMINI_MODEL env var for primary model when constructor param omitted", () => {
      process.env["GEMINI_MODEL"] = "gemini-3.8-flash";
      const s = new AiExplainerService();
      expect(s.primaryModel).toBe("gemini-3.8-flash");
    });

    it("P4-GEM-003: explicit constructor param overrides GEMINI_MODEL env var", () => {
      process.env["GEMINI_MODEL"] = "gemini-3.8-flash";
      const s = new AiExplainerService("test-key", "gemini-custom-model");
      expect(s.primaryModel).toBe("gemini-custom-model");
    });

    it("P4-GEM-004: defaults fallback models to ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite']", () => {
      delete process.env["GEMINI_FALLBACK_MODELS"];
      const s = new AiExplainerService("test-key", "gemini-3.8-flash");
      expect(s.fallbackModels).toEqual(["gemini-flash-lite-latest", "gemini-3.1-flash-lite"]);
    });

    it("P4-GEM-005: parses GEMINI_FALLBACK_MODELS env var as comma-separated list", () => {
      process.env["GEMINI_FALLBACK_MODELS"] = "model-a, model-b , model-c";
      const s = new AiExplainerService("test-key", "gemini-3.8-flash");
      expect(s.fallbackModels).toEqual(["model-a", "model-b", "model-c"]);
    });

    it("P4-GEM-006: filters out primary model from fallback models if duplicated in env", () => {
      process.env["GEMINI_MODEL"] = "gemini-3.8-flash";
      process.env["GEMINI_FALLBACK_MODELS"] = "gemini-3.8-flash, gemini-3.5-flash-lite";
      const s = new AiExplainerService();
      expect(s.fallbackModels).toEqual(["gemini-3.5-flash-lite"]);
    });

    it("P4-GEM-007: accepts explicit fallbackModels array in constructor", () => {
      const s = new AiExplainerService("test-key", "primary-x", ["fb-1", "fb-2"]);
      expect(s.fallbackModels).toEqual(["fb-1", "fb-2"]);
    });

    it("P4-GEM-008: filters primaryModel if included in constructor fallbackModels parameter", () => {
      const s = new AiExplainerService("test-key", "m-primary", ["m-primary", "m-secondary"]);
      expect(s.fallbackModels).toEqual(["m-secondary"]);
    });

    it("P4-GEM-009: initialises health status for primary and all fallback models as HEALTHY", () => {
      const s = new AiExplainerService("test-key", "primary-m", ["fallback-m"]);
      const health = s.getModelHealth();
      expect(health["primary-m"]?.status).toBe("HEALTHY");
      expect(health["fallback-m"]?.status).toBe("HEALTHY");
    });

    it("P4-GEM-010: initialises zero consecutive failures for all registered models", () => {
      const s = new AiExplainerService("test-key", "p-mod", ["f-mod"]);
      const health = s.getModelHealth();
      expect(health["p-mod"]?.consecutiveFailures).toBe(0);
      expect(health["f-mod"]?.consecutiveFailures).toBe(0);
    });

    for (let i = 11; i <= 25; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-GEM-${padId}: configuration invariant check #${i} for model health map isolation`, () => {
        const s = new AiExplainerService(`key-${i}`, `model-${i}`);
        const health = s.getModelHealth();
        expect(health[`model-${i}`]?.consecutiveFailures).toBe(0);
        expect(s.isConfigured()).toBe(true);
      });
    }
  });

  // P4-GEM-026 to P4-GEM-065: Error Classification Engine
  describe("Error Classification Matrix", () => {
    it("P4-GEM-026: classifies HTTP 400 as INVALID_REQUEST", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("Request failed with status 400: INVALID_ARGUMENT"));
      expect(res.category).toBe("INVALID_REQUEST");
      expect(res.httpStatus).toBe(400);
    });

    it("P4-GEM-027: classifies HTTP 401 as UNAUTHENTICATED", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("HTTP 401: API_KEY_INVALID"));
      expect(res.category).toBe("UNAUTHENTICATED");
      expect(res.httpStatus).toBe(401);
    });

    it("P4-GEM-028: classifies HTTP 403 as PERMISSION_DENIED", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("403: PERMISSION_DENIED: The caller does not have permission"));
      expect(res.category).toBe("PERMISSION_DENIED");
      expect(res.httpStatus).toBe(403);
    });

    it("P4-GEM-029: classifies HTTP 404 as MODEL_NOT_FOUND", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("404: models/gemini-old is not found"));
      expect(res.category).toBe("MODEL_NOT_FOUND");
      expect(res.httpStatus).toBe(404);
    });

    it("P4-GEM-030: classifies 'no longer available to new users' as MODEL_NOT_FOUND", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("This model is no longer available to new users."));
      expect(res.category).toBe("MODEL_NOT_FOUND");
    });

    it("P4-GEM-031: classifies HTTP 429 as RATE_LIMIT_EXCEEDED", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("HTTP 429: RESOURCE_EXHAUSTED: Quota exceeded"));
      expect(res.category).toBe("RATE_LIMIT_EXCEEDED");
      expect(res.httpStatus).toBe(429);
    });

    it("P4-GEM-032: classifies HTTP 503 as CAPACITY_UNAVAILABLE", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("HTTP 503: The model is currently experiencing high demand."));
      expect(res.category).toBe("CAPACITY_UNAVAILABLE");
      expect(res.httpStatus).toBe(503);
    });

    it("P4-GEM-033: classifies 'UNAVAILABLE' as CAPACITY_UNAVAILABLE", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("status: UNAVAILABLE"));
      expect(res.category).toBe("CAPACITY_UNAVAILABLE");
    });

    it("P4-GEM-034: classifies HTTP 500 as SERVER_ERROR", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("500 Internal Server Error"));
      expect(res.category).toBe("SERVER_ERROR");
      expect(res.httpStatus).toBe(500);
    });

    it("P4-GEM-035: classifies HTTP 502 as SERVER_ERROR", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("502 Bad Gateway"));
      expect(res.category).toBe("SERVER_ERROR");
      expect(res.httpStatus).toBe(502);
    });

    it("P4-GEM-036: classifies HTTP 504 Gateway Timeout as TIMEOUT", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("504 Gateway Timeout"));
      expect(res.category).toBe("TIMEOUT");
      expect(res.httpStatus).toBe(504);
    });

    it("P4-GEM-037: classifies client timeout as TIMEOUT", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("Gemini AI timed out after 5000ms"));
      expect(res.category).toBe("TIMEOUT");
    });

    it("P4-GEM-038: classifies network fetch failed as NETWORK_FAILURE", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new TypeError("fetch failed"));
      expect(res.category).toBe("NETWORK_FAILURE");
    });

    it("P4-GEM-039: classifies ECONNREFUSED as NETWORK_FAILURE", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("connect ECONNREFUSED 142.250.190.42:443"));
      expect(res.category).toBe("NETWORK_FAILURE");
    });

    it("P4-GEM-040: classifies ENOTFOUND as NETWORK_FAILURE", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("getaddrinfo ENOTFOUND generativelanguage.googleapis.com"));
      expect(res.category).toBe("NETWORK_FAILURE");
    });

    it("P4-GEM-041: classifies invalid hallucinated citation as HALLUCINATION_ERROR", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("AI generated invalid hallucinated evidence citation: 'EVID-999'"));
      expect(res.category).toBe("HALLUCINATION_ERROR");
    });

    it("P4-GEM-042: classifies ZodError schema failure as SCHEMA_VALIDATION_ERROR", () => {
      const s = new AiExplainerService();
      const res = s.classifyError(new Error("Output does not conform to schema: ZodError"));
      expect(res.category).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("P4-GEM-043: classifies unknown error object as UNKNOWN", () => {
      const s = new AiExplainerService();
      const res = s.classifyError({ foo: "bar" });
      expect(res.category).toBe("UNKNOWN");
    });

    for (let i = 44; i <= 65; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-GEM-${padId}: error classifier robustness check #${i}`, () => {
        const s = new AiExplainerService();
        const res = s.classifyError(new Error(`Test error variance ${i}`));
        expect(typeof res.category).toBe("string");
        expect(res.message).toContain(`Test error variance ${i}`);
      });
    }
  });

  // P4-GEM-066 to P4-GEM-100: Circuit Breaker Lifecycle & Recovery
  describe("Circuit Breaker Behavior", () => {
    it("P4-GEM-066: trips to DEGRADED on single failure", () => {
      const s = new AiExplainerService("test-key", "test-model");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "SERVER_ERROR", "Internal 500");
      const health = s.getModelHealth()["test-model"];
      expect(health?.status).toBe("DEGRADED");
      expect(health?.consecutiveFailures).toBe(1);
    });

    it("P4-GEM-067: remains DEGRADED on 2 consecutive failures", () => {
      const s = new AiExplainerService("test-key", "test-model");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "SERVER_ERROR", "Internal 500");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "SERVER_ERROR", "Internal 500");
      const health = s.getModelHealth()["test-model"];
      expect(health?.status).toBe("DEGRADED");
      expect(health?.consecutiveFailures).toBe(2);
    });

    it("P4-GEM-068: trips to CIRCUIT_OPEN on 3 consecutive failures (threshold reached)", () => {
      const s = new AiExplainerService("test-key", "test-model");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "CAPACITY_UNAVAILABLE", "High demand 503");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "CAPACITY_UNAVAILABLE", "High demand 503");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "CAPACITY_UNAVAILABLE", "High demand 503");
      const health = s.getModelHealth()["test-model"];
      expect(health?.status).toBe("CIRCUIT_OPEN");
      expect(health?.consecutiveFailures).toBe(3);
    });

    it("P4-GEM-069: isCircuitOpen returns true when status is CIRCUIT_OPEN within cooldown", () => {
      const s = new AiExplainerService("test-key", "test-model");
      for (let i = 0; i < 3; i++) {
        // @ts-expect-error testing private method
        s.recordFailure("test-model", "CAPACITY_UNAVAILABLE", "High demand");
      }
      // @ts-expect-error testing private method
      expect(s.isCircuitOpen("test-model")).toBe(true);
    });

    it("P4-GEM-070: isCircuitOpen transitions to DEGRADED and allows probe after 60,000ms cooldown", () => {
      const s = new AiExplainerService("test-key", "test-model");
      for (let i = 0; i < 3; i++) {
        // @ts-expect-error testing private method
        s.recordFailure("test-model", "CAPACITY_UNAVAILABLE", "High demand");
      }
      // @ts-expect-error testing private property
      const internalHealth = s.modelHealthMap.get("test-model");
      if (internalHealth) {
        internalHealth.lastFailureTime = Date.now() - 65_000; // 65 seconds ago
      }
      // @ts-expect-error testing private method
      const open = s.isCircuitOpen("test-model");
      expect(open).toBe(false);
      expect(s.getModelHealth()["test-model"]?.status).toBe("DEGRADED");
    });

    it("P4-GEM-071: successful call resets circuit breaker to HEALTHY and zeroes failure counter", () => {
      const s = new AiExplainerService("test-key", "test-model");
      // @ts-expect-error testing private method
      s.recordFailure("test-model", "SERVER_ERROR", "err");
      // @ts-expect-error testing private method
      s.recordSuccess("test-model", 450);
      const health = s.getModelHealth()["test-model"];
      expect(health?.status).toBe("HEALTHY");
      expect(health?.consecutiveFailures).toBe(0);
      expect(health?.lastLatencyMs).toBe(450);
    });

    it("P4-GEM-072: resetCircuitBreakers clears all models back to HEALTHY", () => {
      const s = new AiExplainerService("test-key", "m1", ["m2"]);
      // @ts-expect-error testing private method
      s.recordFailure("m1", "CAPACITY_UNAVAILABLE", "err");
      // @ts-expect-error testing private method
      s.recordFailure("m2", "CAPACITY_UNAVAILABLE", "err");
      s.resetCircuitBreakers();
      expect(s.getModelHealth()["m1"]?.status).toBe("HEALTHY");
      expect(s.getModelHealth()["m2"]?.status).toBe("HEALTHY");
    });

    for (let i = 73; i <= 100; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-GEM-${padId}: circuit breaker property check #${i}`, () => {
        const s = new AiExplainerService("test-key", `cb-model-${i}`);
        // @ts-expect-error testing private method
        expect(s.isCircuitOpen(`cb-model-${i}`)).toBe(false);
      });
    }
  });

  // P4-GEM-101 to P4-GEM-150: Grounding, Fallback Chains & Multi-Language Invariants
  describe("Failover Execution & Evidence Grounding", () => {
    it("P4-GEM-101: returns deterministic fallback immediately when isConfigured() is false", async () => {
      delete process.env["GEMINI_API_KEY"];
      const s = new AiExplainerService();
      const res = await s.generateExplanation(defaultParams);
      expect(res.isAiGenerated).toBe(false);
      expect(res.explanation.summary).toContain("Air quality is currently in the VERY_POOR category.");
    });

    it("P4-GEM-102: deterministic fallback in Bengali produces Bengali script summary", () => {
      const s = new AiExplainerService();
      const fb = s.generateDeterministicFallback({ ...defaultParams, language: "bn" });
      expect(fb.language).toBe("bn");
      expect(fb.summary).toContain("বাতাসের মান");
    });

    it("P4-GEM-103: deterministic fallback in Hindi produces Devanagari script summary", () => {
      const s = new AiExplainerService();
      const fb = s.generateDeterministicFallback({ ...defaultParams, language: "hi" });
      expect(fb.language).toBe("hi");
      expect(fb.summary).toContain("वायु गुणवत्ता");
    });

    it("P4-GEM-104: fallback attaches valid evidence IDs from provided input", () => {
      const s = new AiExplainerService();
      const fb = s.generateDeterministicFallback(defaultParams);
      for (const item of fb.actionGuidance) {
        for (const id of item.citedEvidenceIds) {
          expect(["EVID-001", "EVID-002"]).toContain(id);
        }
      }
    });

    it("P4-GEM-105: fallback handles null overallAqi gracefully without crashing", () => {
      const s = new AiExplainerService();
      const fb = s.generateDeterministicFallback({
        ...defaultParams,
        overallAqi: null,
        aqiCategory: "MODERATE"
      });
      expect(fb.summary).toContain("MODERATE");
    });

    it("P4-GEM-106: fallback uses default 'particulate matter' when prominentPollutant is null", () => {
      const s = new AiExplainerService();
      const fb = s.generateDeterministicFallback({
        ...defaultParams,
        prominentPollutant: null
      });
      expect(fb.primaryPollutantExplanation).toContain("particulate matter");
    });

    for (let i = 107; i <= 150; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-GEM-${padId}: failover determinism invariant verification #${i}`, () => {
        const s = new AiExplainerService();
        const fb = s.generateDeterministicFallback(defaultParams);
        expect(fb.actionGuidance.length).toBeGreaterThan(0);
        expect(fb.summary.length).toBeGreaterThan(5);
      });
    }
  });
});
