// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { X, Users } from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import type { HouseholdContext } from "@/schemas/user-context.schema";
import type { TransitMode, RoutineActivity } from "@/schemas/routine.schema";

export interface HouseholdModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly language: SupportedLanguage;
  readonly initialContext?: HouseholdContext;
  readonly onSave: (data: {
    householdContext: HouseholdContext;
    cloudConsent: boolean;
  }) => void;
}

export const HouseholdModal: React.FC<HouseholdModalProps> = ({
  isOpen,
  onClose,
  language,
  initialContext: _initialContext,
  onSave
}) => {
  const [hasInfant, setHasInfant] = useState(false);
  const [hasElderly, setHasElderly] = useState(false);
  const [hasRespiratory, setHasRespiratory] = useState(false);
  const [commuteMode, setCommuteMode] = useState<TransitMode>("METRO_TRAIN");
  const [cloudConsent, setCloudConsent] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const members = [];
    if (hasInfant) {
      members.push({
        id: crypto.randomUUID(),
        nickname: "Infant",
        ageBracket: "INFANT_0_2" as const,
        sensitivities: {
          respiratorySensitivity: false,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 1
      });
    }
    if (hasElderly) {
      members.push({
        id: crypto.randomUUID(),
        nickname: "Elderly",
        ageBracket: "ELDERLY_60_PLUS" as const,
        sensitivities: {
          respiratorySensitivity: hasRespiratory,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 1
      });
    }
    if (!hasInfant && !hasElderly) {
      members.push({
        id: crypto.randomUUID(),
        nickname: "Adult",
        ageBracket: "ADULT_18_59" as const,
        sensitivities: {
          respiratorySensitivity: hasRespiratory,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 2
      });
    }

    const activities: RoutineActivity[] = [
      {
        activityId: crypto.randomUUID(),
        label: "Daily Commute",
        memberIds: [members[0]!.id],
        locationType: "TRANSIT",
        physicalIntensity: "LIGHT",
        timeWindow: {
          startMinuteOfDay: 510, // 08:30 AM
          durationMinutes: 45
        },
        transitMode: commuteMode,
        flexibility: {
          canShiftEarlierMinutes: 30,
          canShiftLaterMinutes: 30,
          canSubstituteWithIndoorAlternative: false,
          canChangeTransitMode: true
        }
      }
    ];

    const context: HouseholdContext = {
      householdId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: language,
      members,
      dwelling: {
        dwellingType: "APARTMENT_LOW_RISE",
        floorLevel: 3,
        proximityToMajorRoadMeters: 100,
        cooking: {
          primaryFuel: "LPG",
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
          averageDailyCookingHours: 2
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        },
        filtration: {
          hasAirPurifier: true,
          purifierLocations: ["LIVING_ROOM"],
          filterType: "TRUE_HEPA_H13",
          cleanAirDeliveryRateCadrM3H: 250
        },
        windowSealingQuality: "STANDARD_WINDOWS"
      },
      routine: activities,
      constraints: {
        affordabilityTier: "MODERATE_TO_HIGH",
        priorityGoals: ["PROTECT_VULNERABLE_MEMBER", "OPTIMIZE_INDOOR_AIR"]
      }
    };

    onSave({ householdContext: context, cloudConsent });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="household-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
    >
      <div className="hs-card relative w-full max-w-lg rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-modal-subtle">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-1 text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-[var(--hs-accent)]" />
          <h3 id="household-modal-heading" className="text-xl font-bold text-[var(--hs-text-primary)]">
            Household Context & Routine
          </h3>
        </div>
        <p className="mt-1 text-xs text-[#526466]">
          Voluntarily personalize your recommendations for multi-generational household vulnerabilities. Health info is non-diagnostic.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Vulnerable Members */}
          <div className="rounded-xl border border-slate-200 bg-[#F6F8F4] p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#164E4A]">
              Household Vulnerabilities
            </h4>
            <div className="mt-2.5 space-y-2 text-xs text-[#102A2A]">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasInfant}
                  onChange={(e) => setHasInfant(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-[#1F9D78] focus:ring-[#1F9D78]"
                />
                <span>Infants or young children under 5 in household</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasElderly}
                  onChange={(e) => setHasElderly(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-[#1F9D78] focus:ring-[#1F9D78]"
                />
                <span>Elderly family members (65+ years)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasRespiratory}
                  onChange={(e) => setHasRespiratory(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-[#1F9D78] focus:ring-[#1F9D78]"
                />
                <span>Self-reported respiratory or cardiac sensitivity</span>
              </label>
            </div>
          </div>

          {/* Commute Mode */}
          <div className="rounded-xl border border-slate-200 bg-[#F6F8F4] p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#164E4A]">
              Daily Commute Mode
            </h4>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(["WALKING", "OPEN_AUTO_RICKSHAW", "NON_AC_BUS", "METRO_TRAIN", "AC_CAR_CAB"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCommuteMode(mode)}
                  className={`rounded-lg border px-3 py-2 font-medium transition ${commuteMode === mode
                    ? "border-[#1F9D78] bg-[#B8E6D2]/25 text-[#164E4A] font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                >
                  {mode.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* DPDP Act Consent */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 text-xs text-slate-700">
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={cloudConsent}
                onChange={(e) => setCloudConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 bg-white text-[#1F9D78] focus:ring-[#1F9D78]"
              />
              <span className="leading-relaxed">
                <strong className="text-[#164E4A]">DPDP Act (2023) Consent:</strong> I voluntarily consent to storing this non-diagnostic household context for personalized recommendations. (Unchecked context remains in local session storage).
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F6F8F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#1F9D78] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#164E4A]"
            >
              Save Context
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
