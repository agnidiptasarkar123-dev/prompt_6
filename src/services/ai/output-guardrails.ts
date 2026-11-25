// SPDX-License-Identifier: Apache-2.0
import { LOCALE_REGISTRY } from "@/i18n/locale-registry";

const ENGLISH_AQI_CATEGORY_PATTERN =
  /\b(good|satisfactory|moderate|poor|very_poor|very poor|severe)\s+(category|aqi|air quality)\b/i;

const CONTEXTUAL_ENGLISH_AQI_PATTERN =
  /\b(current(?:ly)?|today|right now|here|station|local)\b[^.!?\n;]{0,40}\b(good|satisfactory|moderate|poor|very poor|severe)\s+(aqi|air quality|category)\b/i;

const CLAIM_CLAUSE_NEGATION_RE = /\b(not|cannot|never|unavailable|no)\b/i;

const COMPOSITE_NUMERIC_AQI_PATTERN =
  /\b(?:overall|current|composite|cpcb)\s+(?:aqi|একিউআই|एक्यूआई)\s*(?:is|of|:|=|হল|है)?\s*(\d{1,3})\b/i;

const MULTI_SCRIPT_AIR_NOUNS =
  /(aqi|air quality|category|একিউআই|বায়ু|শ্রেণী|एक्यूआई|वायु|हवा|श्रेणी|காற்று|వాయు|ಗಾಳಿ|വായു|હવા|ਹਵਾ|هوا|ہوا)/i;

const UNAVAILABLE_NEGATION_PATTERN =
  /\b(unavailable|not available|cannot report|cannot determine|অনুপলব্ধ|अनुपलब्ध)\b/i;

let cachedLocaleCategoryTokens: string[] | null = null;

function getLocalizedCategoryTokens(): readonly string[] {
  if (cachedLocaleCategoryTokens) {
    return cachedLocaleCategoryTokens;
  }
  const tokens = new Set<string>();
  for (const [localeCode, meta] of Object.entries(LOCALE_REGISTRY)) {
    if (localeCode === "en-IN") continue;
    const cats = meta.cpcbCategories;
    const rawValues = [
      cats.good,
      cats.satisfactory,
      cats.moderate,
      cats.poor,
      cats.veryPoor,
      cats.severe
    ];
    for (const value of rawValues) {
      tokens.add(value.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase());
    }
  }
  tokens.add("মাঝারি");
  tokens.add("মধ্যম");
  cachedLocaleCategoryTokens = Array.from(tokens);
  return cachedLocaleCategoryTokens;
}

/**
 * Normalizes untrusted user input against Unicode homoglyphs, invisible control
 * characters, delimiter spoofing, and common prompt-injection directives.
 */
export function sanitizeUserPrompt(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<\/?(?:UNTRUSTED_USER_QUERY|SYSTEM|INSTRUCTIONS|TOOL_CALL)>/gi, " ")
    .replace(
      /\b(ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?|system\s+prompt|override\s+(?:all\s+)?rules|disregard\s+(?:previous|prior)\s+rules|reveal\s+(?:your\s+)?(?:system|hidden)\s+(?:prompt|instructions)|developer\s+mode|forget\s+everything\s+above)\b/gi,
      "[filtered]"
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

/**
 * Redacts file paths, stack frames, credentials, and token patterns from
 * client-visible diagnostic strings.
 */
export function sanitizePublicErrorMessage(message: string): string {
  return message
    .replace(/https?:\/\/[^@\s]+@/gi, "https://[redacted]@")
    .replace(/\b(?:AIza[0-9A-Za-z\-_]{20,}|sk-[0-9A-Za-z]{16,}|Bearer\s+[0-9A-Za-z\-_.=]+)\b/gi, "[redacted]")
    .replace(/(?:\/[A-Za-z0-9._-]+){2,}(?::\d+(?::\d+)?)?/g, "[path]")
    .replace(/\s+at\s+[^\n]+/g, "")
    .trim();
}

/**
 * Validates AI-generated text against verified CPCB AQI facts across English
 * and Indian language scripts so unavailable metrics are never fabricated and
 * composite AQI numbers are never contradicted.
 */
export function assertAiOutputConsistency(text: string, overallAqi: number | null): void {
  if (overallAqi === null) {
    const hasNegation = UNAVAILABLE_NEGATION_PATTERN.test(text);
    const ctxMatch = CONTEXTUAL_ENGLISH_AQI_PATTERN.exec(text);
    if (
      (ctxMatch && !CLAIM_CLAUSE_NEGATION_RE.test(ctxMatch[0])) ||
      (!hasNegation && ENGLISH_AQI_CATEGORY_PATTERN.test(text))
    ) {
      throw new Error("Consistency check rejected hallucinated AQI category claim");
    }
    if (COMPOSITE_NUMERIC_AQI_PATTERN.test(text) && !hasNegation) {
      throw new Error("Consistency check rejected fabricated numeric AQI claim");
    }
    if (MULTI_SCRIPT_AIR_NOUNS.test(text) && !hasNegation) {
      const lowered = text.toLowerCase();
      for (const token of getLocalizedCategoryTokens()) {
        if (lowered.includes(token)) {
          throw new Error("Consistency check rejected localized hallucinated AQI category claim");
        }
      }
    }
    return;
  }

  const numericMatch = COMPOSITE_NUMERIC_AQI_PATTERN.exec(text);
  if (numericMatch) {
    const claimedAqi = Number(numericMatch[1]);
    if (claimedAqi !== overallAqi) {
      throw new Error("Consistency check rejected contradicted composite AQI figure");
    }
  }
}
