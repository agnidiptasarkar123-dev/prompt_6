import { CpcbCategory } from "@/schemas/cpcb.schema";

export interface CategoryAdvisory {
  category: CpcbCategory;
  aqiRange: string;
  generalPublicAdvisory: string;
  sensitivePopulationAdvisory: string;
  outdoorActivityGuidance: string;
}

/**
 * Official CPCB National Air Quality Index Health Advisories (MoEFCC 2014)
 */
export const CPCB_HEALTH_ADVISORIES: Record<CpcbCategory, CategoryAdvisory> = {
  GOOD: {
    category: "GOOD",
    aqiRange: "0 - 50",
    generalPublicAdvisory: "Minimal health impact. Clean air conditions.",
    sensitivePopulationAdvisory: "Air quality is ideal for all individuals.",
    outdoorActivityGuidance: "Full outdoor activities and active mobility (cycling, walking) recommended."
  },
  SATISFACTORY: {
    category: "SATISFACTORY",
    aqiRange: "51 - 100",
    generalPublicAdvisory: "May cause minor breathing discomfort to sensitive people.",
    sensitivePopulationAdvisory: "People with respiratory conditions should monitor prolonged heavy exertion.",
    outdoorActivityGuidance: "Normal outdoor activities permitted."
  },
  MODERATE: {
    category: "MODERATE",
    aqiRange: "101 - 200",
    generalPublicAdvisory: "May cause breathing discomfort to people with lung disease, asthma and heart disease.",
    sensitivePopulationAdvisory: "Children and elderly should reduce prolonged outdoor physical exertion.",
    outdoorActivityGuidance: "Sensitive members shift intense cardio workouts indoors; general public can continue normal activities."
  },
  POOR: {
    category: "POOR",
    aqiRange: "201 - 300",
    generalPublicAdvisory: "May cause breathing discomfort to most people on prolonged exposure.",
    sensitivePopulationAdvisory: "People with heart and lung disease should avoid outdoor exertion.",
    outdoorActivityGuidance: "Avoid intense outdoor cardio/running. Consider wearing particulate respirators (N95) during outdoor transit."
  },
  VERY_POOR: {
    category: "VERY_POOR",
    aqiRange: "301 - 400",
    generalPublicAdvisory: "May cause respiratory illness on prolonged exposure. Pronounced effect on sensitive people.",
    sensitivePopulationAdvisory: "Everyone should avoid strenuous outdoor physical exertion; sensitive groups stay indoors.",
    outdoorActivityGuidance: "Suspend all outdoor exercise. Essential outdoor transit requires well-fitted particulate filtration."
  },
  SEVERE: {
    category: "SEVERE",
    aqiRange: "401 - 500",
    generalPublicAdvisory: "Affects healthy people and seriously impacts those with existing medical conditions.",
    sensitivePopulationAdvisory: "Extreme hazard. All physical exertion outdoors must cease.",
    outdoorActivityGuidance: "Remain indoors with sealed windows. Sustainable transit (walking/cycling) is temporarily deferred for personal safety."
  }
};
