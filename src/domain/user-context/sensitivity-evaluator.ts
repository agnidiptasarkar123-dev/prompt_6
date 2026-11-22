// SPDX-License-Identifier: Apache-2.0
import { HouseholdMember } from "@/schemas/household.schema";

export interface MemberVulnerabilityAssessment {
  memberId: string;
  nickname: string;
  isSensitiveToSmog: boolean;
  sensitivityFactors: string[];
}

/**
 * Assesses self-reported sensitivities in a non-diagnostic, non-clinical manner.
 * Grounded in public health exposure advisories (WHO / CPCB).
 */
export function assessMemberVulnerabilities(
  member: HouseholdMember
): MemberVulnerabilityAssessment {
  const factors: string[] = [];

  if (member.ageBracket === "INFANT_0_2" || member.ageBracket === "CHILD_3_12") {
    factors.push("Developing respiratory system (Age < 13)");
  }
  if (member.ageBracket === "ELDERLY_60_PLUS") {
    factors.push("Higher vulnerability to fine particulates (Age 60+)");
  }
  if (member.sensitivities.respiratorySensitivity) {
    factors.push("Self-reported respiratory sensitivity");
  }
  if (member.sensitivities.cardiovascularSensitivity) {
    factors.push("Self-reported cardiovascular sensitivity");
  }
  if (member.sensitivities.pregnancy) {
    factors.push("Pregnancy");
  }
  if (member.sensitivities.allergiesOrSinusitis) {
    factors.push("Self-reported dust/airborne allergy sensitivity");
  }

  return {
    memberId: member.id,
    nickname: member.nickname,
    isSensitiveToSmog: factors.length > 0,
    sensitivityFactors: factors
  };
}
