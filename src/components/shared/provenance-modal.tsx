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
  calculatedAqi: _calculatedAqi,
  observations: _observations,
  provider: _provider
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-teal-400" />
          <h3 className="text-xl font-bold text-white">Data Provenance & Scientific Transparency</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Every air quality data point in HawaSaathi preserves complete mathematical and legal provenance.
        </p>

        <div className="mt-5 space-y-4 text-xs text-slate-300">
          {/* Station Metadata */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h4 className="font-semibold text-white">Monitoring Station Evidence</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300">
              <p>
                <span className="text-slate-500">Station:</span> {station?.name || "N/A"}
              </p>
              <p>
                <span className="text-slate-500">Station ID:</span> {station?.id || "N/A"}
              </p>
              <p>
                <span className="text-slate-500">Location:</span> {station ? `${station.city}, ${station.state}` : "N/A"}
              </p>
              <p>
                <span className="text-slate-500">Coordinates:</span>{" "}
                {station ? `${station.latitude.toFixed(4)}°N, ${station.longitude.toFixed(4)}°E` : "N/A"}
              </p>
            </div>
          </div>

          {/* Typology Classification */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h4 className="font-semibold text-white">Four-Way Data Typology Contract</h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-bold text-blue-300">Type A</span>
                <span>Official CPCB-published AQI reported directly by CAAQMS bulletin.</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-bold text-teal-300">Type B</span>
                <span>
                  Independently calculated CPCB-methodology AQI computed by HawaSaathi domain engine from validated sensor concentrations (requires $\ge 3$ pollutants with PM2.5 or PM10, 16h/6h data sufficiency).
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300">Type C</span>
                <span>Raw sensor concentration (physical measured value with timestamp and unit).</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-bold text-indigo-300">Type D</span>
                <span>Modelled atmospheric forecast (Open-Meteo CAMS Global ~45 km grid, strictly tagged MODEL_FORECAST).</span>
              </div>
            </div>
          </div>

          {/* Legal License and Attribution */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h4 className="font-semibold text-white">Legal Licensing & Attributions</h4>
            <div className="mt-2 space-y-2 text-slate-300">
              <p>
                <strong className="text-slate-200">CPCB / data.gov.in:</strong> Published under Government Open Data License - India (GODL-India). Resource: 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.
              </p>
              <p>
                <strong className="text-slate-200">OpenAQ:</strong> Aggregated from national/regional environmental protection agencies. Each station retains upstream provider license.
              </p>
              <p>
                <strong className="text-slate-200">Open-Meteo CAMS Global:</strong> Copernicus Atmosphere Monitoring Service model forecast under Creative Commons Attribution 4.0 International (CC BY 4.0).
              </p>
              <p>
                <strong className="text-slate-200">OpenStreetMap:</strong> Cartography and tiles &copy; OpenStreetMap contributors under ODbL 1.0 (Produced Work).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-teal-400"
          >
            Close Transparency Report
          </button>
        </div>
      </div>
    </div>
  );
};
