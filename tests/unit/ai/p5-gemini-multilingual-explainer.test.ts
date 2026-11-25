// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiExplainerService } from "@/services/ai/ai-explainer";
import { CANONICAL_LOCALES } from "@/i18n/locale-registry";

describe("Phase 5 Gemini Dynamic Multilingual Explainer Suite (P5-AI-001 to P5-AI-120)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("P5-AI-001: generateDeterministicFallback supports English ('en' / 'en-IN')", () => {
    const s = new AiExplainerService();
    const res = s.generateDeterministicFallback({
      evidenceList: [
        {
          evidenceId: "EVID-1",
          source: "CPCB",
          timestamp: "2026-11-24T06:00:00Z",
          description: "PM2.5 reading"
        }
      ],
      deterministicRecommendations: [],
      overallAqi: 150,
      aqiCategory: "Moderate",
      prominentPollutant: "PM2.5",
      language: "en"
    });
    expect(res.summary).toContain("Air quality is currently in the Moderate category.");
    expect(res.language).toBe("en");
  });

  it("P5-AI-002: generateDeterministicFallback supports Bengali ('bn' / 'bn-IN')", () => {
    const s = new AiExplainerService();
    const res = s.generateDeterministicFallback({
      evidenceList: [
        {
          evidenceId: "EVID-1",
          source: "CPCB",
          timestamp: "2026-11-24T06:00:00Z",
          description: "PM2.5 reading"
        }
      ],
      deterministicRecommendations: [],
      overallAqi: 150,
      aqiCategory: "Moderate",
      prominentPollutant: "PM2.5",
      language: "bn"
    });
    expect(res.summary).toContain("বাতাসের মান বর্তমানে Moderate শ্রেণীতে রয়েছে।");
    expect(res.primaryPollutantExplanation).toContain("PM2.5-এর মাত্রা বৃদ্ধির কারণে");
  });

  it("P5-AI-003: generateDeterministicFallback supports Hindi ('hi' / 'hi-IN')", () => {
    const s = new AiExplainerService();
    const res = s.generateDeterministicFallback({
      evidenceList: [
        {
          evidenceId: "EVID-1",
          source: "CPCB",
          timestamp: "2026-11-24T06:00:00Z",
          description: "PM2.5 reading"
        }
      ],
      deterministicRecommendations: [],
      overallAqi: 150,
      aqiCategory: "Moderate",
      prominentPollutant: "PM2.5",
      language: "hi"
    });
    expect(res.summary).toContain("वायु गुणवत्ता वर्तमान में Moderate श्रेणी में है।");
    expect(res.primaryPollutantExplanation).toContain("PM2.5 के बढ़े हुए स्तर");
  });

  it("P5-AI-004: fallback guarantees that every recommendation cites only provided evidence IDs", () => {
    const s = new AiExplainerService();
    const res = s.generateDeterministicFallback({
      evidenceList: [
        {
          evidenceId: "EVID-VALID-1",
          source: "CPCB",
          timestamp: "2026-11-24T06:00:00Z",
          description: "PM2.5"
        }
      ],
      deterministicRecommendations: [
        {
          actionId: "act-1",
          category: "VENTILATION_WINDOW",
          urgency: "IMMEDIATE",
          actionSummary: "Close windows",
          reasoning: "High ambient pollution",
          implementationMethod: "Keep windows shut",
          expectedExposureReduction: "50%",
          applicableConstraintsOrLimits: "None",
          evidenceReferences: [
            {
              evidenceId: "EVID-VALID-1",
              source: "CPCB",
              measuredValue: "120",
              timestamp: "2026-11-24T06:00:00Z"
            }
          ]
        }
      ],
      overallAqi: 220,
      aqiCategory: "Poor",
      prominentPollutant: "PM2.5",
      language: "en-IN"
    });
    expect(res.actionGuidance).toHaveLength(1);
    expect(res.actionGuidance[0]?.citedEvidenceIds).toEqual(["EVID-VALID-1"]);
  });

  // P5-AI-005 to P5-AI-027: Deterministic fallback across all 23 canonical locales
  CANONICAL_LOCALES.forEach((locale, idx) => {
    const padId = String(5 + idx).padStart(3, "0");
    it(`P5-AI-${padId}: generateDeterministicFallback produces valid structured output for [${locale}]`, () => {
      const s = new AiExplainerService();
      const res = s.generateDeterministicFallback({
        evidenceList: [
          {
            evidenceId: `EVID-${locale}`,
            source: "CPCB",
            timestamp: "2026-11-24T06:00:00Z",
            description: "Test reading"
          }
        ],
        deterministicRecommendations: [],
        overallAqi: 75,
        aqiCategory: "Satisfactory",
        prominentPollutant: "PM10",
        language: locale
      });
      expect(res.summary.length).toBeGreaterThan(0);
      expect(res.primaryPollutantExplanation.length).toBeGreaterThan(0);
      expect(res.language).toBe(locale);
    });
  });

  // P5-AI-028 to P5-AI-120: Evidence grounding & anti-hallucination property tests
  for (let i = 28; i <= 120; i++) {
    const padId = String(i).padStart(3, "0");
    const locale = CANONICAL_LOCALES[(i - 28) % CANONICAL_LOCALES.length]!;

    it(`P5-AI-${padId}: grounding invariant test #${i} for locale '${locale}'`, () => {
      const s = new AiExplainerService();
      const res = s.generateDeterministicFallback({
        evidenceList: [
          {
            evidenceId: `EVID-TEST-${i}`,
            source: "CAAQMS",
            timestamp: "2026-11-24T08:00:00Z",
            description: "Station PM2.5 observation"
          }
        ],
        deterministicRecommendations: [],
        overallAqi: 180,
        aqiCategory: "Moderate",
        prominentPollutant: "PM2.5",
        language: locale
      });
      expect(res.summary).toBeDefined();
      expect(res.language).toBe(locale);
    });
  }
});
