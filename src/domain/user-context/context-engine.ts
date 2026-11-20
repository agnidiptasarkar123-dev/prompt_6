import { HouseholdContext } from "@/schemas/user-context.schema";
import { assessMemberVulnerabilities, MemberVulnerabilityAssessment } from "./sensitivity-evaluator";
import { evaluateRoutineExposureWindows, DiurnalExposureWindow } from "./routine-calculator";
import { CpcbCategory } from "@/schemas/cpcb.schema";

export interface ContextProfileAnalysis {
  householdId: string;
  totalMembers: number;
  sensitiveMembersCount: number;
  memberAssessments: MemberVulnerabilityAssessment[];
  routineAnalyses: DiurnalExposureWindow[];
  primaryIndoorRiskFactor: string | null;
}

/**
 * Aggregates dynamic user context against current CPCB AQI conditions.
 */
export function analyzeHouseholdContext(
  context: HouseholdContext,
  currentCategory: CpcbCategory
): ContextProfileAnalysis {
  const memberAssessments = context.members.map((m) =>
    assessMemberVulnerabilities(m)
  );
  const sensitiveMembersCount = memberAssessments.filter((m) => m.isSensitiveToSmog).length;
  const routineAnalyses = evaluateRoutineExposureWindows(context.routine, currentCategory);

  // Identify primary indoor micro-environment risk factor
  let indoorRisk: string | null = null;
  if (context.dwelling.indoorSources.incenseOrDhoopDaily) {
    indoorRisk = "Daily incense/dhoop burning produces localized fine particulates";
  } else if (context.dwelling.indoorSources.mosquitoCoilUsage) {
    indoorRisk = "Mosquito coil combustion releases substantial particulate matter";
  } else if (context.dwelling.cooking.kitchenVentilation === "UNVENTED_INDOOR") {
    indoorRisk = "Kitchen lacks dedicated exhaust ventilation to the outdoors";
  } else if (context.dwelling.proximityToMajorRoadMeters <= 50) {
    indoorRisk = "Proximity to high-traffic corridor increases particulate infiltration";
  }

  return {
    householdId: context.householdId,
    totalMembers: context.members.length,
    sensitiveMembersCount,
    memberAssessments,
    routineAnalyses,
    primaryIndoorRiskFactor: indoorRisk
  };
}
