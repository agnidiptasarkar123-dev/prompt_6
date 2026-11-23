// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/shared/navbar";
import { LocationSearch } from "@/components/dashboard/location-search";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { StationPanel } from "@/components/stations/station-panel";
import { StationMap } from "@/components/maps/station-map";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";
import { AuthModal } from "@/components/auth/auth-modal";
import { HouseholdModal } from "@/components/household/household-modal";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import type { SupportedLanguage } from "@/i18n/translations";
import type { NormalizedStation, NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import type { AiExplanation } from "@/schemas/ai-explanation.schema";
import type { HouseholdContext } from "@/schemas/user-context.schema";
import { getGuestContext, saveGuestContext, clientSignOut } from "@/lib/firebase/client";
import { Users } from "lucide-react";

export default function DashboardPage() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedLocation, setSelectedLocation] = useState({
    name: "Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5726,
    longitude: 88.3639
  });

  const [stations, setStations] = useState<readonly NormalizedStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<NormalizedStation | null>(null);
  const [observations, setObservations] = useState<readonly NormalizedObservation[]>([]);
  const [calculatedAqi, setCalculatedAqi] = useState<CpcbAqiResult | null>(null);
  const [aqiStatus, setAqiStatus] = useState<"AVAILABLE" | "AQI_UNAVAILABLE" | "STALE">("AQI_UNAVAILABLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [provider, setProvider] = useState<string>("CPCB_CAAQMS");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [forecast, setForecast] = useState<readonly NormalizedForecast[]>([]);
  const [recommendations, setRecommendations] = useState<readonly RecommendationAction[]>([]);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  // Household context
  const [householdContext, setHouseholdContext] = useState<HouseholdContext | undefined>(undefined);

  // Load guest context or saved profile on mount
  useEffect(() => {
    const guest = getGuestContext();
    if (guest?.savedLocation) {
      setSelectedLocation(guest.savedLocation);
    }
    if (guest?.language) {
      setLanguage(guest.language);
    }
  }, []);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async (aqi: CpcbAqiResult | null, obs: readonly NormalizedObservation[]) => {
    try {
      const evidenceList = obs.map((o) => ({
        evidenceId: o.id,
        source: o.providerId,
        pollutant: o.pollutant,
        value: o.value,
        unit: o.unit,
        timestamp: o.observationTime,
        description: `Measured at ${o.stationName}`
      }));

      const res = await fetch("/api/v1/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallAqi: aqi?.overallAqi ?? null,
          aqiCategory: aqi?.category ?? "MODERATE",
          prominentPollutant: aqi?.prominentPollutant ?? null,
          householdContext,
          routine: householdContext?.routine,
          indoorSetup: {
            kitchenVentilation: "OPEN_WINDOW_ONLY",
            activeCombustion: false,
            airPurifierAvailable: true,
            roomVolumeM3: 56,
            cadrM3H: 250
          },
          evidenceList,
          language
        })
      });

      const json = await res.json();
      if (json.status === "SUCCESS" && json.data) {
        setRecommendations(json.data.deterministicRecommendations || []);
        setAiExplanation(json.data.aiExplanation || null);
        setIsAiGenerated(json.data.isAiGenerated || false);
      }
    } catch {
      // ignore
    }
  }, [householdContext, language]);

  // Fetch air quality for a station
  const fetchAirQuality = useCallback(async (stationId: string, _stationMeta?: NormalizedStation) => {
    try {
      const res = await fetch(`/api/v1/air-quality?stationId=${encodeURIComponent(stationId)}`);
      const json = await res.json();
      if (json.status === "SUCCESS" && json.data) {
        const d = json.data;
        setObservations(d.observations || []);
        setCalculatedAqi(d.calculatedAqi);
        setAqiStatus(d.aqiStatus);
        setStatusMessage(d.statusMessage);
        setProvider(d.provider);
        setLastUpdated(d.retrievedAt);

        // Fetch Recommendations based on AQI result
        fetchRecommendations(d.calculatedAqi, d.observations);
      }
    } catch {
      // ignore
    }
  }, [fetchRecommendations]);

  // Fetch stations for selected location
  const fetchStations = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/v1/stations/nearby?lat=${lat}&lon=${lon}&radiusKm=60`);
      const json = await res.json();
      if (json.status === "SUCCESS" && json.data?.stations) {
        setStations(json.data.stations);
        if (json.data.stations.length > 0) {
          const first = json.data.stations[0];
          if (first) {
            setSelectedStation(first);
            fetchAirQuality(first.id, first);
          }
        } else {
          setSelectedStation(null);
          setObservations([]);
          setCalculatedAqi(null);
          setAqiStatus("AQI_UNAVAILABLE");
          setStatusMessage("No ground monitoring stations available within 60 km radius.");
        }
      }
    } catch {
      // ignore
    }
  }, [fetchAirQuality]);

  // Fetch forecast for coordinates
  const fetchForecast = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/v1/forecast?lat=${lat}&lon=${lon}&horizonDays=3`);
      const json = await res.json();
      if (json.status === "SUCCESS" && json.data?.forecast) {
        setForecast(json.data.forecast);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStations(selectedLocation.latitude, selectedLocation.longitude);
    fetchForecast(selectedLocation.latitude, selectedLocation.longitude);
  }, [selectedLocation, fetchStations, fetchForecast]);

  const handleSelectLocation = (loc: {
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  }) => {
    setSelectedLocation(loc);
    saveGuestContext({
      savedLocation: loc,
      language
    });
  };

  const handleSignOut = async () => {
    await fetch("/api/v1/auth/session", { method: "DELETE" });
    await clientSignOut();
    setIsAuthenticated(false);
    setUserEmail(undefined);
  };

  const handleExportData = async () => {
    const res = await fetch("/api/v1/profile");
    if (res.ok) {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hawasaathi_profile_${Date.now()}.json`;
      a.click();
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to permanently delete your account and all household data?")) {
      const res = await fetch("/api/v1/profile", { method: "DELETE" });
      if (res.ok) {
        await handleSignOut();
        setIsAuthOpen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          saveGuestContext({ language: lang, savedLocation: selectedLocation });
        }}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Controls: Location Search & Household Trigger */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <LocationSearch
            language={language}
            selectedCity={selectedLocation.city}
            onSelectLocation={handleSelectLocation}
          />

          <button
            type="button"
            onClick={() => setIsHouseholdOpen(true)}
            className="inline-flex items-center space-x-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 md:self-auto"
          >
            <Users className="h-4 w-4 text-teal-400" />
            <span>Customize Household Profile</span>
          </button>
        </div>

        {/* Current Air Quality Summary */}
        <div className="mt-8">
          <AqiSummaryCard
            language={language}
            station={selectedStation}
            calculatedAqi={calculatedAqi}
            aqiStatus={aqiStatus}
            statusMessage={statusMessage}
            provider={provider}
            lastUpdated={lastUpdated}
            onOpenProvenance={() => setIsProvenanceOpen(true)}
          />
        </div>

        {/* Monitored Pollutants Grid */}
        <PollutantGrid
          language={language}
          observations={observations}
          calculatedAqi={calculatedAqi}
        />

        {/* Stations & Interactive Map Split */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StationPanel
            language={language}
            stations={stations}
            selectedStationId={selectedStation?.id || null}
            onSelectStation={(st) => {
              setSelectedStation(st);
              fetchAirQuality(st.id, st);
            }}
            onOpenProvenance={() => setIsProvenanceOpen(true)}
          />

          <StationMap
            center={selectedLocation}
            stations={stations}
            selectedStationId={selectedStation?.id || null}
            onSelectStation={(st) => {
              setSelectedStation(st);
              fetchAirQuality(st.id, st);
            }}
          />
        </div>

        {/* Atmospheric Forecast Chart */}
        <ForecastChart
          language={language}
          forecast={forecast}
        />

        {/* Recommendations & Indoor Air Quality Coach */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecommendationsPanel
            language={language}
            recommendations={recommendations}
            aiExplanation={aiExplanation}
            isAiGenerated={isAiGenerated}
          />

          <IndoorCoachPanel
            language={language}
            aqiCategory={calculatedAqi?.category || "MODERATE"}
            hazardAssessment={null}
            ventilationGuidance={null}
          />
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
        onAuthSuccess={(email) => {
          setIsAuthenticated(true);
          setUserEmail(email);
        }}
      />

      <HouseholdModal
        isOpen={isHouseholdOpen}
        onClose={() => setIsHouseholdOpen(false)}
        language={language}
        initialContext={householdContext}
        onSave={({ householdContext: ctx, cloudConsent }) => {
          setHouseholdContext(ctx);
          if (isAuthenticated && cloudConsent) {
            fetch("/api/v1/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                householdContext: ctx,
                routine: ctx.routine,
                cloudPersistenceConsent: true
              })
            });
          }
        }}
      />

      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        station={selectedStation}
        calculatedAqi={calculatedAqi}
        observations={observations}
        provider={provider}
      />
    </div>
  );
}
