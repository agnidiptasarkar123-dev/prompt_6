// SPDX-License-Identifier: Apache-2.0

export type TextDirection = "ltr" | "rtl";

export type CanonicalLocale =
  | "en-IN" // English (India)
  | "as-IN" // Assamese (অসমীয়া)
  | "bn-IN" // Bengali (বাংলা)
  | "brx-IN" // Bodo (बड़ो)
  | "doi-IN" // Dogri (डोगरी)
  | "gu-IN" // Gujarati (ગુજરાતી)
  | "hi-IN" // Hindi (हिन्दी)
  | "kn-IN" // Kannada (ಕನ್ನಡ)
  | "ks-IN" // Kashmiri (کٲشُر) - Perso-Arabic, RTL
  | "kok-IN" // Konkani (कोंकणी)
  | "mai-IN" // Maithili (मैथिली)
  | "ml-IN" // Malayalam (മലയാളം)
  | "mni-IN" // Manipuri (মৈতৈলোন্ / Meitei)
  | "mr-IN" // Marathi (मराठी)
  | "ne-IN" // Nepali (नेपाली)
  | "or-IN" // Odia (ଓଡ଼ିଆ)
  | "pa-IN" // Punjabi (ਪੰਜਾਬੀ - Gurmukhi)
  | "sa-IN" // Sanskrit (संस्कृतम्)
  | "sat-IN" // Santali (ᱥᱟᱱᱛᱟᱲᱤ - Ol Chiki)
  | "sd-IN" // Sindhi (سنڌي) - Arabic, RTL
  | "ta-IN" // Tamil (தமிழ்)
  | "te-IN" // Telugu (తెలుగు)
  | "ur-IN"; // Urdu (اردو) - Nastaliq/Perso-Arabic, RTL

export type LegacyLanguageCode = "en" | "bn" | "hi";
export type SupportedLanguage = CanonicalLocale | LegacyLanguageCode;

export interface CpcbCategoryTranslations {
  readonly good: string;
  readonly satisfactory: string;
  readonly moderate: string;
  readonly poor: string;
  readonly veryPoor: string;
  readonly severe: string;
}

export interface LocaleMetadata {
  readonly code: CanonicalLocale;
  readonly name: string;
  readonly nativeName: string;
  readonly script: string;
  readonly direction: TextDirection;
  readonly fontFamily: string;
  readonly schedule: "Eighth Schedule" | "Associate Official";
  readonly reviewStatus: "verified" | "native-review-pending";
  readonly cpcbCategories: CpcbCategoryTranslations;
}

export const CANONICAL_LOCALES: readonly CanonicalLocale[] = [
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
] as const;

export const LOCALE_REGISTRY: Record<CanonicalLocale, LocaleMetadata> = {
  "en-IN": {
    code: "en-IN",
    name: "English",
    nativeName: "English (India)",
    script: "Latin",
    direction: "ltr",
    fontFamily: "Inter, system-ui, sans-serif",
    schedule: "Associate Official",
    reviewStatus: "verified",
    cpcbCategories: {
      good: "Good",
      satisfactory: "Satisfactory",
      moderate: "Moderate",
      poor: "Poor",
      veryPoor: "Very Poor",
      severe: "Severe"
    }
  },
  "as-IN": {
    code: "as-IN",
    name: "Assamese",
    nativeName: "অসমীয়া",
    script: "Bengali-Assamese",
    direction: "ltr",
    fontFamily: "'Noto Sans Bengali', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "ভাল (Good)",
      satisfactory: "সন্তোষজনক (Satisfactory)",
      moderate: "মধ্যম (Moderate)",
      poor: "বেয়া (Poor)",
      veryPoor: "অতি বেয়া (Very Poor)",
      severe: "ভয়াবহ (Severe)"
    }
  },
  "bn-IN": {
    code: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    script: "Bengali",
    direction: "ltr",
    fontFamily: "'Noto Sans Bengali', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "verified",
    cpcbCategories: {
      good: "ভালো (Good)",
      satisfactory: "সন্তোষজনক (Satisfactory)",
      moderate: "সহনীয় (Moderate)",
      poor: "খারাপ (Poor)",
      veryPoor: "খুব খারাপ (Very Poor)",
      severe: "মারাত্মক (Severe)"
    }
  },
  "brx-IN": {
    code: "brx-IN",
    name: "Bodo",
    nativeName: "बड़ो",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "मोजां (Good)",
      satisfactory: "गोजोनथाव (Satisfactory)",
      moderate: "गेजेरारि (Moderate)",
      poor: "गाज्रि (Poor)",
      veryPoor: "जोबोद गाज्रि (Very Poor)",
      severe: "गिथावना (Severe)"
    }
  },
  "doi-IN": {
    code: "doi-IN",
    name: "Dogri",
    nativeName: "डोगरी",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "शैल (Good)",
      satisfactory: "संतोषजनक (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "खराब (Poor)",
      veryPoor: "बड़ा खराब (Very Poor)",
      severe: "गंभीर (Severe)"
    }
  },
  "gu-IN": {
    code: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    script: "Gujarati",
    direction: "ltr",
    fontFamily: "'Noto Sans Gujarati', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "સારી (Good)",
      satisfactory: "સંતોષકારક (Satisfactory)",
      moderate: "મધ્યમ (Moderate)",
      poor: "નબળી (Poor)",
      veryPoor: "ખૂબ નબળી (Very Poor)",
      severe: "ગંભીર (Severe)"
    }
  },
  "hi-IN": {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "verified",
    cpcbCategories: {
      good: "अच्छा (Good)",
      satisfactory: "संतोषजनक (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "खराब (Poor)",
      veryPoor: "बहुत खराब (Very Poor)",
      severe: "गंभीर (Severe)"
    }
  },
  "kn-IN": {
    code: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    script: "Kannada",
    direction: "ltr",
    fontFamily: "'Noto Sans Kannada', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "ಉತ್ತಮ (Good)",
      satisfactory: "ತೃಪ್ತಿಕರ (Satisfactory)",
      moderate: "ಮಧ್ಯಮ (Moderate)",
      poor: "ಕಳಪೆ (Poor)",
      veryPoor: "ಅತ್ಯಂತ ಕಳಪೆ (Very Poor)",
      severe: "ತೀವ್ರ (Severe)"
    }
  },
  "ks-IN": {
    code: "ks-IN",
    name: "Kashmiri",
    nativeName: "کٲشُر",
    script: "Perso-Arabic",
    direction: "rtl",
    fontFamily: "'Noto Naskh Arabic', 'Noto Nastaliq Urdu', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "جان (Good)",
      satisfactory: "تسلی بخش (Satisfactory)",
      moderate: "درمیانہ (Moderate)",
      poor: "خراب (Poor)",
      veryPoor: "واریاہ خراب (Very Poor)",
      severe: "سخت ناگوار (Severe)"
    }
  },
  "kok-IN": {
    code: "kok-IN",
    name: "Konkani",
    nativeName: "कोंकणी",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "बरें (Good)",
      satisfactory: "समाधानी (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "वायट (Poor)",
      veryPoor: "भोव वायट (Very Poor)",
      severe: "गंभीर (Severe)"
    }
  },
  "mai-IN": {
    code: "mai-IN",
    name: "Maithili",
    nativeName: "मैथिली",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "नीक (Good)",
      satisfactory: "संतोषजनक (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "खराब (Poor)",
      veryPoor: "बड्ड खराब (Very Poor)",
      severe: "गंभीर (Severe)"
    }
  },
  "ml-IN": {
    code: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    script: "Malayalam",
    direction: "ltr",
    fontFamily: "'Noto Sans Malayalam', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "നല്ലത് (Good)",
      satisfactory: "തൃപ്തികരം (Satisfactory)",
      moderate: "മിതമായത് (Moderate)",
      poor: "മോശം (Poor)",
      veryPoor: "വളരെ മോശം (Very Poor)",
      severe: "ഗുരുതരം (Severe)"
    }
  },
  "mni-IN": {
    code: "mni-IN",
    name: "Manipuri",
    nativeName: "মৈতৈলোন্",
    script: "Bengali",
    direction: "ltr",
    fontFamily: "'Noto Sans Bengali', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "অফবা (Good)",
      satisfactory: "পেন্নিংঙাই (Satisfactory)",
      moderate: "মচং ওলবা (Moderate)",
      poor: "ফত্তবা (Poor)",
      veryPoor: "য়াম্না ফত্তবা (Very Poor)",
      severe: "অকনবা (Severe)"
    }
  },
  "mr-IN": {
    code: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "चांगले (Good)",
      satisfactory: "समाधानकारक (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "वाईट (Poor)",
      veryPoor: "अतिशय वाईट (Very Poor)",
      severe: "गंभीर (Severe)"
    }
  },
  "ne-IN": {
    code: "ne-IN",
    name: "Nepali",
    nativeName: "नेपाली",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "राम्रो (Good)",
      satisfactory: "सन्तोषजनक (Satisfactory)",
      moderate: "मध्यम (Moderate)",
      poor: "खराब (Poor)",
      veryPoor: "धेरै खराब (Very Poor)",
      severe: "गम्भीर (Severe)"
    }
  },
  "or-IN": {
    code: "or-IN",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    script: "Odia",
    direction: "ltr",
    fontFamily: "'Noto Sans Oriya', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "ଭଲ (Good)",
      satisfactory: "ସନ୍ତୋଷଜନକ (Satisfactory)",
      moderate: "ମଧ୍ୟମ (Moderate)",
      poor: "ଖରାପ (Poor)",
      veryPoor: "ଅତି ଖରାପ (Very Poor)",
      severe: "ମାରାତ୍ମକ (Severe)"
    }
  },
  "pa-IN": {
    code: "pa-IN",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    script: "Gurmukhi",
    direction: "ltr",
    fontFamily: "'Noto Sans Gurmukhi', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "ਚੰਗਾ (Good)",
      satisfactory: "ਤਸੱਲੀਬਖ਼ਸ਼ (Satisfactory)",
      moderate: "ਦਰਮਿਆਨਾ (Moderate)",
      poor: "ਮਾੜਾ (Poor)",
      veryPoor: "ਬਹੁਤ ਮਾੜਾ (Very Poor)",
      severe: "ਗੰਭੀਰ (Severe)"
    }
  },
  "sa-IN": {
    code: "sa-IN",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    script: "Devanagari",
    direction: "ltr",
    fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "उत्तमम् (Good)",
      satisfactory: "सन्तोषजनकम् (Satisfactory)",
      moderate: "मध्यमम् (Moderate)",
      poor: "अधमम् (Poor)",
      veryPoor: "अत्यधमम् (Very Poor)",
      severe: "तीव्रम् (Severe)"
    }
  },
  "sat-IN": {
    code: "sat-IN",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",
    script: "Ol Chiki",
    direction: "ltr",
    fontFamily: "'Noto Sans Ol Chiki', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "ᱵᱮᱥ (Good)",
      satisfactory: "ᱥᱩᱠᱷᱟᱹᱞᱤ (Satisfactory)",
      moderate: "ᱛᱟᱞᱟᱢᱟᱞᱟ (Moderate)",
      poor: "ᱵᱟᱹᱲᱤᱡ (Poor)",
      veryPoor: "ᱟᱹᱰᱤ ᱵᱟᱹᱲᱤᱡ (Very Poor)",
      severe: "ᱵᱚᱛᱚᱨᱟᱱ (Severe)"
    }
  },
  "sd-IN": {
    code: "sd-IN",
    name: "Sindhi",
    nativeName: "سنڌي",
    script: "Arabic",
    direction: "rtl",
    fontFamily: "'Noto Naskh Arabic', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "سٺو (Good)",
      satisfactory: "اطمينان بخش (Satisfactory)",
      moderate: "معتدل (Moderate)",
      poor: "خراب (Poor)",
      veryPoor: "تمام خراب (Very Poor)",
      severe: "انتہائی خراب (Severe)"
    }
  },
  "ta-IN": {
    code: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    script: "Tamil",
    direction: "ltr",
    fontFamily: "'Noto Sans Tamil', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "நன்று (Good)",
      satisfactory: "திருப்திகரமானது (Satisfactory)",
      moderate: "மிதமானது (Moderate)",
      poor: "மோசமானது (Poor)",
      veryPoor: "மிகவும் மோசமானது (Very Poor)",
      severe: "கடுமையானது (Severe)"
    }
  },
  "te-IN": {
    code: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    script: "Telugu",
    direction: "ltr",
    fontFamily: "'Noto Sans Telugu', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "native-review-pending",
    cpcbCategories: {
      good: "మంచిది (Good)",
      satisfactory: "సంతృప్తికరం (Satisfactory)",
      moderate: "మధ్యస్థం (Moderate)",
      poor: "పేలవం (Poor)",
      veryPoor: "చాలా పేలవం (Very Poor)",
      severe: "తీవ్రమైనది (Severe)"
    }
  },
  "ur-IN": {
    code: "ur-IN",
    name: "Urdu",
    nativeName: "اردو",
    script: "Perso-Arabic",
    direction: "rtl",
    fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', system-ui, sans-serif",
    schedule: "Eighth Schedule",
    reviewStatus: "verified",
    cpcbCategories: {
      good: "بہتر (Good)",
      satisfactory: "اطمینان بخش (Satisfactory)",
      moderate: "معتدل (Moderate)",
      poor: "خراب (Poor)",
      veryPoor: "بہت خراب (Very Poor)",
      severe: "شدید (Severe)"
    }
  }
};

export function resolveLocale(lang?: string | null): CanonicalLocale {
  if (!lang) return "en-IN";
  const normalized = lang.trim().toLowerCase();
  if (normalized === "en" || normalized === "en-in" || normalized.startsWith("en-")) return "en-IN";
  if (normalized === "bn" || normalized === "bn-in" || normalized.startsWith("bn-")) return "bn-IN";
  if (normalized === "hi" || normalized === "hi-in" || normalized.startsWith("hi-")) return "hi-IN";

  for (const locale of CANONICAL_LOCALES) {
    if (locale.toLowerCase() === normalized) return locale;
    const prefix = locale.split("-")[0]?.toLowerCase();
    if (prefix && (normalized === prefix || normalized.startsWith(`${prefix}-`))) {
      return locale;
    }
  }

  return "en-IN";
}

export function getTextDirection(lang?: string | null): TextDirection {
  const loc = resolveLocale(lang);
  return LOCALE_REGISTRY[loc].direction;
}

export function getFontFamily(lang?: string | null): string {
  const loc = resolveLocale(lang);
  return LOCALE_REGISTRY[loc].fontFamily;
}
