// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AppShellNav, type AppRouteView } from "@/components/shared/app-shell-nav";
import { CommandPalette } from "@/components/shared/command-palette";
import { OnboardingModal } from "@/components/shared/onboarding-modal";
import { LocationSearch } from "@/components/dashboard/location-search";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { StationPanel } from "@/components/stations/station-panel";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";
import { AuthModal } from "@/components/auth/auth-modal";
import { HouseholdModal } from "@/components/household/household-modal";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import { NotificationCenter } from "@/components/alerts/notification-center";
import { AlertPreferencesModal } from "@/components/alerts/alert-preferences-modal";
import { AlertCenterView } from "@/components/alerts/alert-center-view";
import {
  StationMap,
  StationComparison,
  DailyPlanner,
  AgentWorkspace,
  AiChatWorkspace,
  InsightsWorkspace,
  LearningCentre,
  SettingsWorkspace
} from "@/components/shared/lazy-workspaces";

import { useAirQualityTelemetry } from "@/hooks/use-air-quality-telemetry";
import { usePlannerAndAlerts } from "@/hooks/use-planner-and-alerts";
import {
  getGuestContext,
  saveGuestContext,
  clientSignOut
} from "@/lib/firebase/client";
import { getTextDirection, type SupportedLanguage } from "@/i18n/translations";
import { resolveLocale } from "@/i18n/locale-registry";
import { getV2UiStrings } from "@/i18n/v2-translations";
import {
  getStoredThemeMode,
  resolveThemeValue
} from "@/theme/theme-provider";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/theme/tokens";
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";
import type { HouseholdContext } from "@/schemas/user-context.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import type { AiExplanation } from "@/schemas/ai-explanation.schema";
import type { IndoorHazardAssessment } from "@/domain/indoor/source-control";
import type { VentilationWindowDecision } from "@/domain/indoor/ventilation-decision";

interface SelectedLocationState {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_LOCATION: SelectedLocationState = {
  name: "Kolkata",
  city: "Kolkata",
  state: "West Bengal",
  latitude: 22.5726,
  longitude: 88.3639
};

function syncDocumentTheme(mode: ThemeMode): void {
  const resolved = resolveThemeValue(mode);
  if (typeof document !== "undefined" && document.documentElement?.setAttribute) {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.classList?.remove?.("light", "dark", "high-contrast");
    document.documentElement.classList?.add?.(resolved);
  }
}

export default function DashboardPage() {
  // Navigation & App Shell State
  const [activeView, setActiveView] = useState<AppRouteView>("overview");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Appearance & Localization State
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationState>(DEFAULT_LOCATION);

  // Personalization, Recommendations & Indoor Coach State
  const [householdContext, setHouseholdContext] = useState<HouseholdContext | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<RecommendationAction[]>([]);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [indoorHazardAssessment, setIndoorHazardAssessment] = useState<IndoorHazardAssessment | null>(null);
  const [ventilationGuidance, setVentilationGuidance] = useState<VentilationWindowDecision | null>(null);

  // Auth & Modals State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState<boolean>(false);
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isAlertPreferencesOpen, setIsAlertPreferencesOpen] = useState<boolean>(false);
  const lastFocusRef = useRef<{ focus?: () => void } | null>(null);

  const clearAiExplanation = useCallback(() => {
    setAiExplanation(null);
  }, []);

  const telemetry = useAirQualityTelemetry(selectedLocation, clearAiExplanation);
  const {
    isOffline,
    usingCachedSnapshot,
    stations,
    selectedStation,
    observations,
    calculatedAqi,
    partialSubIndices,
    aqiStatus,
    statusMessage,
    provider,
    forecast,
    warnings,
    retrievedAt,
    loadingAirQuality,
    loadingStations,
    alternativeStation,
    fetchStationsAndForecast,
    handleSelectStation
  } = telemetry;

  const {
    plannerActivities,
    savedPlaces,
    diaryEntries,
    alerts,
    setAlerts,
    alertPreferences,
    unreadCount,
    handleUpdateActivities,
    handleUpdateSavedPlaces,
    handleUpdateDiary,
    savePreferences
  } = usePlannerAndAlerts({
    loadingAirQuality,
    selectedStation,
    calculatedAqi,
    aqiStatus,
    observations,
    forecast
  });

  // Strict Cross-Component AQI Category Invariant:
  // NEVER fall back to "MODERATE" when overall composite AQI is null or unavailable.
  const verifiedAqiCategory =
    calculatedAqi && calculatedAqi.overallAqi !== null ? calculatedAqi.category : null;

  const { strings: v2 } = getV2UiStrings(language);
  const textDirection = getTextDirection(language);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      window.localStorage?.setItem?.(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures
    }
    syncDocumentTheme(mode);
  }, []);

  const captureFocusBeforeModal = () => {
    lastFocusRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as { focus?: () => void } | null)
        : null;
  };

  const closeModalAndRestoreFocus = (setter: (open: boolean) => void) => {
    setter(false);
    lastFocusRef.current?.focus?.();
  };

  // Hydrate client preferences & global shortcut listener
  useEffect(() => {
    const storedTheme = getStoredThemeMode();
    setThemeMode(storedTheme);
    syncDocumentTheme(storedTheme);

    const ctx = getGuestContext();
    if (ctx?.savedLocation) {
      setSelectedLocation(ctx.savedLocation);
    }
    if (ctx?.language) {
      setLanguage(ctx.language);
    }
    if (ctx?.householdContext) {
      setHouseholdContext(ctx.householdContext as unknown as HouseholdContext);
    }

    try {
      const seenOnboarding = window.localStorage?.getItem?.("hs_onboarding_seen");
      if (!seenOnboarding) {
        setIsOnboardingOpen(true);
      }
    } catch {
      // Ignore storage errors safely
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
        return;
      }
      if (e.key === "Escape") {
        setIsAuthModalOpen(false);
        setIsHouseholdModalOpen(false);
        setIsProvenanceModalOpen(false);
        setIsNotificationCenterOpen(false);
        setIsAlertPreferencesOpen(false);
        setIsCommandPaletteOpen(false);
        lastFocusRef.current?.focus?.();
      }
    };
    window.addEventListener?.("keydown", handleKeyDown);
    return () => {
      window.removeEventListener?.("keydown", handleKeyDown);
    };
  }, []);

  // Synchronize HTML lang and RTL/LTR direction whenever language changes
  useEffect(() => {
    const canonical = resolveLocale(language);
    const dir = getTextDirection(language);
    if (typeof document !== "undefined" && document.documentElement?.setAttribute) {
      document.documentElement.setAttribute("lang", canonical);
      document.documentElement.setAttribute("dir", dir);
    }
  }, [language]);

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
  }, [handleThemeChange]);

  // Evaluate Recommendations & Indoor Ventilation safely without false MODERATE fallback
  const evaluateRecommendations = useCallback(async () => {
    try {
      const evidenceList = observations.map((o) => ({
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
  }, [calculatedAqi, verifiedAqiCategory, language, householdContext, observations]);

  useEffect(() => {
    if (!loadingAirQuality) {
      void evaluateRecommendations();
    }
  }, [loadingAirQuality, evaluateRecommendations]);

  // Location & Language Handlers
  const handleSelectLocation = (loc: SelectedLocationState) => {
    setSelectedLocation(loc);
    saveGuestContext({ savedLocation: loc });
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    saveGuestContext({ language: lang });
  };

  const handleSwitchStation = (station: NormalizedStation) => {
    handleSelectStation(station);
    setActiveView("overview");
  };

  // Auth Handlers
  const handleAuthSuccess = (email?: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleSignOut = async () => {
    await fetch("/api/v1/auth/session", { method: "DELETE" });
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
      setIsAuthModalOpen(false);
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

  const handleDismissOnboarding = () => {
    closeModalAndRestoreFocus(setIsOnboardingOpen);
    try {
      window.localStorage?.setItem?.("hs_onboarding_seen", "true");
    } catch {
      // Ignore
    }
  };

  const handleLocateUser = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSelectLocation({
            name: "Current Location",
            city: "Local",
            state: "GPS Coordinates",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {
          // Permission denied or unavailable; preserve selected location cleanly
        },
        { timeout: 8000 }
      );
    }
  }, []);

  const liveAnnouncement = loadingAirQuality
    ? selectedStation
      ? `Loading air quality telemetry for ${selectedStation.name}.`
      : "Loading nearby air quality stations."
    : selectedStation
      ? calculatedAqi && calculatedAqi.overallAqi !== null
        ? `${selectedStation.name}: CPCB AQI ${calculatedAqi.overallAqi}, ${calculatedAqi.category}.`
        : `${selectedStation.name}: overall CPCB AQI unavailable; raw pollutant data shown.`
      : statusMessage;

  return (
    <>
      <div
        dir={textDirection}
        className="min-h-screen flex flex-col bg-[var(--hs-page-bg)] text-[var(--hs-text-primary)] pb-16 lg:pb-0 lg:pl-60 rtl:lg:pl-0 rtl:lg:pr-60"
      >
        <Navbar
          language={language}
          onLanguageChange={handleLanguageChange}
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          onOpenAuthModal={() => {
            captureFocusBeforeModal();
            setIsAuthModalOpen(true);
          }}
          onSignOut={handleSignOut}
          unreadAlertsCount={unreadCount}
          onOpenNotifications={() => {
            captureFocusBeforeModal();
            setIsNotificationCenterOpen(true);
          }}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          onOpenCommandPalette={() => {
            captureFocusBeforeModal();
            setIsCommandPaletteOpen(true);
          }}
          onOpenHelp={() => {
            captureFocusBeforeModal();
            setIsOnboardingOpen(true);
          }}
        />

        <main id="main-content" className="mx-auto flex-1 w-full max-w-6xl px-3 py-6 sm:px-6 space-y-6">
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {liveAnnouncement}
          </div>

          {/* Child [0]: Top Location & Routine Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <LocationSearch
              language={language}
              selectedCity={selectedLocation.city}
              onSelectLocation={handleSelectLocation}
            />
            <button
              type="button"
              onClick={() => {
                captureFocusBeforeModal();
                setIsHouseholdModalOpen(true);
              }}
              className="shrink-0 min-h-[40px] rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-4 py-2 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)] transition"
            >
              Household Profile &amp; Sensitivities
            </button>
          </div>

          {/* Child [1]: Primary Air Quality Summary */}
          <section aria-label="Primary Air Quality Summary">
            {activeView === "overview" ? (
              <AqiSummaryCard
                language={language}
                searchLocation={selectedLocation}
                station={selectedStation}
                calculatedAqi={calculatedAqi}
                partialSubIndices={partialSubIndices}
                aqiStatus={aqiStatus}
                statusMessage={statusMessage}
                provider={provider}
                retrievalTime={retrievedAt}
                searchRadiusKm={35}
                discoveredStationsCount={stations.length}
                forecastPointsCount={forecast.length}
                isLoading={loadingAirQuality}
                onOpenProvenance={() => {
                  captureFocusBeforeModal();
                  setIsProvenanceModalOpen(true);
                }}
                observations={observations}
                alternativeStation={alternativeStation}
                onSelectStation={handleSelectStation}
                onExploreStations={() => setActiveView("stations")}
              />
            ) : null}
          </section>

          {/* Child [2]: Offline/Warnings + Primary Workspace Views */}
          <div className="space-y-6">
            {(isOffline || usingCachedSnapshot) && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-300"
              >
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>{v2.offlineNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchStationsAndForecast()}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-amber-500/40 bg-[var(--hs-surface-bg)] px-2.5 py-1 font-semibold text-[var(--hs-text-primary)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Telemetry</span>
                </button>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  {warnings.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </div>
              </div>
            )}

            {activeView === "overview" && (
              <div className="space-y-6">
                <PollutantGrid
                  language={language}
                  observations={observations}
                  calculatedAqi={calculatedAqi}
                  partialSubIndices={partialSubIndices}
                  providerUnavailable={provider === "NONE" && !loadingStations}
                  stationSelected={selectedStation !== null}
                />

                <RecommendationsPanel
                  language={language}
                  recommendations={recommendations}
                  aiExplanation={aiExplanation}
                  isAiGenerated={isAiGenerated}
                  isAqiUnavailable={verifiedAqiCategory === null}
                />

                <IndoorCoachPanel
                  language={language}
                  aqiCategory={verifiedAqiCategory}
                  hazardAssessment={indoorHazardAssessment}
                  ventilationGuidance={ventilationGuidance}
                />

                <ForecastChart forecast={forecast} language={language} />
              </div>
            )}

            {activeView === "map" && (
              <div className="space-y-6">
                <StationMap
                  center={selectedLocation}
                  stations={stations}
                  selectedStationId={selectedStation?.id || null}
                  onSelectStation={handleSelectStation}
                  language={language}
                  currentObservations={observations}
                  currentAqiValue={calculatedAqi?.overallAqi ?? null}
                  isLoading={loadingStations}
                  onLocateUser={handleLocateUser}
                  onOpenStationDetails={() => setActiveView("stations")}
                />
                <StationPanel
                  language={language}
                  stations={stations}
                  selectedStationId={selectedStation?.id || null}
                  onSelectStation={handleSelectStation}
                  onOpenProvenance={() => setIsProvenanceModalOpen(true)}
                />
              </div>
            )}

            {activeView === "stations" && (
              <div className="space-y-6">
                <StationComparison
                  stations={stations}
                  selectedStationId={selectedStation?.id || null}
                  onSelectStation={handleSwitchStation}
                  language={language}
                />
                <StationPanel
                  language={language}
                  stations={stations}
                  selectedStationId={selectedStation?.id || null}
                  onSelectStation={handleSelectStation}
                  onOpenProvenance={() => setIsProvenanceModalOpen(true)}
                />
              </div>
            )}

            {activeView === "planner" && (
              <DailyPlanner
                language={language}
                stations={stations}
                selectedStation={selectedStation}
                calculatedAqi={calculatedAqi}
                observations={observations}
                forecast={forecast}
                activities={plannerActivities}
                onUpdateActivities={handleUpdateActivities}
                diaryEntries={diaryEntries}
                onUpdateDiary={handleUpdateDiary}
              />
            )}

            {activeView === "agent" && (
              <AgentWorkspace
                language={language}
                selectedStation={selectedStation}
                calculatedAqi={calculatedAqi}
                observations={observations}
                forecast={forecast}
              />
            )}

            {activeView === "chat" && (
              <AiChatWorkspace
                language={language}
                selectedStation={selectedStation}
                calculatedAqi={calculatedAqi}
                observations={observations}
                forecast={forecast}
              />
            )}

            {activeView === "insights" && (
              <InsightsWorkspace
                language={language}
                stations={stations}
                selectedStation={selectedStation}
                observations={observations}
                forecast={forecast}
              />
            )}

            {activeView === "alerts" && (
              <AlertCenterView
                alerts={alerts}
                unreadCount={unreadCount}
                alertPreferences={alertPreferences}
                onConfigureRules={() => {
                  captureFocusBeforeModal();
                  setIsAlertPreferencesOpen(true);
                }}
                onOpenDrawer={() => {
                  captureFocusBeforeModal();
                  setIsNotificationCenterOpen(true);
                }}
              />
            )}

            {activeView === "indoor" && (
              <IndoorCoachPanel
                language={language}
                aqiCategory={verifiedAqiCategory}
                hazardAssessment={indoorHazardAssessment}
                ventilationGuidance={ventilationGuidance}
              />
            )}

            {activeView === "learn" && <LearningCentre language={language} />}

            {activeView === "settings" && (
              <SettingsWorkspace
                language={language}
                onLanguageChange={handleLanguageChange}
                themeMode={themeMode}
                onThemeChange={handleThemeChange}
                savedPlaces={savedPlaces}
                onUpdateSavedPlaces={handleUpdateSavedPlaces}
                onSelectSavedPlace={(pl) => {
                  handleSelectLocation({
                    name: pl.city,
                    city: pl.city,
                    state: pl.state,
                    latitude: pl.latitude,
                    longitude: pl.longitude
                  });
                  setActiveView("overview");
                }}
                currentLocation={selectedLocation}
                onOpenHouseholdModal={() => setIsHouseholdModalOpen(true)}
                onOpenAlertPreferences={() => setIsAlertPreferencesOpen(true)}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>

          {/* Child [3]: Stations Panel & Interactive Map Pair in Overview */}
          {activeView === "overview" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <StationPanel
                language={language}
                stations={stations}
                selectedStationId={selectedStation?.id || null}
                onSelectStation={handleSelectStation}
                onOpenProvenance={() => setIsProvenanceModalOpen(true)}
              />
              <StationMap
                center={selectedLocation}
                stations={stations}
                selectedStationId={selectedStation?.id || null}
                onSelectStation={handleSelectStation}
                language={language}
                currentObservations={observations}
                currentAqiValue={calculatedAqi?.overallAqi ?? null}
                isLoading={loadingStations}
                onLocateUser={handleLocateUser}
                onOpenStationDetails={() => setActiveView("stations")}
              />
            </div>
          ) : null}
        </main>

        {/* Unified 11-View Application Shell Navigation */}
        <AppShellNav
          activeView={activeView}
          onSelectView={setActiveView}
          language={language}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          unreadAlertsCount={unreadCount}
          locationLabel={selectedLocation.name}
        />
      </div>

      <Footer language={language} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => closeModalAndRestoreFocus(setIsAuthModalOpen)}
        language={language}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
        onAuthSuccess={handleAuthSuccess}
      />

      <HouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => closeModalAndRestoreFocus(setIsHouseholdModalOpen)}
        language={language}
        initialContext={householdContext}
        onSave={handleSaveHousehold}
      />

      <ProvenanceModal
        isOpen={isProvenanceModalOpen}
        onClose={() => closeModalAndRestoreFocus(setIsProvenanceModalOpen)}
        station={selectedStation}
        calculatedAqi={calculatedAqi}
        observations={observations}
        provider={provider}
      />

      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => closeModalAndRestoreFocus(setIsNotificationCenterOpen)}
        language={language}
        alerts={alerts}
        onMarkAllAsRead={() => setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))}
        onDismissAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAllAlerts={() => setAlerts([])}
        onOpenPreferences={() => {
          setIsNotificationCenterOpen(false);
          setIsAlertPreferencesOpen(true);
        }}
      />

      <AlertPreferencesModal
        isOpen={isAlertPreferencesOpen}
        onClose={() => closeModalAndRestoreFocus(setIsAlertPreferencesOpen)}
        language={language}
        initialPreferences={alertPreferences}
        onSavePreferences={savePreferences}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => closeModalAndRestoreFocus(setIsCommandPaletteOpen)}
        onSelectView={setActiveView}
        onThemeChange={handleThemeChange}
        language={language}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleDismissOnboarding}
        language={language}
        onNavigate={(v) => setActiveView(v)}
      />
    </>
  );
}
