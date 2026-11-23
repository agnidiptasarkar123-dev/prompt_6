// SPDX-License-Identifier: Apache-2.0
import { GoogleGenAI } from "@google/genai";
import {
  AiExplanationSchema,
  type AiExplanation,
  type AiEvidenceItem
} from "@/schemas/ai-explanation.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";

export interface GenerateExplanationParams {
  readonly evidenceList: readonly AiEvidenceItem[];
  readonly deterministicRecommendations: readonly RecommendationAction[];
  readonly overallAqi: number | null;
  readonly aqiCategory: string;
  readonly prominentPollutant: string | null;
  readonly language?: "en" | "bn" | "hi";
  readonly timeoutMs?: number;
}

export class AiExplainerService {
  private readonly client: GoogleGenAI | null = null;
  private readonly modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env["GEMINI_API_KEY"];
    this.modelName = modelName || process.env["GEMINI_MODEL"] || "gemini-2.5-flash";

    if (key && key.trim().length > 0) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public generateDeterministicFallback(
    params: GenerateExplanationParams
  ): AiExplanation {
    const lang = params.language || "en";
    const prominent = params.prominentPollutant || "particulate matter";

    let summary = `Air quality is currently in the ${params.aqiCategory} category.`;
    let primaryExplanation = `Elevated levels of ${prominent} are the primary driver of current air quality.`;

    if (lang === "bn") {
      summary = `বাতাসের মান বর্তমানে ${params.aqiCategory} শ্রেণীতে রয়েছে।`;
      primaryExplanation = `${prominent}-এর মাত্রা বৃদ্ধির কারণে বাতাসের মানের এই পরিবর্তন।`;
    } else if (lang === "hi") {
      summary = `वायु गुणवत्ता वर्तमान में ${params.aqiCategory} श्रेणी में है।`;
      primaryExplanation = `${prominent} के बढ़े हुए स्तर मुख्य रूप से इस स्थिति के लिए जिम्मेदार हैं।`;
    }

    const validEvidenceIds = params.evidenceList.map((e) => e.evidenceId);

    const guidance = params.deterministicRecommendations.map((rec) => {
      const citedId = rec.evidenceReferences?.[0]?.evidenceId;
      return {
        actionText: rec.actionSummary + ": " + rec.reasoning,
        targetGroup: rec.category,
        citedEvidenceIds: citedId && validEvidenceIds.includes(citedId)
          ? [citedId]
          : validEvidenceIds.slice(0, 1)
      };
    });

    return {
      summary,
      primaryPollutantExplanation: primaryExplanation,
      actionGuidance: guidance,
      forecastTrendSummary: "Forecast trends indicate standard seasonal atmospheric dispersion.",
      language: lang
    };
  }

  public async generateExplanation(
    params: GenerateExplanationParams
  ): Promise<{ explanation: AiExplanation; isAiGenerated: boolean; warnings: string[] }> {
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

    const systemPrompt = `You are HawaSaathi's environmental health explainer.
CRITICAL MANDATES:
1. You MUST NEVER calculate, estimate, modify, or invent AQI values. The official/calculated AQI is provided as an immutable fact.
2. You MUST NEVER give medical diagnosis or prescribe medications.
3. Every factual claim or action guidance item MUST cite ONLY valid evidence IDs from the PROVIDED EVIDENCE LIST. Unknown citations are strictly forbidden.
4. Output MUST be valid JSON adhering strictly to the schema.
Language requested: ${params.language || "en"}`;

    const userPrompt = `IMMUTABLE FACTS:
- Overall AQI: ${params.overallAqi !== null ? params.overallAqi : "UNAVAILABLE"} (${params.aqiCategory})
- Prominent Pollutant: ${params.prominentPollutant || "None"}
- Target Language: ${params.language || "en"}

EVIDENCE LIST:
${params.evidenceList
  .map(
    (e) =>
      `[ID: ${e.evidenceId}] Source: ${e.source}, Pollutant: ${e.pollutant || "N/A"}, Value: ${e.value ?? "N/A"} ${e.unit || ""}, Time: ${e.timestamp}, Note: ${e.description}`
  )
  .join("\n")}

DETERMINISTIC RECOMMENDATION BASELINE:
${params.deterministicRecommendations.map((r) => `- [${r.category}] ${r.actionSummary}: ${r.reasoning}`).join("\n")}

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
  "language": "${params.language || "en"}"
}`;

    const timeoutMs = params.timeoutMs || 5000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini AI timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const callPromise = this.client.models.generateContent({
        model: this.modelName,
        contents: [
          { role: "system", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: userPrompt }] }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("Empty response from Gemini AI");
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

      return {
        explanation: validated,
        isAiGenerated: true,
        warnings: []
      };
    } catch (err: unknown) {
      warnings.push(`Gemini AI fallback triggered: ${String(err)}`);
      return {
        explanation: this.generateDeterministicFallback(params),
        isAiGenerated: false,
        warnings
      };
    }
  }
}

export const globalAiExplainer = new AiExplainerService();
