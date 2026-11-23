// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { Layers, List } from "lucide-react";
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";

export interface StationMapProps {
  readonly center: { latitude: number; longitude: number; name?: string };
  readonly stations: readonly NormalizedStation[];
  readonly selectedStationId: string | null;
  readonly onSelectStation: (station: NormalizedStation) => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  center,
  stations,
  selectedStationId,
  onSelectStation
}) => {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Normalize lat/lon to a 400x300 viewBox centered at center
  const width = 600;
  const height = 340;
  const span = 0.8; // degrees view range

  const getCoordinates = (lat: number, lon: number) => {
    const x = width / 2 + ((lon - center.longitude) / span) * width;
    const y = height / 2 - ((lat - center.latitude) / span) * height;
    return { x, y };
  };

  return (
    <section aria-labelledby="map-heading" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 id="map-heading" className="text-sm font-bold text-white">
            Monitoring Stations Map
          </h3>
          <p className="text-xs text-slate-400">
            Center: {center.latitude.toFixed(4)}°N, {center.longitude.toFixed(4)}°E
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-semibold ${
              viewMode === "map" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
            aria-pressed={viewMode === "map"}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-semibold ${
              viewMode === "list" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
            aria-pressed={viewMode === "list"}
          >
            <List className="h-3.5 w-3.5" />
            <span>Accessible List</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[300px] w-full"
            role="img"
            aria-label="Map showing monitoring stations around selected location"
          >
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="#090d16" />
            <rect width={width} height={height} fill="url(#grid)" />

            {/* Range Rings */}
            <circle cx={width / 2} cy={height / 2} r="60" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={width / 2} cy={height / 2} r="120" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

            {/* User Center Point */}
            <circle cx={width / 2} cy={height / 2} r="8" fill="#14b8a6" fillOpacity="0.3" />
            <circle cx={width / 2} cy={height / 2} r="4" fill="#2dd4bf" />
            <text x={width / 2 + 8} y={height / 2 - 8} fill="#2dd4bf" fontSize="10" fontWeight="bold">
              You / Selected
            </text>

            {/* Station Markers */}
            {stations.map((st) => {
              const { x, y } = getCoordinates(st.latitude, st.longitude);
              const isSelected = st.id === selectedStationId;
              const isCpcb = st.providerId === "CPCB_CAAQMS";
              const color = isCpcb ? "#3b82f6" : "#a855f7";

              return (
                <g
                  key={st.id}
                  onClick={() => onSelectStation(st)}
                  className="cursor-pointer transition hover:opacity-100"
                  tabIndex={0}
                  role="button"
                  aria-label={`${st.name} (${st.providerId})`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectStation(st);
                  }}
                >
                  {isSelected && (
                    <circle cx={x} cy={y} r="14" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
                  )}
                  <circle cx={x} cy={y} r={isSelected ? "6" : "4.5"} fill={color} stroke="#0f172a" strokeWidth="1.5" />
                  <text
                    x={x + 7}
                    y={y + 3}
                    fill={isSelected ? "#ffffff" : "#94a3b8"}
                    fontSize="9"
                    fontWeight={isSelected ? "bold" : "normal"}
                  >
                    {st.name.length > 20 ? st.name.substring(0, 18) + "..." : st.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Map Attribution and Legend */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-400">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-400" /> User Center
              </span>
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" /> CPCB Station
              </span>
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-purple-500" /> OpenAQ Station
              </span>
            </div>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-slate-500"
            >
              © OpenStreetMap contributors
            </a>
          </div>
        </div>
      ) : (
        /* Accessible Non-Map Fallback List */
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-[11px] font-semibold text-slate-400">
              <tr>
                <th className="px-3 py-2">Station Name</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stations.map((st) => (
                <tr key={st.id} className={st.id === selectedStationId ? "bg-teal-500/10" : ""}>
                  <td className="px-3 py-2 font-medium text-white">{st.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        st.providerId === "CPCB_CAAQMS" ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {st.providerId === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-teal-400">{st.distanceKm ?? "N/A"} km</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectStation(st)}
                      className="rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-700"
                    >
                      {st.id === selectedStationId ? "Active" : "Select"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
