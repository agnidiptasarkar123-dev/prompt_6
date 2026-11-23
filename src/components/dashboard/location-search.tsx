// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, Loader2 } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { IndianCityLocation } from "@/services/location/location-service";

export interface LocationSearchProps {
  readonly language: SupportedLanguage;
  readonly selectedCity: string;
  readonly onSelectLocation: (loc: { name: string; latitude: number; longitude: number; city: string; state: string }) => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  language,
  selectedCity: _selectedCity,
  onSelectLocation
}) => {
  const t = TRANSLATIONS[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly IndianCityLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
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
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Search className="h-4 w-4 text-slate-400" />
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
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            aria-label="Search city or location"
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="inline-flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 text-teal-400" />
          )}
          <span>{t.useLocation}</span>
        </button>
      </div>

      {geoError && (
        <p className="mt-1 text-xs text-rose-400" role="alert">
          {geoError}
        </p>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
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
                className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4 text-teal-400" />
                <span className="font-medium text-white">{loc.name}</span>
                <span className="text-xs text-slate-400">({loc.state})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
