// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback } from "react";
import { saveGuestContext } from "@/lib/firebase/guest-context";
import { compactObservationsForRequest } from "@/lib/http/compact-payload";
import type { SupportedLanguage } from "@/i18n/translations";
import type { ThemeMode } from "@/theme/tokens";
import type { CpcbAqiResult, CpcbCategory } from "@/schemas/cpcb.schema";
import type { NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";
import type { HouseholdContext } from "@/schemas/user-context.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import type { AiExplanation } from "@/schemas/ai-explanation.schema";
import type { IndoorHazardAssessment } from "@/domain/indoor/source-control";
import type { VentilationWindowDecision } from "@/domain/indoor/ventilation-decision";

export interface UseHouseholdAndRecommendationsParams {
  readonly language: SupportedLanguage;
  readonly themeMode: ThemeMode;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly verifiedAqiCategory: CpcbCategory | null;
  readonly observations: readonly NormalizedObservation[];
  readonly loadingAirQuality: boolean;
  readonly setLanguage: (lang: SupportedLanguage) => void;
  readonly handleThemeChange: (mode: ThemeMode) => void;
  readonly setAiExplanation: (val: AiExplanation | null) => void;
  readonly onAccountDeletedCloseAuth: () => void;
}

export function useHouseholdAndRecommendations(params: UseHouseholdAndRecommendationsParams) {
  const {
    language,
    themeMode,
    calculatedAqi,
    verifiedAqiCategory,
    observations,
    loadingAirQuality,
    setLanguage,
    handleThemeChange,
    setAiExplanation,
    onAccountDeletedCloseAuth
  } = params;

  const [householdContext, setHouseholdContext] = useState<HouseholdContext | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<RecommendationAction[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [indoorHazardAssessment, setIndoorHazardAssessment] = useState<IndoorHazardAssessment | null>(null);
  const [ventilationGuidance, setVentilationGuidance] = useState<VentilationWindowDecision | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  // Verify Authenticated Session & Load Profile on Boot
  useEffect(() => {
    fetch("/api/v1/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const profile = json?.data?.profile || (json?.data?.uid ? json.data : null);
        if (json?.status === "SUCCESS" && profile) {
          setIsAuthenticated(true);
          setUserEmail(profile.email);
          if (profile.householdContext) {
            setHouseholdContext(profile.householdContext);
          }
          if (profile.preferences?.language) {
            setLanguage(profile.preferences.language);
          }
          if (profile.preferences?.theme) {
            handleThemeChange(profile.preferences.theme);
          }
        }
      })
      .catch(() => {
        // Guest mode remains cleanly active
      });
  }, [handleThemeChange, setLanguage]);

  // Evaluate Recommendations & Indoor Ventilation safely without false MODERATE fallback
  const evaluateRecommendations = useCallback(async () => {
    try {
      const evidenceList = compactObservationsForRequest(observations).map((o) => ({
        evidenceId: o.id,
        source: o.providerId,
        pollutant: o.pollutant,
        value: o.value,
        unit: o.unit || "unverified",
        timestamp: o.observationTime,
        description: `${o.stationName}: ${o.pollutant} ${o.value} ${o.unit || ""} (${o.averagingPeriod})`
      }));

      const res = await fetch("/api/v1/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallAqi: calculatedAqi?.overallAqi ?? null,
          aqiCategory: verifiedAqiCategory,
          prominentPollutant: calculatedAqi?.prominentPollutant || null,
          language,
          householdContext,
          evidenceList
        })
      });

      const json = await res.json();
      if (res.ok && json.status === "SUCCESS" && json.data) {
        setRecommendations(
          json.data.deterministicRecommendations || json.data.recommendations || []
        );
        setAiExplanation(json.data.aiExplanation || null);
        setIsAiGenerated(Boolean(json.data.isAiGenerated));
        setIndoorHazardAssessment(
          json.data.indoorAirCoach?.hazardAssessment || json.data.indoorHazardAssessment || null
        );
        setVentilationGuidance(
          json.data.indoorAirCoach?.ventilation || json.data.ventilationGuidance || null
        );
      }
    } catch {
      // Fail safely preserving deterministic UI
    }
  }, [calculatedAqi, verifiedAqiCategory, language, householdContext, observations, setAiExplanation]);

  useEffect(() => {
    if (!loadingAirQuality) {
      void evaluateRecommendations();
    }
  }, [loadingAirQuality, evaluateRecommendations]);

  const handleAuthSuccess = (email?: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleSignOut = async () => {
    await fetch("/api/v1/auth/session", { method: "DELETE" });
    const { clientSignOut } = await import("@/lib/firebase/client");
    await clientSignOut();
    setIsAuthenticated(false);
    setUserEmail(undefined);
  };

  const handleExportData = async () => {
    const res = await fetch("/api/v1/profile?export=json");
    if (res.ok) {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hawasaathi-profile-export-${Date.now()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL?.(url), 1000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to permanently delete your cloud profile? This cannot be undone.")) {
      return;
    }
    const res = await fetch("/api/v1/profile", { method: "DELETE" });
    if (res.ok) {
      setIsAuthenticated(false);
      setUserEmail(undefined);
      setHouseholdContext(undefined);
      onAccountDeletedCloseAuth();
    }
  };

  const handleSaveHousehold = async (data: {
    householdContext: HouseholdContext;
    cloudConsent: boolean;
  }) => {
    setHouseholdContext(data.householdContext);
    saveGuestContext({ householdContext: data.householdContext as unknown as Record<string, unknown> });

    if (isAuthenticated && data.cloudConsent) {
      await fetch("/api/v1/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdContext: data.householdContext,
          preferences: {
            language,
            theme: themeMode
          },
          cloudPersistenceConsent: true
        })
      });
    }
  };

  return {
    householdContext,
    setHouseholdContext,
    recommendations,
    isAiGenerated,
    indoorHazardAssessment,
    ventilationGuidance,
    isAuthenticated,
    userEmail,
    handleAuthSuccess,
    handleSignOut,
    handleExportData,
    handleDeleteAccount,
    handleSaveHousehold
  };
}
