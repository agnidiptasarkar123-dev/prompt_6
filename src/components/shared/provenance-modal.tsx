// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { X, Database } from "lucide-react";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

export interface ProvenanceModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly station: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly observations: readonly NormalizedObservation[];
  readonly provider: string;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  isOpen,
  onClose,
  station,
  calculatedAqi,
  observations,
  provider
}) => {
  if (!isOpen) return null;

  const latestObsTime = observations.reduce<string | null>((latest, o) => {
    if (!latest) return o.observationTime;
    return o.observationTime > latest ? o.observationTime : latest;
  }, null);
  const retrievalTime = observations[0]?.retrievalTime || calculatedAqi?.calculatedAtUtc || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
    >
      <div className="hs-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-modal-subtle">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-1 text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-[var(--hs-accent)]" />
          <h3 id="provenance-modal-heading" className="text-xl font-bold text-[var(--hs-text-primary)]">
            Data Provenance & Scientific Transparency
          </h3>
        </div>
        <p className="mt-1 text-xs text-[var(--hs-text-secondary)]">
          Every air quality data point in HawaSaathi preserves complete mathematical and legal provenance.
        </p>

        <div className="mt-5 space-y-4 text-xs text-[var(--hs-text-secondary)]">
          {/* Station Metadata */}
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
            <h4 className="font-semibold text-[var(--hs-text-primary)]">Monitoring Station Evidence</h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--hs-text-primary)]">
              <p>
                <span className="text-[var(--hs-text-secondary)]">Station:</span> {station?.name || "N/A"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Station ID:</span> {station?.id || "N/A"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Location:</span> {station ? `${station.city}, ${station.state}` : "N/A"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Coordinates:</span>{" "}
                {station ? `${station.latitude.toFixed(4)}°N, ${station.longitude.toFixed(4)}°E` : "N/A"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Upstream Provider:</span> {provider || station?.providerId || "NONE"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Observations Loaded:</span> {observations.length} parameter(s)
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Latest Observation Time:</span>{" "}
                {latestObsTime ? new Date(latestObsTime).toLocaleString() : "Unavailable"}
              </p>
              <p>
                <span className="text-[var(--hs-text-secondary)]">Server Retrieval Time:</span>{" "}
                {retrievalTime ? new Date(retrievalTime).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>

          {/* Typology Classification */}
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
            <h4 className="font-semibold text-[var(--hs-text-primary)]">Four-Way Data Typology Contract</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 font-bold text-blue-500">Type A</span>
                <span>Official CPCB-published AQI reported directly by CAAQMS bulletin.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-[var(--hs-accent)]/15 border border-[var(--hs-accent)]/30 px-1.5 py-0.5 font-bold text-[var(--hs-accent)]">Type B</span>
                <span>
                  Independently calculated CPCB-methodology AQI computed by HawaSaathi domain engine from validated sensor concentrations (requires &ge; 3 pollutants with PM2.5 or PM10, 16h/6h data sufficiency).
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 font-bold text-amber-500">Type C</span>
                <span>Raw sensor concentration (physical measured value with timestamp and unit).</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 font-bold text-indigo-500">Type D</span>
                <span>Modelled atmospheric forecast (Open-Meteo CAMS Global ~45 km grid, strictly tagged MODEL_FORECAST).</span>
              </div>
            </div>
          </div>

          {/* Legal License and Attribution */}
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
            <h4 className="font-semibold text-[var(--hs-text-primary)]">Legal Licensing & Attributions</h4>
            <div className="mt-2 space-y-2 text-[var(--hs-text-secondary)]">
              <p>
                <strong className="text-[var(--hs-text-primary)]">CPCB / data.gov.in:</strong> Published under Government Open Data License - India (GODL-India). Resource: 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.
              </p>
              <p>
                <strong className="text-[var(--hs-text-primary)]">OpenAQ:</strong> Aggregated from national/regional environmental protection agencies. Each station retains upstream provider license.
              </p>
              <p>
                <strong className="text-[var(--hs-text-primary)]">Open-Meteo CAMS Global:</strong> Copernicus Atmosphere Monitoring Service model forecast under Creative Commons Attribution 4.0 International (CC BY 4.0).
              </p>
              <p>
                <strong className="text-[var(--hs-text-primary)]">OpenStreetMap:</strong> Cartography and tiles &copy; OpenStreetMap contributors under ODbL 1.0 (Produced Work).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--hs-accent)] px-5 py-2 text-xs font-bold text-[var(--hs-accent-text)] transition hover:opacity-90"
          >
            Close Transparency Report
          </button>
        </div>
      </div>
    </div>
  );
};
