// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  pickPreferredStation,
  selectAlternativeStation
} from "@/domain/air-quality/station-ranking";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult, CpcbSubIndex } from "@/schemas/cpcb.schema";

export interface SelectedLocationCoords {
  readonly latitude: number;
  readonly longitude: number;
}

export function useAirQualityTelemetry(
  selectedLocation: SelectedLocationCoords,
  onClearExplanation: () => void
) {
  const [isOffline, setIsOffline] = useState(false);
  const [usingCachedSnapshot, setUsingCachedSnapshot] = useState(false);

  const [stations, setStations] = useState<NormalizedStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<NormalizedStation | null>(null);
  const [observations, setObservations] = useState<NormalizedObservation[]>([]);
  const [calculatedAqi, setCalculatedAqi] = useState<CpcbAqiResult | null>(null);
  const [partialSubIndices, setPartialSubIndices] = useState<readonly CpcbSubIndex[]>([]);
  const [aqiStatus, setAqiStatus] = useState<"AVAILABLE" | "AQI_UNAVAILABLE" | "STALE">("AVAILABLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [provider, setProvider] = useState<string>("CPCB_CAAQMS");
  const [forecast, setForecast] = useState<NormalizedForecast[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [retrievedAt, setRetrievedAt] = useState<string | undefined>(undefined);
  const [loadingAirQuality, setLoadingAirQuality] = useState<boolean>(true);
  const [loadingStations, setLoadingStations] = useState<boolean>(false);

  const aqReqSeqRef = useRef<number>(0);
  const locReqSeqRef = useRef<number>(0);
  const aqAbortRef = useRef<AbortController | null>(null);
  const stationsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setIsOffline(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener?.("online", handleOnline);
    window.addEventListener?.("offline", handleOffline);
    return () => {
      window.removeEventListener?.("online", handleOnline);
      window.removeEventListener?.("offline", handleOffline);
    };
  }, []);

  const fetchAirQuality = useCallback(
    async (station: NormalizedStation) => {
      aqAbortRef.current?.abort?.();
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      aqAbortRef.current = controller;
      const reqSeq = ++aqReqSeqRef.current;

      setLoadingAirQuality(true);
      setObservations([]);
      setCalculatedAqi(null);
      setPartialSubIndices([]);
      onClearExplanation();
      setWarnings([]);

      try {
        const res = await fetch(
          `/api/v1/air-quality?stationId=${encodeURIComponent(station.id)}&stationName=${encodeURIComponent(station.name)}`,
          controller ? { signal: controller.signal } : undefined
        );
        if (reqSeq !== aqReqSeqRef.current) return;
        const json = await res.json();
        if (reqSeq !== aqReqSeqRef.current) return;
        if (res.ok && json.status === "SUCCESS" && json.data) {
          setObservations(json.data.observations || []);
          setCalculatedAqi(json.data.calculatedAqi || null);
          setPartialSubIndices(json.data.partialSubIndices || []);
          setAqiStatus(json.data.aqiStatus || "AQI_UNAVAILABLE");
          setStatusMessage(json.data.statusMessage || "");
          setProvider(json.data.provider || station.providerId);
          setRetrievedAt(json.data.retrievedAt || json.retrievedAt || new Date().toISOString());
          setUsingCachedSnapshot(false);
          if (json.warnings?.length) setWarnings(json.warnings);
          try {
            window.localStorage?.setItem?.(
              "hs_last_snapshot_v2",
              JSON.stringify({
                station,
                observations: json.data.observations || [],
                calculatedAqi: json.data.calculatedAqi || null,
                aqiStatus: json.data.aqiStatus || "AQI_UNAVAILABLE",
                statusMessage: json.data.statusMessage || "",
                provider: json.data.provider || station.providerId,
                retrievedAt: json.data.retrievedAt || new Date().toISOString()
              })
            );
          } catch {
            // Ignore quota errors
          }
        } else {
          setAqiStatus("AQI_UNAVAILABLE");
          setStatusMessage(json.message || "Telemetry temporarily unavailable.");
        }
      } catch (err: unknown) {
        if (reqSeq !== aqReqSeqRef.current) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setIsOffline(true);
        setAqiStatus("AQI_UNAVAILABLE");
        setStatusMessage("Network error querying monitoring telemetry.");
        try {
          const cached = window.localStorage?.getItem?.("hs_last_snapshot_v2");
          if (cached) {
            const snap = JSON.parse(cached) as {
              observations?: NormalizedObservation[];
              calculatedAqi?: CpcbAqiResult | null;
              aqiStatus?: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
              statusMessage?: string;
              provider?: string;
              retrievedAt?: string;
            };
            if (snap.observations) setObservations(snap.observations);
            if (snap.calculatedAqi !== undefined) setCalculatedAqi(snap.calculatedAqi);
            if (snap.aqiStatus) setAqiStatus(snap.aqiStatus);
            if (snap.statusMessage) setStatusMessage(snap.statusMessage);
            if (snap.provider) setProvider(snap.provider);
            if (snap.retrievedAt) setRetrievedAt(snap.retrievedAt);
            setUsingCachedSnapshot(true);
          }
        } catch {
          // Ignore malformed snapshot
        }
      } finally {
        if (reqSeq === aqReqSeqRef.current) {
          setLoadingAirQuality(false);
        }
      }
    },
    [onClearExplanation]
  );

  const fetchStationsAndForecast = useCallback(async () => {
    stationsAbortRef.current?.abort?.();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    stationsAbortRef.current = controller;
    const locSeq = ++locReqSeqRef.current;

    setLoadingStations(true);
    setSelectedStation(null);
    setObservations([]);
    setCalculatedAqi(null);
    onClearExplanation();

    try {
      const fetchOpts = controller ? { signal: controller.signal } : undefined;
      const [stationsRes, forecastRes] = await Promise.all([
        fetch(
          `/api/v1/stations/nearby?lat=${selectedLocation.latitude}&lon=${selectedLocation.longitude}&radiusKm=35`,
          fetchOpts
        ),
        fetch(
          `/api/v1/forecast?lat=${selectedLocation.latitude}&lon=${selectedLocation.longitude}`,
          fetchOpts
        )
      ]);
      if (locSeq !== locReqSeqRef.current) return;

      if (stationsRes.ok) {
        const sJson = await stationsRes.json();
        if (locSeq !== locReqSeqRef.current) return;
        const foundStations: NormalizedStation[] = sJson.data?.stations || [];
        setStations(foundStations);
        const preferred = pickPreferredStation(foundStations);
        if (preferred) {
          setSelectedStation(preferred);
          await fetchAirQuality(preferred);
        } else {
          setSelectedStation(null);
          setObservations([]);
          setCalculatedAqi(null);
          setProvider("NONE");
          setAqiStatus("AQI_UNAVAILABLE");
          setStatusMessage("No monitoring stations found within 35 km radius.");
          setLoadingAirQuality(false);
        }
      } else {
        setLoadingAirQuality(false);
      }

      if (forecastRes.ok) {
        const fJson = await forecastRes.json();
        if (locSeq === locReqSeqRef.current) {
          setForecast(fJson.data?.forecast || []);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (locSeq === locReqSeqRef.current) {
        setLoadingAirQuality(false);
      }
    } finally {
      if (locSeq === locReqSeqRef.current) {
        setLoadingStations(false);
      }
    }
  }, [selectedLocation.latitude, selectedLocation.longitude, fetchAirQuality, onClearExplanation]);

  useEffect(() => {
    void fetchStationsAndForecast();
  }, [fetchStationsAndForecast]);

  const handleSelectStation = useCallback(
    (station: NormalizedStation) => {
      setSelectedStation(station);
      void fetchAirQuality(station);
    },
    [fetchAirQuality]
  );

  const alternativeStation = useMemo(
    () => selectAlternativeStation(stations, selectedStation, retrievedAt),
    [stations, selectedStation, retrievedAt]
  );

  return {
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
  };
}
