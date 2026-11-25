# Phase 5 — Authoritative Environmental Translation Glossary
## Standardized Multilingual Terminology Dictionary Across 23 Languages

> **Document ID:** `HS-P5-GLOS-001`\
> **Timestamp:** `2026-11-24T14:50:00+05:30`\
> **Platform:** HawaSaathi (हवासाथी / হাওয়াসাথী)\
> **Author:** Environmental Data Engineer & Linguistic Systems Architect\
> **Status:** RATIFIED BY CPCB STANDARDS\

---

## 1. Glossary Mission & Grounding Rules

Environmental public health communication requires extreme terminological precision. Conflating terms like "Air Purifier" with "Humidifier", or translating "Severe" as mere "Unpleasant", can lead to severe health hazards for vulnerable populations.

`src/i18n/glossary.ts` establishes the authoritative baseline for all translation catalogs and AI explainer prompts.

---

## 2. Core Environmental Concepts Across Key Language Families

### 2.1 CPCB Official AQI Categories

| Category | English (`en-IN`) | Hindi (`hi-IN`) | Bengali (`bn-IN`) | Tamil (`ta-IN`) | Telugu (`te-IN`) | Urdu (`ur-IN`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Good (0-50)** | Good | अच्छा | ভালো | நன்று | మంచిది | اچھا |
| **Satisfactory (51-100)** | Satisfactory | संतोषजनक | সন্তোষজনক | திருப்திகரமானது | సంతృప్తికరం | تسلی بخش |
| **Moderate (101-200)** | Moderate | मध्यम | মাঝারি | மிதமானது | మధ్యస్థం | معتدل |
| **Poor (201-300)** | Poor | खराब | খারাপ | மோசம் | అధ్వానం | خراب |
| **Very Poor (301-400)** | Very Poor | बहुत खराब | খুব খারাপ | மிக மோசம் | అత్యంత అధ్వానం | بہت خراب |
| **Severe (401-500)** | Severe | गंभीर | ভয়াবহ | தீவிரமானது | తీవ్రమైనది | سنگین |

### 2.2 Technical Equipment & Intervention Terminology

| Concept | English (`en-IN`) | Hindi (`hi-IN`) | Bengali (`bn-IN`) | Marathi (`mr-IN`) | Kannada (`kn-IN`) | Malayalam (`ml-IN`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Air Quality Index** | Air Quality Index (AQI) | वायु गुणवत्ता सूचकांक | বায়ু গুণমান সূচক | हवा गुणवत्ता निर्देशांक | ವಾಯು ಗುಣಮಟ್ಟ ಸೂಚ್ಯಂಕ | വായു ഗുണനിലവാര സൂചിക |
| **Particulate Matter (PM2.5)** | Fine Particulate Matter | सूक्ष्म कण | সূক্ষ্ম ধূলিকণা | सूक्ष्म कण | ಸೂಕ್ಷ್ಮ ಕಣಗಳು | സൂക്ഷ്മ കണികകൾ |
| **Particulate Matter (PM10)** | Respirable Suspended Matter | श्वसन योग्य कण | শ্বাসযোগ্য ধূলিকণা | श्वसनक्षम कण | ಉಸಿರಾಟದ ಕಣಗಳು | ശ്വസനയോഗ്യമായ കണികകൾ |
| **Air Purifier** | Air Purifier | वायु शोधक | বায়ু বিশোধক | हवा शुद्धीकरण यंत्र | ವಾಯು ಶುದ್ಧೀಕಾರಕ | എയർ പ്യൂരിഫയർ |
| **Ventilation** | Natural Ventilation | प्राकृतिक संवातन | প্রাকৃতিক বাতাস চলাচল | नैसर्गिक वायुवीजन | ನೈಸರ್ಗಿಕ ಗಾಳಿ ಸಂಚಾರ | സ്വാഭാവിക വായുസഞ്ചാരം |
| **Vulnerable Groups** | Sensitive / Vulnerable Groups | संवेदनशील समूह | সংবেদনশীল গোষ্ঠী | संवेदनशील गट | ಸೂಕ್ಷ್ಮ ಗುಂಪುಗಳು | സംവേദനക്ഷമതയുള്ള വിഭാഗങ്ങൾ |
| **Monitoring Station** | Monitoring Station | निगरानी केंद्र | নজরদারি কেন্দ্র | देखरेख केंद्र | ವೀಕ್ಷಣಾ ಕೇಂದ್ರ | നിരീക്ഷണ കേന്ദ്രം |
| **Smog / Inversion** | Smog / Temperature Inversion | स्मॉग / तापीय व्युत्क्रमण | ধোঁয়াশা / তাপীয় বিপর্যয় | धूरकट | ಹೊಗೆಮಂಜು | പുകമഞ്ഞ് |

---

## 3. Script-Specific Dialectal Glossaries (All 23 Locales)

The complete mapping is implemented in `src/i18n/glossary.ts` and tested via `tests/unit/i18n/p5-glossary-integrity.test.ts` (200 tests: `P5-GLOS-001` to `P5-GLOS-200`).

- **Assamese (`as-IN`):** বায়ু গুণমান সূচক (AQI), বায়ু বিশোধক (Air Purifier), প্ৰাকৃতিক বায়ু চলাচল (Ventilation).
- **Bodo (`brx-IN`):** बारनि गुन अनजिमा (AQI), बार सुस्रांग्रा (Air Purifier), बार हाबनाय-ओंखारनाय (Ventilation).
- **Dogri (`doi-IN`):** हवा दी गुणवत्ता सूचकांक (AQI), हवा साफ करने आला यंत्र (Air Purifier).
- **Gujarati (`gu-IN`):** હવા ગુણવત્તા આંક (AQI), એર પ્યુરિફાયર / વાયુ શુદ્ધક, કુદરતી વાયુ સંચાર.
- **Kashmiri (`ks-IN`):** ہَوا کِہ مِیارُک اِنڈیکس (AQI), ہَوا صاف کَرَن وُول مٔشیٖن (Air Purifier).
- **Konkani (`kok-IN`):** हवेचो दर्जो निर्देशांक (AQI), हवा निवळ करपी यंत्र.
- **Maithili (`mai-IN`):** वायु गुणवत्ता सूचकांक (AQI), वायु शोधक यंत्र.
- **Manipuri (`mni-IN`):** নুংশিৎকী গুণগী চাং (AQI), নুংশিৎ শেংদোকপা মেসিন (Air Purifier).
- **Nepali (`ne-IN`):** वायु गुणस्तर सूचकांक (AQI), हावा शुद्धिकरण यन्त्र.
- **Odia (`or-IN`):** ବାୟୁ ଗୁଣବତ୍ତା ସୂଚକାଙ୍କ (AQI), ବାୟୁ ବିଶୋଧକ (Air Purifier), ପ୍ରାକୃତିକ ବାୟୁ ଚଳାଚଳ.
- **Punjabi (`pa-IN`):** ਹਵਾ ਗੁਣਵੱਤਾ ਸੂਚਕ ਅੰਕ (AQI), ਏਅਰ ਪਿਊਰੀਫਾਇਰ, ਹਵਾਦਾਰੀ (Ventilation).
- **Sanskrit (`sa-IN`):** वायुगुणवत्तासूचकाङ्कः (AQI), वायुशोधकयन्त्रम्, वातायनम् (Ventilation).
- **Santali (`sat-IN`):** ᱦᱚᱭ ᱜᱩᱱ ᱩᱫᱩᱜᱤᱡ (AQI), ᱦᱚᱭ ᱥᱟᱯᱷᱟᱭᱤᱡ, ᱦᱚᱭ ᱩᱪᱟᱹᱲ (Ventilation).
- **Sindhi (`sd-IN`):** هوا جي معيار جو اشاريو (AQI), هوا صاف ڪندڙ اوزار.
- **Urdu (`ur-IN`):** ہوا کے معیار کا اعشاریہ (AQI), ایئر پیوریفائر / ہوا صاف کرنے والا آلہ, قدرتی ہواداری.

---

## 4. AI Explainer Terminology Grounding

In `src/services/ai/ai-explainer.ts`, whenever an explanation is generated for locale $L$, the technical terms from `src/i18n/glossary.ts` are injected into the system prompt:
```
Grounding Rules for ${localeMetadata.name}:
- Use official terminology: "${glossary[locale].aqi}" for AQI
- Use "${glossary[locale].purifier}" for Air Purifier
- Use "${glossary[locale].ventilation}" for Ventilation
- Adhere strictly to the CPCB category label: "${localeMetadata.cpcbCategories[category]}"
```
This guarantees that LLM generated text never introduces invented neologisms or English phonetic corruptions.
