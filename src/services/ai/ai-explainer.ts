// SPDX-License-Identifier: Apache-2.0
import { GoogleGenAI } from "@google/genai";
import {
  AiExplanationSchema,
  type AiExplanation,
  type AiEvidenceItem
} from "@/schemas/ai-explanation.schema";
import { assertAiOutputConsistency } from "./output-guardrails";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import { resolveLocale, type SupportedLanguage } from "@/i18n/translations";
import {
  LOCALE_REGISTRY,
  type CpcbCategoryTranslations
} from "@/i18n/locale-registry";
import { ENVIRONMENTAL_GLOSSARY } from "@/i18n/glossary";

export interface GenerateExplanationParams {
  readonly evidenceList: readonly AiEvidenceItem[];
  readonly deterministicRecommendations: readonly RecommendationAction[];
  readonly overallAqi: number | null;
  readonly aqiCategory: string;
  readonly prominentPollutant: string | null;
  readonly language?: SupportedLanguage;
  readonly timeoutMs?: number;
}

export type GeminiErrorCategory =
  | "INVALID_REQUEST"        // HTTP 400: Malformed input / syntax
  | "UNAUTHENTICATED"        // HTTP 401: Invalid API key
  | "PERMISSION_DENIED"      // HTTP 403: Project / IP restriction
  | "MODEL_NOT_FOUND"        // HTTP 404: Deprecated / non-existent model
  | "RATE_LIMIT_EXCEEDED"    // HTTP 429: Quota exceeded
  | "CAPACITY_UNAVAILABLE"   // HTTP 503: High demand / capacity spike
  | "SERVER_ERROR"           // HTTP 500, 502, 504: Internal server issue
  | "TIMEOUT"                // Client-side request timeout
  | "NETWORK_FAILURE"        // Socket / DNS / connection drop
  | "SCHEMA_VALIDATION_ERROR"// Output JSON does not conform to schema
  | "HALLUCINATION_ERROR"    // Output cites unknown evidence ID
  | "UNKNOWN";

export interface ModelHealthStatus {
  readonly modelId: string;
  status: "HEALTHY" | "DEGRADED" | "CIRCUIT_OPEN";
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastErrorCategory?: GeminiErrorCategory;
  lastErrorMessage?: string;
  lastLatencyMs?: number;
}

export interface ExplanationResult {
  readonly explanation: AiExplanation;
  readonly isAiGenerated: boolean;
  readonly usedModel?: string;
  readonly latencyMs?: number;
  readonly warnings: readonly string[];
}

export class AiExplainerService {
  private readonly client: GoogleGenAI | null = null;
  public readonly primaryModel: string;
  public readonly fallbackModels: readonly string[];
  private readonly modelHealthMap: Map<string, ModelHealthStatus> = new Map();
  private readonly circuitBreakerThreshold = 3;
  private readonly circuitBreakerCooldownMs = 60_000;

  constructor(apiKey?: string, modelName?: string, fallbackModels?: string[]) {
    const key = apiKey || process.env["GEMINI_API_KEY"];
    this.primaryModel = modelName || process.env["GEMINI_MODEL"] || "gemini-3.5-flash-lite";

    if (fallbackModels) {
      this.fallbackModels = fallbackModels.filter((m) => m !== this.primaryModel);
    } else if (process.env["GEMINI_FALLBACK_MODELS"]) {
      this.fallbackModels = process.env["GEMINI_FALLBACK_MODELS"]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== this.primaryModel);
    } else {
      this.fallbackModels = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"].filter(
        (m) => m !== this.primaryModel
      );
    }

    if (key && key.trim().length > 0) {
      this.client = new GoogleGenAI({ apiKey: key });
    }

    // Initialize health registry
    const allModels = [this.primaryModel, ...this.fallbackModels];
    for (const m of allModels) {
      this.modelHealthMap.set(m, {
        modelId: m,
        status: "HEALTHY",
        consecutiveFailures: 0
      });
    }
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public getModelHealth(): Record<string, ModelHealthStatus> {
    const result: Record<string, ModelHealthStatus> = {};
    for (const [k, v] of this.modelHealthMap.entries()) {
      result[k] = { ...v };
    }
    return result;
  }

  public resetCircuitBreakers(): void {
    for (const health of this.modelHealthMap.values()) {
      health.status = "HEALTHY";
      health.consecutiveFailures = 0;
      health.lastFailureTime = undefined;
    }
  }

  public classifyError(err: unknown): { category: GeminiErrorCategory; message: string; httpStatus?: number } {
    const str = String(err);
    let message = str;
    let httpStatus: number | undefined;

    if (err instanceof Error) {
      message = err.message;
    }

    // Check for HTTP status codes in message or object
    const statusMatch = str.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (statusMatch && statusMatch[1]) {
      httpStatus = parseInt(statusMatch[1], 10);
    }

    if (str.includes("timed out") || str.includes("Timeout")) {
      return { category: "TIMEOUT", message, httpStatus: 504 };
    }
    if (str.includes("invalid hallucinated evidence citation")) {
      return { category: "HALLUCINATION_ERROR", message };
    }
    if (str.includes("does not conform to schema") || str.includes("ZodError")) {
      return { category: "SCHEMA_VALIDATION_ERROR", message };
    }
    if (httpStatus === 400 || str.includes("INVALID_ARGUMENT")) {
      return { category: "INVALID_REQUEST", message, httpStatus: 400 };
    }
    if (httpStatus === 401 || str.includes("UNAUTHENTICATED")) {
      return { category: "UNAUTHENTICATED", message, httpStatus: 401 };
    }
    if (httpStatus === 403 || str.includes("PERMISSION_DENIED")) {
      return { category: "PERMISSION_DENIED", message, httpStatus: 403 };
    }
    if (httpStatus === 404 || str.includes("NOT_FOUND") || str.includes("no longer available")) {
      return { category: "MODEL_NOT_FOUND", message, httpStatus: 404 };
    }
    if (httpStatus === 429 || str.includes("RESOURCE_EXHAUSTED")) {
      return { category: "RATE_LIMIT_EXCEEDED", message, httpStatus: 429 };
    }
    if (httpStatus === 503 || str.includes("UNAVAILABLE") || str.includes("high demand") || str.includes("capacity")) {
      return { category: "CAPACITY_UNAVAILABLE", message, httpStatus: 503 };
    }
    if (httpStatus === 500 || httpStatus === 502 || str.includes("INTERNAL")) {
      return { category: "SERVER_ERROR", message, httpStatus: httpStatus ?? 500 };
    }
    if (str.includes("fetch failed") || str.includes("ENOTFOUND") || str.includes("ECONNREFUSED")) {
      return { category: "NETWORK_FAILURE", message };
    }

    return { category: "UNKNOWN", message, httpStatus };
  }

  private isCircuitOpen(modelId: string): boolean {
    const health = this.modelHealthMap.get(modelId);
    if (!health) return false;

    if (health.status === "CIRCUIT_OPEN") {
      const elapsed = Date.now() - (health.lastFailureTime || 0);
      if (elapsed > this.circuitBreakerCooldownMs) {
        // Half-open: allow one probe request
        health.status = "DEGRADED";
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess(modelId: string, latencyMs: number): void {
    const health = this.modelHealthMap.get(modelId);
    if (health) {
      health.status = "HEALTHY";
      health.consecutiveFailures = 0;
      health.lastLatencyMs = latencyMs;
      health.lastErrorCategory = undefined;
      health.lastErrorMessage = undefined;
    }
  }

  private recordFailure(modelId: string, category: GeminiErrorCategory, message: string): void {
    let health = this.modelHealthMap.get(modelId);
    if (!health) {
      health = {
        modelId,
        status: "HEALTHY",
        consecutiveFailures: 0
      };
      this.modelHealthMap.set(modelId, health);
    }

    health.consecutiveFailures += 1;
    health.lastFailureTime = Date.now();
    health.lastErrorCategory = category;
    health.lastErrorMessage = message;

    if (health.consecutiveFailures >= this.circuitBreakerThreshold) {
      health.status = "CIRCUIT_OPEN";
    } else {
      health.status = "DEGRADED";
    }
  }

  public generateDeterministicFallback(
    params: GenerateExplanationParams
  ): AiExplanation {
    const rawLang = params.language || "en";
    const resolvedLocale = resolveLocale(rawLang);
    const meta = LOCALE_REGISTRY[resolvedLocale];
    const isUnavailable =
      !params.aqiCategory ||
      params.aqiCategory.trim().toUpperCase() === "UNAVAILABLE" ||
      params.aqiCategory.trim().toUpperCase() === "UNKNOWN";

    const validEvidenceIds = params.evidenceList.map((e) => e.evidenceId);
    const recommendations = params.deterministicRecommendations || [];

    const guidance = recommendations.map((rec) => {
      const citedId = rec.evidenceReferences?.[0]?.evidenceId;
      return {
        actionText: rec.actionSummary + ": " + rec.reasoning,
        targetGroup: rec.category,
        citedEvidenceIds: citedId && validEvidenceIds.includes(citedId)
          ? [citedId]
          : validEvidenceIds.slice(0, 1)
      };
    });

    if (isUnavailable) {
      const measuredObs = params.evidenceList.filter((e) => e.pollutant && e.value !== undefined);
      const rawObsSummary =
        measuredObs.length > 0
          ? `Available raw observations: ${measuredObs.map((e) => `${e.pollutant} ${e.value} ${e.unit || ""}`.trim()).join(", ")}.`
          : "No verified individual pollutant observations are currently available at this station.";

      let summary = `Overall CPCB AQI is currently UNAVAILABLE because this station lacks sufficient monitored parameters or particulate data. ${rawObsSummary}`;
      let primaryExplanation =
        measuredObs.length > 0
          ? `While overall composite AQI cannot be computed, individual Type C pollutant readings are available (${measuredObs.map((e) => e.pollutant).join(", ")}). Follow precautionary NCDC guidance.`
          : "Without sufficient verified monitoring data, HawaSaathi provides precautionary guidance without assuming air quality severity.";

      if (rawLang === "bn" || resolvedLocale === "bn-IN") {
        summary = `সামগ্রিক CPCB AQI বর্তমানে অনুপলব্ধ কারণ এই স্টেশনে পর্যাপ্ত পরিমাপ বা ধূলিকণার তথ্য নেই। ${rawObsSummary}`;
        primaryExplanation = "যাচাইকৃত সামগ্রিক AQI না থাকায় সতর্কতামূলক নির্দেশিকা প্রদান করা হচ্ছে।";
      } else if (rawLang === "hi" || resolvedLocale === "hi-IN") {
        summary = `समग्र CPCB AQI वर्तमान में अनुपलब्ध है क्योंकि इस स्टेशन पर पर्याप्त प्रदूषक डेटा या पार्टिकुलेट माप उपलब्ध नहीं है। ${rawObsSummary}`;
        primaryExplanation = "सत्यापित समग्र AQI के अभाव में एहतियाती मार्गदर्शन प्रदान किया जा रहा है।";
      } else if (resolvedLocale !== "en-IN") {
        summary = `[${meta.nativeName}] Overall CPCB AQI is UNAVAILABLE. ${rawObsSummary}`;
      }

      return {
        summary,
        primaryPollutantExplanation: primaryExplanation,
        actionGuidance: guidance,
        forecastTrendSummary: "Check Type D CAMS atmospheric forecast separately for directional dispersion outlook.",
        language: rawLang as SupportedLanguage
      };
    }

    const prominent = params.prominentPollutant || "particulate matter";
    const rawCat = params.aqiCategory.toLowerCase();
    let catKey: keyof CpcbCategoryTranslations = "moderate";
    if (rawCat.includes("good")) catKey = "good";
    else if (rawCat.includes("satisfactory")) catKey = "satisfactory";
    else if (rawCat.includes("moderate")) catKey = "moderate";
    else if (rawCat.includes("very poor") || rawCat.includes("very_poor")) catKey = "veryPoor";
    else if (rawCat.includes("poor")) catKey = "poor";
    else if (rawCat.includes("severe")) catKey = "severe";

    const localizedCategory = meta.cpcbCategories[catKey];

    let summary = `Air quality is currently in the ${params.aqiCategory} category.`;
    let primaryExplanation = `Elevated levels of ${prominent} are the primary driver of current air quality.`;

    if (rawLang === "bn" || resolvedLocale === "bn-IN") {
      summary = `বাতাসের মান বর্তমানে ${params.aqiCategory} শ্রেণীতে রয়েছে।`;
      primaryExplanation = `${prominent}-এর মাত্রা বৃদ্ধির কারণে বাতাসের মানের এই পরিবর্তন।`;
    } else if (rawLang === "hi" || resolvedLocale === "hi-IN") {
      summary = `वायु गुणवत्ता वर्तमान में ${params.aqiCategory} श्रेणी में है।`;
      primaryExplanation = `${prominent} के बढ़े हुए स्तर मुख्य रूप से इस स्थिति के लिए जिम्मेदार हैं।`;
    } else if (resolvedLocale !== "en-IN") {
      summary = `[${meta.nativeName}] Air quality is currently in the ${localizedCategory} (${params.aqiCategory}) category.`;
      primaryExplanation = `Elevated levels of ${prominent} are the primary driver of current air quality.`;
    }

    return {
      summary,
      primaryPollutantExplanation: primaryExplanation,
      actionGuidance: guidance,
      forecastTrendSummary: "Forecast trends indicate standard seasonal atmospheric dispersion.",
      language: rawLang as SupportedLanguage
    };
  }

  public async generateExplanation(
    params: GenerateExplanationParams
  ): Promise<ExplanationResult> {
    const warnings: string[] = [];

    if (!this.isConfigured() || !this.client) {
      return {
        explanation: this.generateDeterministicFallback(params),
        isAiGenerated: false,
        warnings: ["Gemini AI is NOT_CONFIGURED. Using deterministic rule fallback."]
      };
    }

    const evidenceMap = new Map<string, AiEvidenceItem>();
    for (const e of params.evidenceList) {
      evidenceMap.set(e.evidenceId, e);
    }

    const rawLang = params.language || "en";
    const resolvedLocale = resolveLocale(rawLang);
    const meta = LOCALE_REGISTRY[resolvedLocale];

    const glossaryTerms = Object.entries(ENVIRONMENTAL_GLOSSARY)
      .map(([k, v]) => `${k} (${v.termEn}): ${v.translations[resolvedLocale]}`)
      .join(", ");

    const systemPrompt = `You are HawaSaathi's environmental health explainer.
CRITICAL MANDATES:
1. You MUST NEVER calculate, estimate, modify, or invent AQI values. The official/calculated AQI is provided as an immutable fact.
2. You MUST NEVER give medical diagnosis or prescribe medications.
3. Every factual claim or action guidance item MUST cite ONLY valid evidence IDs from the PROVIDED EVIDENCE LIST. Unknown citations are strictly forbidden.
4. Output MUST be valid JSON adhering strictly to the schema.
5. If Overall AQI is UNAVAILABLE, state clearly that verified CPCB AQI is unavailable and NEVER claim a MODERATE or other overall AQI category; you may only discuss available individual Type C raw pollutant values.
Language requested: ${rawLang} (${meta.name} / ${meta.nativeName}, Script: ${meta.script}, Direction: ${meta.direction})
Standardized Environmental Glossary: ${glossaryTerms}`;

    const userPrompt = `IMMUTABLE FACTS:
- Overall AQI: ${params.overallAqi !== null ? params.overallAqi : "UNAVAILABLE"} (${params.aqiCategory})
- Prominent Pollutant: ${params.prominentPollutant || "None"}
- Target Language: ${rawLang}
- Script: ${meta.script}
- Text Direction: ${meta.direction}

EVIDENCE LIST:
${params.evidenceList
  .map(
    (e) =>
      `[ID: ${e.evidenceId}] Source: ${e.source}, Pollutant: ${e.pollutant || "N/A"}, Value: ${e.value ?? "N/A"} ${e.unit || ""}, Time: ${e.timestamp}, Note: ${e.description}`
  )
  .join("\n")}

DETERMINISTIC RECOMMENDATION BASELINE:
${params.deterministicRecommendations?.map((r) => `- [${r.category}] ${r.actionSummary}: ${r.reasoning}`).join("\n") || "Standard tier baseline"}

Generate a structured JSON response with:
{
  "summary": "Clear, accessible overview of current air conditions in requested language",
  "primaryPollutantExplanation": "Simple explanation of the primary pollutant in requested language",
  "actionGuidance": [
    {
      "actionText": "Specific protective step in requested language",
      "targetGroup": "Household group e.g. general, elderly, children, respiratory",
      "citedEvidenceIds": ["valid evidence IDs from EVIDENCE LIST above"]
    }
  ],
  "forecastTrendSummary": "Summary of upcoming forecast trend in requested language",
  "language": "${rawLang}"
}`;

    const timeoutMs = params.timeoutMs || 5000;
    const candidates = [this.primaryModel, ...this.fallbackModels];

    for (const modelId of candidates) {
      if (this.isCircuitOpen(modelId)) {
        warnings.push(`Model '${modelId}' skipped: circuit breaker is open.`);
        continue;
      }

      const startTime = Date.now();
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini AI timed out after ${timeoutMs}ms on model '${modelId}'`)), timeoutMs)
        );

        const callPromise = this.client.models.generateContent({
          model: modelId,
          contents: [
            { role: "system", parts: [{ text: systemPrompt }] },
            { role: "user", parts: [{ text: userPrompt }] }
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json"
          }
        });

        const response = await Promise.race([callPromise, timeoutPromise]);
        const latencyMs = Date.now() - startTime;
        const responseText = response.text?.trim();
        if (!responseText) {
          throw new Error(`Empty response from Gemini AI on model '${modelId}'`);
        }

        let cleanText = responseText;
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedJson = JSON.parse(cleanText);
        const validated = AiExplanationSchema.parse(parsedJson);

        // Verify every cited evidence ID exists in input evidence list
        for (const item of validated.actionGuidance) {
          for (const id of item.citedEvidenceIds) {
            if (!evidenceMap.has(id)) {
              throw new Error(`AI generated invalid hallucinated evidence citation: '${id}'`);
            }
          }
        }

        // Cross-component consistency invariant: enforce across English & Indian scripts
        assertAiOutputConsistency(validated.summary, params.overallAqi);

        this.recordSuccess(modelId, latencyMs);

        return {
          explanation: validated,
          isAiGenerated: true,
          usedModel: modelId,
          latencyMs,
          warnings
        };
      } catch (err: unknown) {
        const classified = this.classifyError(err);
        this.recordFailure(modelId, classified.category, classified.message);
        warnings.push(
          `Gemini AI fallback triggered on model '${modelId}' [${classified.category}]: ${String(err)}`
        );

        // For non-retryable fatal client errors (e.g. 401 unauthenticated), break early
        if (classified.category === "UNAUTHENTICATED" || classified.category === "PERMISSION_DENIED") {
          break;
        }
      }
    }

    warnings.push("All Gemini models exhausted. Switched to deterministic rule fallback.");
    return {
      explanation: this.generateDeterministicFallback(params),
      isAiGenerated: false,
      warnings
    };
  }
}

export const globalAiExplainer = new AiExplainerService();
