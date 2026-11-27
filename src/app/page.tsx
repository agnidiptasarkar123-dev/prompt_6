// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  SettingsWorkspace,
  LazyAuthModal as AuthModal
} from "@/components/shared/lazy-workspaces";

import { useAirQualityTelemetry } from "@/hooks/use-air-quality-telemetry";
import { usePlannerAndAlerts } from "@/hooks/use-planner-and-alerts";
import { useHouseholdAndRecommendations } from "@/hooks/use-household-and-recommendations";
import { useModalOrchestration } from "@/hooks/use-modal-orchestration";
import { getGuestContext, saveGuestContext } from "@/lib/firebase/guest-context";
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
import type { AiExplanation } from "@/schemas/ai-explanation.schema";

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
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationState>(DEFAULT_LOCATION);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);

  const modals = useModalOrchestration();

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

  const {
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
  } = useHouseholdAndRecommendations({
    language,
    themeMode,
    calculatedAqi,
    verifiedAqiCategory,
    observations,
    loadingAirQuality,
    setLanguage,
    handleThemeChange,
    setAiExplanation,
    onAccountDeletedCloseAuth: modals.closeAuthModalOnDelete
  });

  // Hydrate client theme & guest preferences
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
  }, [setHouseholdContext]);

  // Synchronize HTML lang and RTL/LTR direction whenever language changes
  useEffect(() => {
    const canonical = resolveLocale(language);
    const dir = getTextDirection(language);
    if (typeof document !== "undefined" && document.documentElement?.setAttribute) {
      document.documentElement.setAttribute("lang", canonical);
      document.documentElement.setAttribute("dir", dir);
    }
  }, [language]);

  // Reset viewport scroll cleanly when switching workspace views so sticky navbar never occludes top headings
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [activeView]);

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
          onOpenAuthModal={modals.openAuthModal}
          onSignOut={handleSignOut}
          unreadAlertsCount={unreadCount}
          onOpenNotifications={modals.openNotificationCenter}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          onToggleMobileNav={modals.toggleMobileNav}
          onOpenCommandPalette={modals.openCommandPalette}
          onOpenHelp={modals.openOnboarding}
        />

        <main id="main-content" tabIndex={-1} className="mx-auto flex-1 w-full max-w-6xl px-3 py-6 sm:px-6 space-y-6 focus:outline-none">
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
              onClick={modals.openHouseholdModal}
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
                onOpenProvenance={modals.openProvenanceModal}
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] px-4 py-3 text-xs text-[var(--hs-accent-amber)]"
              >
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>{v2.offlineNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchStationsAndForecast()}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[var(--hs-warm-border)] bg-[var(--hs-surface-bg)] px-2.5 py-1 font-semibold text-[var(--hs-text-primary)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry Telemetry</span>
                </button>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-3 text-xs text-[var(--hs-accent-amber)] flex items-start gap-2">
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
                  onOpenProvenance={modals.openProvenanceModal}
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
                  onOpenProvenance={modals.openProvenanceModal}
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
                stations={stations}
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
                onConfigureRules={modals.openAlertPreferences}
                onOpenDrawer={modals.openNotificationCenter}
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
                onOpenHouseholdModal={modals.openHouseholdModal}
                onOpenAlertPreferences={modals.openAlertPreferences}
                onOpenAuthModal={modals.openAuthModal}
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
                onOpenProvenance={modals.openProvenanceModal}
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
          isMobileOpen={modals.isMobileNavOpen}
          onCloseMobile={modals.closeMobileNav}
          unreadAlertsCount={unreadCount}
          locationLabel={selectedLocation.name}
        />
      </div>

      <Footer language={language} />

      <AuthModal
        isOpen={modals.isAuthModalOpen}
        onClose={modals.closeAuthModal}
        language={language}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
        onAuthSuccess={handleAuthSuccess}
      />

      <HouseholdModal
        isOpen={modals.isHouseholdModalOpen}
        onClose={modals.closeHouseholdModal}
        language={language}
        initialContext={householdContext}
        onSave={handleSaveHousehold}
      />

      <ProvenanceModal
        isOpen={modals.isProvenanceModalOpen}
        onClose={modals.closeProvenanceModal}
        station={selectedStation}
        calculatedAqi={calculatedAqi}
        observations={observations}
        provider={provider}
      />

      <NotificationCenter
        isOpen={modals.isNotificationCenterOpen}
        onClose={modals.closeNotificationCenter}
        language={language}
        alerts={alerts}
        onMarkAllAsRead={() => setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))}
        onDismissAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAllAlerts={() => setAlerts([])}
        onOpenPreferences={modals.openAlertPreferencesFromDrawer}
      />

      <AlertPreferencesModal
        isOpen={modals.isAlertPreferencesOpen}
        onClose={modals.closeAlertPreferences}
        language={language}
        initialPreferences={alertPreferences}
        onSavePreferences={savePreferences}
      />

      <CommandPalette
        isOpen={modals.isCommandPaletteOpen}
        onClose={modals.closeCommandPalette}
        onSelectView={setActiveView}
        onThemeChange={handleThemeChange}
        language={language}
      />

      <OnboardingModal
        isOpen={modals.isOnboardingOpen}
        onClose={modals.dismissOnboarding}
        language={language}
        onNavigate={(v) => setActiveView(v)}
      />
    </>
  );
}
