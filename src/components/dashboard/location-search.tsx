// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Loader2 } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { IndianCityLocation } from "@/services/location/location-service";

export interface LocationSearchProps {
  readonly language: SupportedLanguage;
  readonly selectedCity?: string;
  readonly onSelectLocation: (loc: { name: string; latitude: number; longitude: number; city: string; state: string }) => void;
  readonly initialLoading?: boolean;
  readonly initialGeoLoading?: boolean;
  readonly initialGeoError?: string | null;
  readonly initialResults?: readonly IndianCityLocation[];
  readonly initialIsOpen?: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  language,
  selectedCity: _selectedCity,
  onSelectLocation,
  initialLoading,
  initialGeoLoading,
  initialGeoError,
  initialResults,
  initialIsOpen
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly IndianCityLocation[]>(initialResults ?? []);
  const [isLoading, setIsLoading] = useState(initialLoading ?? false);
  const [isOpen, setIsOpen] = useState(initialIsOpen ?? false);
  const [geoLoading, setGeoLoading] = useState(initialGeoLoading ?? false);
  const [geoError, setGeoError] = useState<string | null>(initialGeoError ?? null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/locations/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.status === "SUCCESS" && json.data?.locations) {
          setResults(json.data.locations);
          setIsOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        onSelectLocation({
          name: "Current Location",
          city: "Local",
          state: "Current Coordinates",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(`Location access denied or unavailable: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--hs-accent)]" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4 text-[var(--hs-text-secondary)]" aria-hidden="true" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--hs-text-primary)] placeholder-[var(--hs-text-secondary)] shadow-xs focus:border-[var(--hs-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hs-focus-ring)]"
            aria-label="Search city or location"
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="inline-flex shrink-0 items-center justify-center space-x-1.5 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--hs-text-primary)] transition hover:border-[var(--hs-accent)] shadow-xs disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--hs-accent)]" aria-hidden="true" />
          ) : (
            <Navigation className="h-4 w-4 text-[var(--hs-accent)]" aria-hidden="true" />
          )}
          <span>{t.useLocation}</span>
        </button>
      </div>

      {geoError && (
        <p className="mt-1 text-xs text-[var(--hs-accent-coral)]" role="alert">
          {geoError}
        </p>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] shadow-xl">
          {results.map((loc) => (
            <li key={loc.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectLocation({
                    name: loc.name,
                    city: loc.name,
                    state: loc.state,
                    latitude: loc.latitude,
                    longitude: loc.longitude
                  });
                  setQuery("");
                  setIsOpen(false);
                }}
                className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm text-[var(--hs-text-primary)] transition hover:bg-[var(--hs-subtle-bg)]"
              >
                <MapPin className="h-4 w-4 text-[var(--hs-accent)] shrink-0" aria-hidden="true" />
                <span className="font-medium">{loc.name}</span>
                <span className="text-xs text-[var(--hs-text-secondary)]">({loc.state})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
