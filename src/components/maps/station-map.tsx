// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useRef } from "react";
import {
  Layers,
  List,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Expand,
  RotateCcw,
  LocateFixed,
  Minimize2,
  Maximize2
} from "lucide-react";
import type {
  NormalizedStation,
  NormalizedObservation
} from "@/schemas/providers/normalized-provider.schema";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";

export type MapLayerMode = "ALL" | "CPCB_CAAQMS" | "OPENAQ" | "AQI_CATEGORY" | "POLLUTANTS" | "FORECAST";

export interface ClusteredMarker {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly stations: NormalizedStation[];
}

export function clusterMapMarkers(
  points: readonly { station: NormalizedStation; x: number; y: number }[],
  zoom: number
): ClusteredMarker[] {
  const clusters: ClusteredMarker[] = [];
  const mergeDist = zoom >= 2.2 ? 0 : 22;
  for (const pt of points) {
    const existing =
      mergeDist > 0
        ? clusters.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < mergeDist)
        : undefined;
    if (existing) {
      const count = existing.stations.length;
      const updatedX = (existing.x * count + pt.x) / (count + 1);
      const updatedY = (existing.y * count + pt.y) / (count + 1);
      existing.stations.push(pt.station);
      (existing as { x: number }).x = updatedX;
      (existing as { y: number }).y = updatedY;
    } else {
      clusters.push({
        id: `cluster-${pt.station.id}`,
        x: pt.x,
        y: pt.y,
        stations: [pt.station]
      });
    }
  }
  return clusters;
}

export interface StationMapProps {
  readonly center: { latitude: number; longitude: number; name?: string };
  readonly stations: readonly NormalizedStation[];
  readonly selectedStationId: string | null;
  readonly onSelectStation: (station: NormalizedStation) => void;
  readonly initialViewMode?: "map" | "list";
  readonly language?: SupportedLanguage;
  readonly currentObservations?: readonly NormalizedObservation[];
  readonly currentAqiValue?: number | null;
  readonly isLoading?: boolean;
  readonly errorMessage?: string | null;
  readonly onLocateUser?: () => void;
  readonly onOpenStationDetails?: () => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  center,
  stations,
  selectedStationId,
  onSelectStation,
  initialViewMode,
  language = "en",
  currentObservations,
  currentAqiValue = null,
  isLoading = false,
  errorMessage = null,
  onLocateUser,
  onOpenStationDetails
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [viewMode, setViewMode] = useState<"map" | "list">(initialViewMode ?? "map");
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchDistRef = useRef<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerMode>("ALL");
  const [showOsmTiles, setShowOsmTiles] = useState(false);
  const [tileLoadError, setTileLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const width = 600;
  const height = 340;
  const baseSpan = 0.8;
  const span = baseSpan / zoom;

  const getCoordinates = (lat: number, lon: number) => {
    const x = width / 2 + ((lon - center.longitude) / span) * width + pan.x;
    const y = height / 2 - ((lat - center.latitude) / span) * height + pan.y;
    return { x, y };
  };

  const filteredStations = stations.filter((s) => {
    if (activeLayer === "CPCB_CAAQMS") return s.providerId === "CPCB_CAAQMS";
    if (activeLayer === "OPENAQ") return s.providerId === "OPENAQ";
    if (activeLayer === "AQI_CATEGORY") {
      return s.availablePollutants.length >= 3 && (s.availablePollutants.includes("PM2.5") || s.availablePollutants.includes("PM10"));
    }
    if (activeLayer === "POLLUTANTS") return s.availablePollutants.length > 0;
    return true;
  });

  const clusters = clusterMapMarkers(
    filteredStations.map((st) => ({ station: st, ...getCoordinates(st.latitude, st.longitude) })),
    zoom
  );

  const handleZoomIn = () => setZoom((z) => Math.min(5.0, Math.round((z + 0.4) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.4) * 100) / 100));
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitStations = () => {
    if (filteredStations.length === 0) {
      handleResetView();
      return;
    }
    let minLat = center.latitude;
    let maxLat = center.latitude;
    let minLon = center.longitude;
    let maxLon = center.longitude;
    for (const s of filteredStations) {
      minLat = Math.min(minLat, s.latitude);
      maxLat = Math.max(maxLat, s.latitude);
      minLon = Math.min(minLon, s.longitude);
      maxLon = Math.max(maxLon, s.longitude);
    }
    const maxDelta = Math.max(maxLat - minLat, maxLon - minLon, 0.05);
    const nextZoom = Math.min(4.5, Math.max(0.5, (baseSpan * 0.72) / maxDelta));
    setZoom(Math.round(nextZoom * 100) / 100);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    dragOriginRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragOriginRef.current) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    setPan({ x: dragOriginRef.current.panX + dx, y: dragOriginRef.current.panY + dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragOriginRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.deltaY < 0) handleZoomIn();
    else if (e.deltaY > 0) handleZoomOut();
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      pinchDistRef.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      dragOriginRef.current = null;
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      const t0 = e.touches[0]!;
      setIsDragging(true);
      dragOriginRef.current = { x: t0.clientX, y: t0.clientY, panX: pan.x, panY: pan.y };
      pinchDistRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const ratio = dist / Math.max(1, pinchDistRef.current);
      if (Math.abs(ratio - 1) > 0.08) {
        setZoom((z) => Math.max(0.5, Math.min(5.0, Math.round(z * ratio * 100) / 100)));
        pinchDistRef.current = dist;
      }
    } else if (e.touches.length === 1 && isDragging && dragOriginRef.current) {
      const t0 = e.touches[0]!;
      const dx = t0.clientX - dragOriginRef.current.x;
      const dy = t0.clientY - dragOriginRef.current.y;
      setPan({ x: dragOriginRef.current.panX + dx, y: dragOriginRef.current.panY + dy });
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
    dragOriginRef.current = null;
    setIsDragging(false);
  };

  // Compute central OSM tile coordinate for optional street cartography backdrop
  const osmTileZoom = Math.max(9, Math.min(13, Math.round(10 + Math.log2(zoom))));
  const osmTileX = Math.floor(((center.longitude + 180) / 360) * Math.pow(2, osmTileZoom));
  const latRad = (center.latitude * Math.PI) / 180;
  const osmTileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, osmTileZoom)
  );

  const handleMapKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 28;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === "0") {
      e.preventDefault();
      handleResetView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y + step }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y - step }));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x + step }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x - step }));
    }
  };

  const userX = width / 2 + pan.x;
  const userY = height / 2 + pan.y;

  return (
    <section aria-labelledby="map-heading" className="hs-card overflow-hidden rounded-2xl border border-[var(--hs-info-border)] bg-[var(--hs-surface-bg)] p-4 shadow-card-subtle">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 id="map-heading" className="text-sm font-bold text-[var(--hs-text-primary)]">
            Monitoring Stations Map
          </h2>
          <p className="text-xs text-[var(--hs-text-secondary)]">
            Center: {center.latitude.toFixed(4)}°N, {center.longitude.toFixed(4)}°E
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center space-x-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-1">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-semibold transition ${viewMode === "map" ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold shadow-xs" : "text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
              }`}
            aria-pressed={viewMode === "map"}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{v2.mapViewLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-semibold transition ${viewMode === "list" ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold shadow-xs" : "text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
              }`}
            aria-pressed={viewMode === "list"}
          >
            <List className="h-3.5 w-3.5" />
            <span>{v2.listViewLabel}</span>
          </button>
        </div>
      </div>

      {/* Layer Filter Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="map-layer-select" className="text-[11px] font-semibold text-[var(--hs-text-secondary)]">
              Map Layer:
            </label>
            <select
              id="map-layer-select"
              aria-label="Map Layer Filter"
              value={activeLayer}
              onChange={(e) => setActiveLayer(e.target.value as MapLayerMode)}
              className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-xs font-medium text-[var(--hs-text-primary)]"
            >
              <option value="ALL">All Stations ({stations.length})</option>
              <option value="CPCB_CAAQMS">CPCB Official Only</option>
              <option value="OPENAQ">OpenAQ Sensors Only</option>
              <option value="AQI_CATEGORY">AQI Availability Layer</option>
              <option value="POLLUTANTS">Pollutant Coverage Layer</option>
              <option value="FORECAST">CAMS Grid Context</option>
            </select>
          </div>
          <label className="inline-flex min-h-[24px] items-center gap-2 text-[11px] font-medium text-[var(--hs-text-secondary)] cursor-pointer py-0.5">
            <input
              type="checkbox"
              checked={showOsmTiles}
              onChange={(e) => {
                setTileLoadError(false);
                setShowOsmTiles(e.target.checked);
              }}
              className="h-4 w-4 rounded"
            />
            <span>OSM Carto Backdrop</span>
          </label>
        </div>
        <span className="text-[11px] text-[var(--hs-text-secondary)]">
          Zoom {zoom.toFixed(1)}x • Showing {filteredStations.length} station{filteredStations.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Explicit Loading / Error Fallback States */}
      {errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-center"
        >
          <AlertCircle className="h-7 w-7 text-[var(--hs-accent-coral)] mb-2" />
          <p className="text-sm font-semibold text-[var(--hs-text-primary)]">Map Display Fallback Active</p>
          <p className="mt-1 text-xs text-[var(--hs-text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className="mt-3 rounded-lg bg-[var(--hs-accent)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
          >
            Switch to Accessible Station List
          </button>
        </div>
      ) : viewMode === "map" ? (
        <div
          tabIndex={0}
          onKeyDown={handleMapKeyDown}
          aria-label="Interactive monitoring stations canvas. Use Arrow keys to pan, + or - to zoom, Tab to select markers."
          className="relative overflow-hidden rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--hs-focus-ring)]"
        >
          {/* Interactive Map Controls Overlay */}
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)]/95 p-1.5 shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label={v2.mapZoomIn}
              title={`${v2.mapZoomIn} (+)`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label={v2.mapZoomOut}
              title={`${v2.mapZoomOut} (-)`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFitStations}
              aria-label={v2.mapFitMarkers}
              title={v2.mapFitMarkers}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              <Expand className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              aria-label={v2.mapReset}
              title={`${v2.mapReset} (0)`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            {onLocateUser && (
              <button
                type="button"
                onClick={onLocateUser}
                aria-label={v2.mapLocateUser}
                title={v2.mapLocateUser}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-accent)] hover:bg-[var(--hs-subtle-bg)]"
              >
                <LocateFixed className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              aria-label={isFullscreen ? "Exit Fullscreen Map" : "Fullscreen Map"}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {isLoading && (
            <div className="absolute left-3 top-3 z-20 rounded-lg bg-[var(--hs-surface-bg)]/90 px-3 py-1 text-xs font-medium text-[var(--hs-text-primary)] shadow">
              Loading monitoring stations...
            </div>
          )}

          {/* Layer Methodology Callout */}
          {activeLayer === "FORECAST" && (
            <div className="absolute left-3 top-3 z-20 max-w-xs rounded-lg border border-indigo-400/40 bg-indigo-950/85 px-2.5 py-1.5 text-[11px] text-indigo-100 shadow">
              Type D CAMS Model Context (~45 km grid). Surface estimates do not imply uniform street-level AQI.
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`w-full select-none touch-none ${isFullscreen ? "h-[68vh]" : "h-[340px]"} ${isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            role="img"
            aria-label="Map showing monitoring stations around selected location"
          >
            <defs>
              <pattern id="hs-map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--hs-map-grid)" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="var(--hs-map-bg)" />
            {showOsmTiles && !tileLoadError && (
              <image
                href={`https://tile.openstreetmap.org/${osmTileZoom}/${osmTileX}/${osmTileY}.png`}
                x={pan.x * 0.25}
                y={pan.y * 0.25}
                width={width}
                height={height}
                preserveAspectRatio="xMidYMid slice"
                opacity="0.32"
                onError={() => setTileLoadError(true)}
              />
            )}
            <rect width={width} height={height} fill="url(#hs-map-grid)" />

            {/* Range Rings */}
            <circle cx={width / 2} cy={height / 2} r="60" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={width / 2} cy={height / 2} r="120" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

            {/* Range Rings (15 km & 35 km spatial orientation) */}
            <circle cx={userX} cy={userY} r={55 * Math.min(2, zoom)} fill="none" stroke="var(--hs-border-strong)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={userX} cy={userY} r={115 * Math.min(2, zoom)} fill="none" stroke="var(--hs-border-strong)" strokeWidth="1" strokeDasharray="3 3" />

            {/* User / Search Center Marker */}
            <circle cx={userX} cy={userY} r="10" fill="#1F9D78" fillOpacity="0.3" />
            <circle cx={userX} cy={userY} r="4.5" fill="#1F9D78" stroke="#FFFFFF" strokeWidth="1.2" />
            <text x={userX + 9} y={userY - 8} fill="var(--hs-map-label)" fontSize="10" fontWeight="bold">
              {center.name || "Center"}
            </text>

            {/* Clustered or Individual Station Markers with Bounding-Box Label De-overlap */}
            {(() => {
              const placedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
              return clusters.map((cluster) => {
                if (cluster.stations.length > 1) {
                  return (
                    <g
                      key={cluster.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn();
                      }}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Cluster of ${cluster.stations.length} stations. Activate to zoom in.`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleZoomIn();
                        }
                      }}
                    >
                      <circle cx={cluster.x} cy={cluster.y} r="13" fill="#1F9D78" fillOpacity="0.92" stroke="#FFFFFF" strokeWidth="1.5" />
                      <text
                        x={cluster.x}
                        y={cluster.y + 4}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {cluster.stations.length}
                      </text>
                    </g>
                  );
                }

                const st = cluster.stations[0]!;
                const isSelected = st.id === selectedStationId;
                const isHovered = st.id === hoveredId;
                const isCpcb = st.providerId === "CPCB_CAAQMS";
                const color = isCpcb ? "#0284c7" : "#9333ea";

                const labelW = Math.min(130, st.name.length * 5.5);
                const labelBox = { x: cluster.x + 8, y: cluster.y - 8, w: labelW, h: 14 };
                const collides = placedBoxes.some(
                  (b) =>
                    labelBox.x < b.x + b.w &&
                    labelBox.x + labelBox.w > b.x &&
                    labelBox.y < b.y + b.h &&
                    labelBox.y + labelBox.h > b.y
                );
                const showLabel = isSelected || isHovered || (!collides && (clusters.length <= 6 || zoom >= 1.8));
                if (showLabel) {
                  placedBoxes.push(labelBox);
                }

                return (
                  <g
                    key={st.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStation(st);
                    }}
                    onMouseEnter={() => setHoveredId(st.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${st.name} (${st.providerId})`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectStation(st);
                      }
                    }}
                  >
                    {isSelected && (
                      <circle cx={cluster.x} cy={cluster.y} r="14" fill="#3b82f6" fillOpacity="0.2" stroke="#FACC15" strokeWidth="1.8" />
                    )}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={isSelected ? "6.5" : "5"}
                      fill={isSelected ? "#2563eb" : color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    {showLabel && (
                      <text
                        x={cluster.x + 8}
                        y={cluster.y + 3}
                        fill={isSelected ? "var(--hs-accent)" : "var(--hs-map-label)"}
                        fontSize="9.5"
                        fontWeight={isSelected ? "bold" : "600"}
                      >
                        {st.name.length > 22 ? st.name.substring(0, 20) + "..." : st.name}
                      </text>
                    )}
                  </g>
                );
              });
            })()}
          </svg>

          {/* Map Attribution and Legend */}
          <div className="flex flex-wrap items-center justify-between border-t border-[var(--hs-border-subtle)] bg-[var(--hs-elevated-bg)] px-3 py-2 text-[10px] text-[var(--hs-text-secondary)]">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" /> User Center
              </span>
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" /> CPCB Station
              </span>
              <span className="flex items-center">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-purple-500" /> OpenAQ Station
              </span>
              {currentAqiValue !== null && (
                <span className="font-semibold text-[var(--hs-text-primary)]">
                  Selected AQI: {Math.round(currentAqiValue)}
                </span>
              )}
              {currentObservations && currentObservations.length > 0 && (
                <span>({currentObservations.length} obs)</span>
              )}
              {onOpenStationDetails && selectedStationId && (
                <button
                  type="button"
                  onClick={onOpenStationDetails}
                  className="inline-flex min-h-[24px] items-center text-[var(--hs-accent)] font-semibold hover:underline"
                >
                  Inspect Station Details
                </button>
              )}
            </div>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[24px] items-center hover:underline text-[var(--hs-accent)] font-medium"
            >
              © OpenStreetMap contributors
            </a>
          </div>
        </div>
      ) : (
        /* Accessible Non-Map Fallback List */
        <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-elevated-bg)]">
          <table className="min-w-full divide-y divide-[var(--hs-border-subtle)] text-left text-xs text-[var(--hs-text-primary)]">
            <thead className="bg-[var(--hs-subtle-bg)] text-[11px] font-semibold text-[var(--hs-text-secondary)]">
              <tr>
                <th className="px-3 py-2">Station Name</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hs-border-subtle)]">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-[var(--hs-text-secondary)]">
                    No monitoring stations available for the selected layer.
                  </td>
                </tr>
              ) : (
                filteredStations.map((st) => (
                <tr key={st.id} className={st.id === selectedStationId ? "bg-[var(--hs-subtle-bg)]" : ""}>
                  <td className="px-3 py-2 font-medium text-[var(--hs-text-primary)]">{st.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${st.providerId === "CPCB_CAAQMS" ? "bg-[var(--hs-info-bg)] text-[var(--hs-accent-blue)]" : "bg-[var(--hs-learn-bg)] text-[var(--hs-accent-violet)]"
                        }`}
                    >
                      {st.providerId === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--hs-text-secondary)] hs-tabular">
                    {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-[var(--hs-accent)] font-medium hs-tabular">{st.distanceKm ?? "N/A"} km</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onSelectStation(st)}
                      className="rounded bg-[var(--hs-accent)] px-2 py-1 text-[11px] font-medium text-[var(--hs-accent-text)] hover:opacity-90 transition"
                    >
                      {st.id === selectedStationId ? "Active" : "Select"}
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
