// SPDX-License-Identifier: Apache-2.0

export type SupportedLanguage = "en" | "bn" | "hi";

export interface TranslationDictionary {
  readonly appTitle: string;
  readonly appSubtitle: string;
  readonly searchPlaceholder: string;
  readonly useLocation: string;
  readonly guestMode: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly lastUpdated: string;
  readonly aqiSummaryTitle: string;
  readonly aqiUnavailable: string;
  readonly aqiUnavailableDesc: string;
  readonly prominentPollutant: string;
  readonly pollutantBreakdownTitle: string;
  readonly stationPanelTitle: string;
  readonly distance: string;
  readonly forecastTitle: string;
  readonly forecastSubtitle: string;
  readonly recommendationsTitle: string;
  readonly indoorCoachTitle: string;
  readonly indoorCoachWarning: string;
  readonly provenanceTitle: string;
  readonly license: string;
  readonly attribution: string;
  readonly categoryGood: string;
  readonly categorySatisfactory: string;
  readonly categoryModerate: string;
  readonly categoryPoor: string;
  readonly categoryVeryPoor: string;
  readonly categorySevere: string;
  readonly languageName: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appTitle: "HawaSaathi",
    appSubtitle: "Personalised Urban Air Quality Intelligence Platform for Indian Cities",
    searchPlaceholder: "Search city or station (e.g. Kolkata, Delhi, Mumbai)...",
    useLocation: "Use Current Location",
    guestMode: "Guest Mode (Local)",
    signIn: "Sign In",
    signOut: "Sign Out",
    lastUpdated: "Last Updated",
    aqiSummaryTitle: "Air Quality Summary",
    aqiUnavailable: "Overall CPCB AQI Unavailable",
    aqiUnavailableDesc: "Fewer than 3 valid pollutants monitored or missing particulate parameters at this station.",
    prominentPollutant: "Prominent Pollutant",
    pollutantBreakdownTitle: "Monitored Pollutants",
    stationPanelTitle: "Monitoring Station Details",
    distance: "Distance",
    forecastTitle: "Atmospheric Forecast (CAMS Global)",
    forecastSubtitle: "Copernicus Atmosphere Monitoring Service 45 km grid model forecast",
    recommendationsTitle: "Personalised Health & Routine Actions",
    indoorCoachTitle: "Indoor Air Quality Coach",
    indoorCoachWarning: "Actual indoor AQI cannot be measured without dedicated indoor sensors. Guidance is based on source control and outdoor infiltration.",
    provenanceTitle: "Data Provenance & Source Transparency",
    license: "License",
    attribution: "Attribution",
    categoryGood: "Good",
    categorySatisfactory: "Satisfactory",
    categoryModerate: "Moderate",
    categoryPoor: "Poor",
    categoryVeryPoor: "Very Poor",
    categorySevere: "Severe",
    languageName: "English"
  },
  bn: {
    appTitle: "হাওয়া সাথী",
    appSubtitle: "ভারতীয় শহরগুলির জন্য ব্যক্তিগতকৃত নগর বায়ুর মান বুদ্ধিমত্তা প্ল্যাটফর্ম",
    searchPlaceholder: "শহর বা স্টেশন অনুসন্ধান করুন (যেমন: কলকাতা, দিল্লি, মুম্বই)...",
    useLocation: "বর্তমান অবস্থান ব্যবহার করুন",
    guestMode: "অতিথি মোড (স্থানীয়)",
    signIn: "সাইন ইন",
    signOut: "সাইন আউট",
    lastUpdated: "সর্বশেষ আপডেট",
    aqiSummaryTitle: "বায়ুর মানের সারাংশ",
    aqiUnavailable: "সামগ্রিক CPCB AQI অনুপলব্ধ",
    aqiUnavailableDesc: "এই স্টেশনে ৩টির কম দূষক পরিমাপ করা হয়েছে বা ধূলিকণা সংক্রান্ত তথ্য অনুপস্থিত।",
    prominentPollutant: "প্রধান দূষক",
    pollutantBreakdownTitle: "পরিমাপিত দূষকসমূহ",
    stationPanelTitle: "নজরদারি স্টেশনের বিবরণ",
    distance: "দূরত্ব",
    forecastTitle: "বায়ুমণ্ডলীয় পূর্বাভাস (CAMS গ্লোবাল)",
    forecastSubtitle: "কোপার্নিকাস অ্যাটমোস্ফিয়ার মনিটরিং সার্ভিস ৪৫ কিমি গ্রিড মডেল পূর্বাভাস",
    recommendationsTitle: "ব্যক্তিগতকৃত স্বাস্থ্য ও রুটিন পরামর্শ",
    indoorCoachTitle: "ঘরের ভেতরের বায়ুর মান সহায়ক",
    indoorCoachWarning: "ঘরের ভেতরের প্রকৃত AQI সেন্সর ছাড়া পরিমাপ করা সম্ভব নয়। এই পরামর্শ বাহ্যিক অনুপ্রবেশ ও উৎসের ওপর ভিত্তি করে দেওয়া।",
    provenanceTitle: "উপাত্তের উৎস ও স্বচ্ছতা",
    license: "লাইসেন্স",
    attribution: "স্বীকৃতি",
    categoryGood: "ভালো",
    categorySatisfactory: "সন্তোষজনক",
    categoryModerate: "মাঝারি",
    categoryPoor: "খারাপ",
    categoryVeryPoor: "খুব খারাপ",
    categorySevere: "মারাত্মক",
    languageName: "বাংলা"
  },
  hi: {
    appTitle: "हवा साथी",
    appSubtitle: "भारतीय शहरों के लिए वैयक्तिकृत शहरी वायु गुणवत्ता सूचना मंच",
    searchPlaceholder: "शहर या स्टेशन खोजें (उदा. दिल्ली, कोलकाता, मुंबई)...",
    useLocation: "वर्तमान स्थान का उपयोग करें",
    guestMode: "अतिथि मोड (स्थानीय)",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    lastUpdated: "अंतिम अद्यतन",
    aqiSummaryTitle: "वायु गुणवत्ता सारांश",
    aqiUnavailable: "समग्र CPCB AQI अनुपलब्ध",
    aqiUnavailableDesc: "इस स्टेशन पर 3 से कम प्रदूषक मापे गए हैं या कणिकीय डेटा अनुपस्थित है।",
    prominentPollutant: "प्रमुख प्रदूषक",
    pollutantBreakdownTitle: "निगरानी किए गए प्रदूषक",
    stationPanelTitle: "निगरानी स्टेशन विवरण",
    distance: "दूरी",
    forecastTitle: "वायुमंडलीय पूर्वानुमान (CAMS ग्लोबल)",
    forecastSubtitle: "कोपरनिकस एटमॉस्फियर मॉनिटरिंग सर्विस 45 किमी ग्रिड मॉडल पूर्वानुमान",
    recommendationsTitle: "व्यक्तिगत स्वास्थ्य और दिनचर्या परामर्श",
    indoorCoachTitle: "इनडोर वायु गुणवत्ता कोच",
    indoorCoachWarning: "इनडोर सेंसर के बिना वास्तविक इनडोर AQI नहीं मापा जा सकता। यह मार्गदर्शन स्रोत नियंत्रण और बाहरी प्रवेश पर आधारित है।",
    provenanceTitle: "डेटा स्रोत और पारदर्शिता",
    license: "लाइसेंस",
    attribution: "श्रेय",
    categoryGood: "अच्छा",
    categorySatisfactory: "संतोषजनक",
    categoryModerate: "मध्यम",
    categoryPoor: "खराब",
    categoryVeryPoor: "बहुत खराब",
    categorySevere: "गंभीर",
    languageName: "हिन्दी"
  }
};
