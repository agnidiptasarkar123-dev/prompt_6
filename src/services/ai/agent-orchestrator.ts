// SPDX-License-Identifier: Apache-2.0
import { executeAgentTool, type AgentToolContext, type AgentToolTrace } from "./agent-tools";
import type { SupportedLanguage } from "@/i18n/translations";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { NormalizedObservation, NormalizedStation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

export interface AgentTaskRequest {
  readonly prompt: string;
  readonly language?: SupportedLanguage;
  readonly stationId?: string;
  readonly station?: NormalizedStation | null;
  readonly stations?: readonly NormalizedStation[];
  readonly calculatedAqi?: CpcbAqiResult | null;
  readonly observations?: readonly NormalizedObservation[];
  readonly forecast?: readonly NormalizedForecast[];
  readonly coordinates?: { readonly latitude: number; readonly longitude: number };
  readonly roomDimensions?: { readonly length: number; readonly width: number; readonly height: number };
  readonly context: AgentToolContext;
}

export interface AgentStructuredResponse {
  readonly taskType: string;
  readonly directAnswer: string;
  readonly verifiedFacts: readonly string[];
  readonly explanation: string;
  readonly suggestedAction: string;
  readonly sources: readonly string[];
  readonly confidenceOrLimitation: string;
  readonly followUpPrompt: string;
  readonly dataDistinction: "MEASURED_OBSERVATION" | "CALCULATED_AQI" | "MODEL_FORECAST" | "ESTIMATE" | "EDUCATIONAL_GUIDANCE";
  readonly toolTraces: readonly AgentToolTrace[];
}

export async function runIntelligentAgentTask(req: AgentTaskRequest): Promise<AgentStructuredResponse> {
  const q = req.prompt.trim().toLowerCase();
  const traces: AgentToolTrace[] = [];
  const lat = req.coordinates?.latitude ?? req.station?.latitude ?? 22.5726;
  const lon = req.coordinates?.longitude ?? req.station?.longitude ?? 88.3639;

  // 1. Air Purifier / CADR / ACH Sizing task
  if (q.includes("cadr") || q.includes("purifier") || q.includes("ach") || q.includes("room size")) {
    const dims = req.roomDimensions ?? { length: 5, width: 4, height: 2.8 };
    const outcome = await executeAgentTool(
      "calculate_cadr",
      {
        roomLengthMeters: dims.length,
        roomWidthMeters: dims.width,
        roomHeightMeters: dims.height,
        targetAch: 4.5
      },
      req.context
    );
    traces.push(outcome.trace);
    const achOutcome = await executeAgentTool(
      "calculate_ach",
      {
        roomLengthMeters: dims.length,
        roomWidthMeters: dims.width,
        roomHeightMeters: dims.height,
        deviceCadrM3H: 250
      },
      req.context
    );
    traces.push(achOutcome.trace);
    const res = outcome.data as {
      roomVolumeM3: number;
      requiredCadrM3H: number;
      requiredCadrCfm: number;
      filterTypeGuidance: string;
    };
    const achRes = achOutcome.data as { achievedAch: number; adequacy: string };
    return {
      taskType: "PURIFIER_SIZING",
      directAnswer: `For a ${dims.length}m × ${dims.width}m × ${dims.height}m room (${res.roomVolumeM3} m³), target a purifier with at least ${res.requiredCadrM3H} m³/h (${res.requiredCadrCfm} CFM) CADR to reach 4.5 Air Changes per Hour.`,
      verifiedFacts: [
        `Room Volume: ${res.roomVolumeM3} m³`,
        `Required CADR at 4.5 ACH: ${res.requiredCadrM3H} m³/h (${res.requiredCadrCfm} CFM)`,
        `A 250 m³/h baseline purifier achieves ${achRes.achievedAch} ACH (${achRes.adequacy})`
      ],
      explanation: res.filterTypeGuidance,
      suggestedAction: "Keep exterior windows closed during purifier operation unless active indoor combustion requires exhaust.",
      sources: ["Deterministic Filtration Engineering Calculator (ASHRAE / Harvard Healthy Buildings heuristic)"],
      confidenceOrLimitation: "4.5 ACH is an engineering sizing guideline, not a statutory CPCB threshold. True indoor AQI cannot be measured without an indoor sensor.",
      followUpPrompt: "Would you like to check whether natural window ventilation is safer right now?",
      dataDistinction: "ESTIMATE",
      toolTraces: traces
    };
  }

  // 1b. Alert Rules Explanation & Validation task
  if (q.includes("alert") || q.includes("threshold") || q.includes("quiet hour")) {
    const alertOutcome = await executeAgentTool("get_alert_rules", {}, req.context);
    traces.push(alertOutcome.trace);
    return {
      taskType: "ALERT_RULES_ADVISORY",
      directAnswer:
        "Smart Alerts trigger on verified CPCB AQI thresholds (Moderate/Poor/Very Poor/Severe) with a ±5 AQI hysteresis buffer, elevated PM2.5 readings, CAMS forecast exceedances, and >24h stale data warnings.",
      verifiedFacts: [
        "Hysteresis Buffer: +5 AQI above chosen threshold prevents repeated boundary flapping",
        "Quiet Hours: Suppresses non-severe alerts overnight while always permitting SEVERE warnings",
        "Deduplication: Identical station + threshold conditions never create duplicate alert entries"
      ],
      explanation:
        "Even when composite CPCB AQI is unavailable, raw Type C PM2.5 exceedance alerts and stale-data warnings continue protecting your household.",
      suggestedAction: "Open Alerts -> Configure Alert Rules to set your threshold and quiet hours window.",
      sources: ["HawaSaathi Smart Alert Engine (smart-alert-engine.ts)"],
      confidenceOrLimitation: "Alert evaluation relies on the active monitoring station feed and CAMS forecast.",
      followUpPrompt: "Would you like to search nearby monitoring stations with complete pollutants?",
      dataDistinction: "EDUCATIONAL_GUIDANCE",
      toolTraces: traces
    };
  }

  // 2. Indoor Ventilation task
  if (q.includes("ventilat") || q.includes("open window") || q.includes("windows") || q.includes("indoor")) {
    const category = req.calculatedAqi?.overallAqi !== null && req.calculatedAqi?.overallAqi !== undefined
      ? req.calculatedAqi.category
      : null;
    const outcome = await executeAgentTool(
      "get_ventilation_guidance",
      { aqiCategory: category, hasIndoorCombustion: q.includes("incense") || q.includes("cook") || q.includes("smoke") },
      req.context
    );
    traces.push(outcome.trace);
    const dec = outcome.data as {
      windowAction: string;
      optimalTimeWindow: string;
      practicalMethod: string;
      scientificDisclaimer: string;
    };
    return {
      taskType: "VENTILATION_GUIDANCE",
      directAnswer: `Recommended ventilation strategy: ${dec.windowAction.replace(/_/g, " ")} (${dec.optimalTimeWindow}).`,
      verifiedFacts: [
        category
          ? `Verified outdoor AQI category: ${category} (AQI ${req.calculatedAqi?.overallAqi})`
          : "Overall CPCB AQI is currently UNAVAILABLE at the selected station"
      ],
      explanation: dec.practicalMethod,
      suggestedAction: "Always activate kitchen exhaust before cooking or using incense to prevent indoor CO and PM buildup.",
      sources: ["MoHFW / NCDC Indoor Ventilation Advisory (Oct 2025)"],
      confidenceOrLimitation: dec.scientificDisclaimer,
      followUpPrompt: "Calculate recommended purifier CADR for your bedroom or living room?",
      dataDistinction: "EDUCATIONAL_GUIDANCE",
      toolTraces: traces
    };
  }

  // 3. Compare Nearby Stations task (reuse loaded stations first to avoid 15-20s serial fetches)
  if (q.includes("compare") || q.includes("station")) {
    let stationsList: NormalizedStation[] = (req.stations ?? []).slice(0, 3);
    if (stationsList.length === 0) {
      const searchRes = await executeAgentTool(
        "search_stations",
        { latitude: lat, longitude: lon, radiusKm: 50 },
        req.context
      );
      traces.push(searchRes.trace);
      stationsList = ((searchRes.data as { stations?: NormalizedStation[] })?.stations || []).slice(0, 3);
    }
    return {
      taskType: "STATION_COMPARISON",
      directAnswer:
        stationsList.length > 0
          ? `Discovered ${stationsList.length} station(s) near (${lat.toFixed(2)}, ${lon.toFixed(2)}): ${stationsList.map((s) => s.name).join("; ")}.`
          : "No active monitoring stations were returned within 50 km of these coordinates.",
      verifiedFacts: stationsList.map(
        (s) => `${s.name} [${s.providerId}] — Distance: ${s.distanceKm ?? "N/A"} km, Monitored: ${s.availablePollutants.join(", ") || "None"}`
      ),
      explanation: "Station readings are isolated strictly per sensor. A closer station may have fewer parameters than a farther CAAQMS station.",
      suggestedAction: "Select a station with at least 3 parameters including PM2.5 or PM10 to view verified CPCB AQI.",
      sources: stationsList.map((s) => `${s.attribution} (${s.license})`),
      confidenceOrLimitation: "Micro-environments near arterial roads can differ from station roof heights.",
      followUpPrompt: "Ask me to interpret the Type D CAMS forecast for outdoor planning.",
      dataDistinction: "MEASURED_OBSERVATION",
      toolTraces: traces
    };
  }

  // 4. Forecast & Walk / Commute Activity Window task (reuse pre-loaded forecast snapshot when available)
  if (q.includes("forecast") || q.includes("walk") || q.includes("commute") || q.includes("plan") || q.includes("window")) {
    let forecastPoints: readonly NormalizedForecast[] = req.forecast ?? [];
    if (forecastPoints.length === 0) {
      const fcRes = await executeAgentTool("get_forecast", { latitude: lat, longitude: lon, horizonDays: 3 }, req.context);
      traces.push(fcRes.trace);
      forecastPoints = (fcRes.data as { forecast?: NormalizedForecast[] })?.forecast || [];
    }
    const planRes = await executeAgentTool(
      "evaluate_daily_plan",
      {
        activities: [
          {
            id: "agent-probe-walk",
            title: "Planned Outdoor Window",
            category: q.includes("commute") ? "OFFICE_COMMUTE" : "WALKING",
            environment: q.includes("commute") ? "TRANSIT" : "OUTDOOR",
            startTime: "07:00",
            endTime: "07:45",
            locationName: req.station?.city || "Local Area",
            isFavorite: false,
            reminderEnabled: false
          }
        ],
        latitude: lat,
        longitude: lon,
        forecast: forecastPoints,
        calculatedAqi: req.calculatedAqi,
        observations: req.observations
      },
      req.context
    );
    traces.push(planRes.trace);
    const evalData = planRes.data as { bestOutdoorWindow: string; summaryNote: string };

    return {
      taskType: "ACTIVITY_WINDOW_ADVISORY",
      directAnswer: `Best forecasted outdoor dispersion window: ${evalData.bestOutdoorWindow}.`,
      verifiedFacts: [
        req.calculatedAqi?.overallAqi !== null && req.calculatedAqi?.overallAqi !== undefined
          ? `Current verified station AQI: ${req.calculatedAqi.overallAqi} (${req.calculatedAqi.category})`
          : "Current verified overall CPCB AQI is UNAVAILABLE; relying on Type D model forecast and NCDC peak-hour avoidance.",
        `CAMS Forecast points evaluated: ${forecastPoints.length} (~45 km grid)`
      ],
      explanation: evalData.summaryNote,
      suggestedAction: "Avoid heavy outdoor exercise between 06:00–09:30 and 18:00–22:00 when boundary-layer inversions trap emissions.",
      sources: ["Open-Meteo CAMS Global (TYPE_D_MODEL_FORECAST, CC BY 4.0)", "MoHFW NCDC Diurnal Advisory"],
      confidenceOrLimitation: "Atmospheric model forecasts are 45 km grid estimates and cannot replace street-level ground sensors.",
      followUpPrompt: "Open the Daily Planner view to add and track activities throughout your day.",
      dataDistinction: "MODEL_FORECAST",
      toolTraces: traces
    };
  }

  // 5. Provenance / Missing Data / Default Air Quality Summary task
  const provOutcome = await executeAgentTool("get_data_provenance", {}, req.context);
  traces.push(provOutcome.trace);

  const hasAqi = req.calculatedAqi !== null && req.calculatedAqi !== undefined && req.calculatedAqi.overallAqi !== null;
  const obsList = req.observations || [];

  return {
    taskType: "AIR_QUALITY_BRIEFING",
    directAnswer: hasAqi
      ? `Current verified CPCB AQI at ${req.station?.name || "selected station"} is ${req.calculatedAqi!.overallAqi} (${req.calculatedAqi!.category}), driven by ${req.calculatedAqi!.prominentPollutant || "particulates"}.`
      : `Overall CPCB AQI is currently UNAVAILABLE at ${req.station?.name || "this station"} because CPCB methodology requires at least 3 valid pollutants including PM2.5 or PM10.`,
    verifiedFacts: hasAqi
      ? obsList.map((o) => `${o.pollutant}: ${o.value} ${o.unit || ""} (${o.averagingPeriod})`)
      : obsList.length > 0
        ? obsList.map((o) => `Raw ${o.pollutant}: ${o.value} ${o.unit || ""} (Type C Raw)`)
        : ["No ground sensor observations are currently loaded for this station."],
    explanation:
      "HawaSaathi separates verified CPCB calculated AQI (Type B), raw sensor observations (Type C), and CAMS atmospheric forecasts (Type D) to prevent misleading pollution claims.",
    suggestedAction: hasAqi
      ? "Review Personalised Recommendations or open the Daily Planner to align outdoor activity windows."
      : "Inspect available individual pollutant cards or switch to a nearby station in the Stations view.",
    sources: [
      req.station ? `${req.station.attribution} (${req.station.license})` : "CPCB / OpenAQ Registry"
    ],
    confidenceOrLimitation: hasAqi
      ? "Station reading reflects ambient monitoring conditions at the specific station coordinates."
      : "Overall AQI unavailable; never extrapolated or defaulted to Moderate.",
    followUpPrompt: "Ask me to compare nearby stations or calculate indoor purifier CADR.",
    dataDistinction: hasAqi ? "CALCULATED_AQI" : "EDUCATIONAL_GUIDANCE",
    toolTraces: traces
  };
}
