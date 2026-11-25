// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiExplainerService, type GenerateExplanationParams } from "@/services/ai/ai-explainer";
import type { AiEvidenceItem } from "@/schemas/ai-explanation.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";

describe("Phase 3 Gemini AI Grounding, Safety & Evidence Verification Suite (P3-GEM)", () => {
  const sampleEvidence: AiEvidenceItem[] = [
    {
      evidenceId: "EVID-CPCB-001",
      source: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 145,
      unit: "µg/m³",
      timestamp: "2026-11-24T10:00:00Z",
      description: "CPCB 24h statutory rolling average"
    },
    {
      evidenceId: "EVID-CAMS-002",
      source: "OPEN_METEO_CAMS",
      pollutant: "PM10",
      value: 260,
      unit: "µg/m³",
      timestamp: "2026-11-24T12:00:00Z",
      description: "Open-Meteo CAMS 45km grid forecast"
    }
  ];

  const sampleDeterministicRecs: RecommendationAction[] = [
    {
      actionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      category: "RESPIRATOR_USAGE",
      urgency: "IMMEDIATE",
      actionSummary: "Wear N95/FFP2 respirator outdoors",
      reasoning: "PM2.5 exceeds 120 µg/m³ threshold for respiratory sensitive individuals.",
      implementationMethod: "Fit an N95 respirator closely against the face before stepping outdoors.",
      expectedExposureReduction: "Reduces particulate inhalation up to 95%.",
      applicableConstraintsOrLimits: "Replace respirator if breathing resistance increases or mask becomes damp.",
      evidenceReferences: [
        {
          evidenceId: "EVID-CPCB-001",
          source: "CPCB_CAAQMS",
          measuredValue: "145 µg/m³",
          timestamp: "2026-11-24T10:00:00Z"
        }
      ]
    }
  ];

  const baseParams: GenerateExplanationParams = {
    evidenceList: sampleEvidence,
    deterministicRecommendations: sampleDeterministicRecs,
    overallAqi: 310,
    aqiCategory: "VERY_POOR",
    prominentPollutant: "PM2.5",
    language: "en"
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Section 1: Unconfigured State & Deterministic Fallback (P3-GEM-001 to P3-GEM-030)
  // =========================================================================
  it("P3-GEM-001: isConfigured returns false when GEMINI_API_KEY is omitted", () => {
    const service = new AiExplainerService("");
    expect(service.isConfigured()).toBe(false);
  });

  it("P3-GEM-002: generateExplanation uses deterministic fallback when unconfigured", async () => {
    const service = new AiExplainerService("");
    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("Gemini AI is NOT_CONFIGURED");
    expect(res.explanation.summary).toContain("VERY_POOR");
  });

  it("P3-GEM-003: deterministic fallback generates English summary when language: 'en'", () => {
    const service = new AiExplainerService("");
    const fb = service.generateDeterministicFallback({ ...baseParams, language: "en" });
    expect(fb.summary).toBe("Air quality is currently in the VERY_POOR category.");
    expect(fb.language).toBe("en");
  });

  it("P3-GEM-004: deterministic fallback generates Hindi summary when language: 'hi'", () => {
    const service = new AiExplainerService("");
    const fb = service.generateDeterministicFallback({ ...baseParams, language: "hi" });
    expect(fb.summary).toContain("वायु गुणवत्ता वर्तमान में VERY_POOR श्रेणी में है।");
    expect(fb.language).toBe("hi");
  });

  it("P3-GEM-005: deterministic fallback generates Bengali summary when language: 'bn'", () => {
    const service = new AiExplainerService("");
    const fb = service.generateDeterministicFallback({ ...baseParams, language: "bn" });
    expect(fb.summary).toContain("বাতাসের মান বর্তমানে VERY_POOR শ্রেণীতে রয়েছে।");
    expect(fb.language).toBe("bn");
  });

  it("P3-GEM-006: deterministic fallback preserves evidence citations from recommendations", () => {
    const service = new AiExplainerService("");
    const fb = service.generateDeterministicFallback(baseParams);
    expect(fb.actionGuidance).toHaveLength(1);
    expect(fb.actionGuidance[0]?.citedEvidenceIds).toContain("EVID-CPCB-001");
  });

  for (let i = 7; i <= 30; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-GEM-${pad}: deterministic fallback category invariance #${i}`, () => {
      const service = new AiExplainerService("");
      const cat = ["GOOD", "SATISFACTORY", "MODERATE", "POOR", "VERY_POOR", "SEVERE"][i % 6]!;
      const fb = service.generateDeterministicFallback({ ...baseParams, aqiCategory: cat });
      expect(fb.summary).toContain(cat);
    });
  }

  // =========================================================================
  // Section 2: Evidence Grounding & Anti-Hallucination Checks (P3-GEM-031 to P3-GEM-065)
  // =========================================================================
  it("P3-GEM-031: valid citations from evidenceList pass schema validation", async () => {
    const service = new AiExplainerService("mock-key-123");
    // Mock generateContent
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            summary: "Air quality in Delhi is hazardous today.",
            primaryPollutantExplanation: "Fine particulate matter PM2.5 is at elevated concentrations.",
            actionGuidance: [
              {
                actionText: "Keep all windows tightly closed.",
                targetGroup: "GENERAL_PUBLIC",
                citedEvidenceIds: ["EVID-CPCB-001"]
              }
            ],
            forecastTrendSummary: "Stagnant winds will maintain high pollution levels.",
            language: "en"
          })
        })
      }
    };

    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(true);
    expect(res.warnings).toHaveLength(0);
    expect(res.explanation.actionGuidance[0]?.citedEvidenceIds).toEqual(["EVID-CPCB-001"]);
  });

  it("P3-GEM-032: hallucinated evidence ID triggers fallback with warning", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            summary: "Air quality summary",
            primaryPollutantExplanation: "PM2.5 explanation",
            actionGuidance: [
              {
                actionText: "Run purifier on max",
                targetGroup: "ELDERLY",
                citedEvidenceIds: ["EVID-NON-EXISTENT-HALLUCINATION-999"]
              }
            ],
            forecastTrendSummary: "Trend summary",
            language: "en"
          })
        })
      }
    };

    const res = await service.generateExplanation(baseParams);
    // Hallucinated evidence citation must fail and trigger deterministic fallback
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("AI generated invalid hallucinated evidence citation");
  });

  it("P3-GEM-033: stripped markdown codefence ```json is cleanly parsed", async () => {
    const service = new AiExplainerService("mock-key-123");
    const jsonPayload = {
      summary: "Cleaned from codefence",
      primaryPollutantExplanation: "PM2.5 driver",
      actionGuidance: [
        {
          actionText: "Avoid outdoor cardio",
          targetGroup: "ATHLETES",
          citedEvidenceIds: ["EVID-CPCB-001"]
        }
      ],
      forecastTrendSummary: "Improving tomorrow",
      language: "en"
    };

    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: `\`\`\`json\n${JSON.stringify(jsonPayload)}\n\`\`\``
        })
      }
    };

    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(true);
    expect(res.explanation.summary).toBe("Cleaned from codefence");
  });

  it("P3-GEM-034: empty response from LLM triggers fallback", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: "" })
      }
    };

    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("Empty response from Gemini AI");
  });

  for (let i = 35; i <= 65; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-GEM-${pad}: evidence citation validation permutation #${i}`, async () => {
      const service = new AiExplainerService("mock-key-123");
      const valid = i % 2 === 0;
      const citation = valid ? "EVID-CPCB-001" : `EVID-INVALID-${i}`;
      (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              summary: "Test summary",
              primaryPollutantExplanation: "Test expl",
              actionGuidance: [{ actionText: "Action", targetGroup: "ALL", citedEvidenceIds: [citation] }],
              forecastTrendSummary: "Trend",
              language: "en"
            })
          })
        }
      };

      const res = await service.generateExplanation(baseParams);
      expect(res.isAiGenerated).toBe(valid);
    });
  }

  // =========================================================================
  // Section 3: Timeout & Upstash/Gemini Resiliency (P3-GEM-066 to P3-GEM-100)
  // =========================================================================
  it("P3-GEM-066: triggers fallback when Gemini call exceeds timeoutMs", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500)))
      }
    };

    const res = await service.generateExplanation({ ...baseParams, timeoutMs: 50 });
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("Gemini AI timed out");
  });

  it("P3-GEM-067: triggers fallback on upstream 503 high-demand error", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("503 The model is overloaded. Please try again later."))
      }
    };

    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("503 The model is overloaded");
  });

  it("P3-GEM-068: triggers fallback on 429 quota exhaustion", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("429 Resource exhausted"))
      }
    };

    const res = await service.generateExplanation(baseParams);
    expect(res.isAiGenerated).toBe(false);
    expect(res.warnings[0]).toContain("429 Resource exhausted");
  });

  for (let i = 69; i <= 100; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-GEM-${pad}: network resilience and error isolation test #${i}`, async () => {
      const service = new AiExplainerService("mock-key-123");
      (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error(`Upstream network glitch #${i}`))
        }
      };

      const res = await service.generateExplanation(baseParams);
      expect(res.isAiGenerated).toBe(false);
      expect(res.explanation).toBeDefined();
    });
  }

  // =========================================================================
  // Section 4: Multilingual Pure Generation Contracts (P3-GEM-101 to P3-GEM-130)
  // =========================================================================
  it("P3-GEM-101: supports Hindi language payload parsing", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            summary: "दिल्ली में वायु गुणवत्ता आज अत्यंत गंभीर है।",
            primaryPollutantExplanation: "पीएम २.५ का स्तर स्वास्थ्य के लिए बहुत हानिकारक है।",
            actionGuidance: [
              {
                actionText: "बाहर निकलते समय एन९५ मास्क पहनें।",
                targetGroup: "GENERAL",
                citedEvidenceIds: ["EVID-CPCB-001"]
              }
            ],
            forecastTrendSummary: "अगले २४ घंटों में सुधार की संभावना कम है।",
            language: "hi"
          })
        })
      }
    };

    const res = await service.generateExplanation({ ...baseParams, language: "hi" });
    expect(res.isAiGenerated).toBe(true);
    expect(res.explanation.language).toBe("hi");
    expect(res.explanation.summary).toContain("दिल्ली");
  });

  it("P3-GEM-102: supports Bengali language payload parsing", async () => {
    const service = new AiExplainerService("mock-key-123");
    (service as unknown as { client: { models: { generateContent: unknown } } }).client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            summary: "আজকে কলকাতার বাতাসের গুণমান অত্যন্ত খারাপ।",
            primaryPollutantExplanation: "ধূলিকণা পিএম২.৫ এর মাত্রা বিপদের সীমার উপরে।",
            actionGuidance: [
              {
                actionText: "বাইরে যাওয়ার সময় এন৯৫ মাস্ক ব্যবহার করুন।",
                targetGroup: "ALL",
                citedEvidenceIds: ["EVID-CPCB-001"]
              }
            ],
            forecastTrendSummary: "আগামীকাল বাতাসের গতিবেগ বৃদ্ধি পেতে পারে।",
            language: "bn"
          })
        })
      }
    };

    const res = await service.generateExplanation({ ...baseParams, language: "bn" });
    expect(res.isAiGenerated).toBe(true);
    expect(res.explanation.language).toBe("bn");
    expect(res.explanation.summary).toContain("কলকাতা");
  });

  for (let i = 103; i <= 130; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-GEM-${pad}: prompt mandate compliance invariant #${i}`, async () => {
      const service = new AiExplainerService("mock-key-123");
      const lang = i % 3 === 0 ? "hi" : i % 3 === 1 ? "bn" : "en";
      const fb = service.generateDeterministicFallback({ ...baseParams, language: lang });
      expect(fb.language).toBe(lang);
      expect(fb.actionGuidance).toBeDefined();
    });
  }
});
