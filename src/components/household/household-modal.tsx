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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-teal-400" />
          <h3 className="text-xl font-bold text-white">Household Context & Routine</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Voluntarily personalize your recommendations for multi-generational household vulnerabilities. Health info is non-diagnostic.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Vulnerable Members */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Household Vulnerabilities
            </h4>
            <div className="mt-2.5 space-y-2 text-xs text-slate-200">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasInfant}
                  onChange={(e) => setHasInfant(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500"
                />
                <span>Infants or young children under 5 in household</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasElderly}
                  onChange={(e) => setHasElderly(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500"
                />
                <span>Elderly family members (65+ years)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hasRespiratory}
                  onChange={(e) => setHasRespiratory(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500"
                />
                <span>Self-reported respiratory or cardiac sensitivity</span>
              </label>
            </div>
          </div>

          {/* Commute Mode */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Daily Commute Mode
            </h4>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(["WALKING", "OPEN_AUTO_RICKSHAW", "NON_AC_BUS", "METRO_TRAIN", "AC_CAR_CAB"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCommuteMode(mode)}
                  className={`rounded-lg border px-3 py-2 font-medium transition ${
                    commuteMode === mode
                      ? "border-teal-500 bg-teal-500/10 text-teal-300"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {mode.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* DPDP Act Consent */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-3.5 text-xs text-slate-300">
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={cloudConsent}
                onChange={(e) => setCloudConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-teal-500"
              />
              <span className="leading-relaxed">
                <strong className="text-teal-300">DPDP Act (2023) Consent:</strong> I voluntarily consent to storing this non-diagnostic household context for personalized recommendations. (Unchecked context remains in local session storage).
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-teal-400"
            >
              Save Context
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
