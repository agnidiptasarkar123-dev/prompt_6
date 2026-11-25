// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { determineVentilationStrategy } from "@/domain/indoor/ventilation-decision";
import { evaluateScheduleDay } from "@/domain/planner/schedule-planner";
import { searchIndianCities } from "@/services/location/location-service";
import { PlannedActivitySchema, type PlannedActivity } from "@/schemas/planner.schema";
import type { CpcbCategory } from "@/schemas/cpcb.schema";
import type { DwellingContext } from "@/schemas/user-context.schema";

export type AgentToolName =
  | "search_stations"
  | "get_station_details"
  | "get_station_observations"
  | "get_verified_aqi"
  | "get_forecast"
  | "compare_stations"
  | "evaluate_daily_plan"
  | "create_daily_plan"
  | "update_daily_plan"
  | "get_alert_rules"
  | "update_alert_rules"
  | "calculate_cadr"
  | "calculate_ach"
  | "get_ventilation_guidance"
  | "get_data_provenance"
  | "validate_alert_rule";

export interface AgentToolContext {
  readonly isAuthenticated: boolean;
  readonly hasCloudConsent: boolean;
  readonly allowedTools?: readonly AgentToolName[];
}

export interface AgentToolTrace {
  readonly toolName: AgentToolName;
  readonly status: "SUCCESS" | "PERMISSION_DENIED" | "VALIDATION_ERROR" | "EXECUTION_ERROR";
  readonly source: string;
  readonly dataClassification: "MEASURED" | "CALCULATED_AQI" | "FORECAST" | "ESTIMATE" | "EDUCATIONAL";
  readonly summary: string;
}

export interface ToolExecutionOutcome {
  readonly ok: boolean;
  readonly trace: AgentToolTrace;
  readonly data?: unknown;
  readonly error?: string;
}

const SearchStationsInputSchema = z.object({
  cityOrQuery: z.string().min(1).max(100).optional(),
  latitude: z.number().min(6).max(38).optional(),
  longitude: z.number().min(68).max(98).optional(),
  radiusKm: z.number().min(1).max(150).default(50)
});

const StationIdInputSchema = z.object({
  stationId: z.string().min(1).max(120)
});

const ForecastInputSchema = z.object({
  latitude: z.number().min(6).max(38),
  longitude: z.number().min(68).max(98),
  horizonDays: z.number().int().min(1).max(5).default(3)
});

const CompareStationsInputSchema = z.object({
  stationIds: z.array(z.string().min(1)).min(1).max(5)
});

const CalculateCadrInputSchema = z.object({
  roomLengthMeters: z.number().positive().max(50),
  roomWidthMeters: z.number().positive().max(50),
  roomHeightMeters: z.number().positive().max(15),
  targetAch: z.number().positive().max(12).default(4.5)
});

const VentilationInputSchema = z.object({
  aqiCategory: z.enum(["GOOD", "SATISFACTORY", "MODERATE", "POOR", "VERY_POOR", "SEVERE"]).nullable(),
  hasIndoorCombustion: z.boolean().default(false)
});

const CalculateAchInputSchema = z.object({
  roomLengthMeters: z.number().positive().max(50),
  roomWidthMeters: z.number().positive().max(50),
  roomHeightMeters: z.number().positive().max(15),
  deviceCadrM3H: z.number().positive().max(2000)
});

const PlanMutationInputSchema = z.object({
  activities: z.array(PlannedActivitySchema).min(1).max(20),
  persistToCloud: z.boolean().default(false)
});

const UpdateAlertRulesInputSchema = z.object({
  severityThreshold: z.enum(["MODERATE", "POOR", "VERY_POOR", "SEVERE"]),
  quietHoursEnabled: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default("07:00"),
  hysteresisEnabled: z.boolean().default(true),
  persistToCloud: z.boolean().default(false)
});

const AlertRuleInputSchema = z.object({
  severityThreshold: z.enum(["MODERATE", "POOR", "VERY_POOR", "SEVERE"]),
  pm25ThresholdUgM3: z.number().positive().max(1000).optional(),
  quietHoursEnabled: z.boolean().default(false)
});

export async function executeAgentTool(
  toolName: AgentToolName,
  rawInput: unknown,
  ctx: AgentToolContext
): Promise<ToolExecutionOutcome> {
  if (ctx.allowedTools && !ctx.allowedTools.includes(toolName)) {
    return {
      ok: false,
      error: `Tool '${toolName}' is not permitted in this session.`,
      trace: {
        toolName,
        status: "PERMISSION_DENIED",
        source: "AGENT_POLICY",
        dataClassification: "EDUCATIONAL",
        summary: `Blocked tool ${toolName} due to permission scope.`
      }
    };
  }

  try {
    switch (toolName) {
      case "search_stations": {
        const parsed = SearchStationsInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "MEASURED",
              summary: "Invalid station search parameters."
            }
          };
        }
        let lat = parsed.data.latitude ?? 22.5726;
        let lon = parsed.data.longitude ?? 88.3639;
        if (parsed.data.cityOrQuery) {
          const matches = searchIndianCities(parsed.data.cityOrQuery, 1);
          if (matches[0]) {
            lat = matches[0].latitude;
            lon = matches[0].longitude;
          }
        }
        const res = await globalSourceOrchestrator.searchNearbyStations({
          latitude: lat,
          longitude: lon,
          radiusKm: parsed.data.radiusKm,
          query: parsed.data.cityOrQuery
        });
        return {
          ok: true,
          data: res,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "CPCB_CAAQMS + OPENAQ",
            dataClassification: "MEASURED",
            summary: `Discovered ${res.stations.length} monitoring station(s) near (${lat.toFixed(2)}, ${lon.toFixed(2)}).`
          }
        };
      }

      case "get_station_details":
      case "get_station_observations":
      case "get_verified_aqi": {
        const parsed = StationIdInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: "Valid stationId is required.",
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "CALCULATED_AQI",
              summary: "Missing or invalid stationId."
            }
          };
        }
        const aq = await globalSourceOrchestrator.getStationAirQuality(parsed.data.stationId);
        return {
          ok: true,
          data: aq,
          trace: {
            toolName,
            status: "SUCCESS",
            source: aq.provider,
            dataClassification: aq.calculatedAqi ? "CALCULATED_AQI" : "MEASURED",
            summary: aq.calculatedAqi?.overallAqi
              ? `Station ${parsed.data.stationId} AQI ${aq.calculatedAqi.overallAqi} (${aq.calculatedAqi.category}).`
              : `Station ${parsed.data.stationId} AQI unavailable (${aq.observations.length} raw observations).`
          }
        };
      }

      case "get_forecast": {
        const parsed = ForecastInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: "Valid India bounds lat/lon required.",
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "FORECAST",
              summary: "Invalid forecast coordinates."
            }
          };
        }
        const fc = await globalSourceOrchestrator.getForecast(parsed.data);
        return {
          ok: true,
          data: fc,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "OPEN_METEO_CAMS",
            dataClassification: "FORECAST",
            summary: `Retrieved ${fc.forecast.length} Type D model forecast points (${fc.modelDomain}).`
          }
        };
      }

      case "compare_stations": {
        const parsed = CompareStationsInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: "Between 1 and 5 stationIds required.",
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "MEASURED",
              summary: "Invalid station comparison list."
            }
          };
        }
        const settled = await Promise.all(
          parsed.data.stationIds.map((id) => globalSourceOrchestrator.getStationAirQuality(id))
        );
        return {
          ok: true,
          data: settled,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "CPCB_CAAQMS + OPENAQ",
            dataClassification: "MEASURED",
            summary: `Compared ${settled.length} monitoring station(s) preserving per-station isolation.`
          }
        };
      }

      case "evaluate_daily_plan": {
        const payload = (rawInput || {}) as {
          activities?: PlannedActivity[];
          stationId?: string;
          latitude?: number;
          longitude?: number;
        };
        const activities = Array.isArray(payload.activities) ? payload.activities : [];
        const aq = payload.stationId ? await globalSourceOrchestrator.getStationAirQuality(payload.stationId) : null;
        const fc =
          payload.latitude !== undefined && payload.longitude !== undefined
            ? await globalSourceOrchestrator.getForecast({ latitude: payload.latitude, longitude: payload.longitude })
            : { forecast: [] };

        const planEval = evaluateScheduleDay({
          activities,
          aqiResult: aq?.calculatedAqi ?? null,
          observations: aq?.observations ?? [],
          forecast: fc.forecast
        });
        return {
          ok: true,
          data: planEval,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "DETERMINISTIC_PLANNER_ENGINE",
            dataClassification: aq?.calculatedAqi ? "CALCULATED_AQI" : "ESTIMATE",
            summary: `Evaluated ${activities.length} activity item(s) (Confidence: ${planEval.overallConfidence}).`
          }
        };
      }

      case "calculate_cadr": {
        const parsed = CalculateCadrInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "ESTIMATE",
              summary: "Invalid room dimension inputs."
            }
          };
        }
        const result = calculateRoomFiltrationRequirements({
          roomLengthMeters: parsed.data.roomLengthMeters,
          roomWidthMeters: parsed.data.roomWidthMeters,
          roomHeightMeters: parsed.data.roomHeightMeters,
          targetAirChangesPerHour: parsed.data.targetAch
        });
        return {
          ok: true,
          data: result,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "FILTRATION_ENGINEERING_CALCULATOR",
            dataClassification: "ESTIMATE",
            summary: `Room ${result.roomVolumeM3} m³ requires ${result.requiredCadrM3H} m³/h (${result.requiredCadrCfm} CFM) at ${result.recommendedAch} ACH.`
          }
        };
      }

      case "get_ventilation_guidance": {
        const parsed = VentilationInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: "Invalid ventilation parameters.",
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "EDUCATIONAL",
              summary: "Invalid ventilation input."
            }
          };
        }
        const dummyDwelling: DwellingContext = {
          dwellingType: "APARTMENT_LOW_RISE",
          floorLevel: 2,
          proximityToMajorRoadMeters: 100,
          cooking: {
            primaryFuel: "LPG",
            kitchenVentilation: parsed.data.hasIndoorCombustion ? "UNVENTED_INDOOR" : "KITCHEN_HOOD_CHIMNEY",
            averageDailyCookingHours: 2
          },
          indoorSources: {
            incenseOrDhoopDaily: parsed.data.hasIndoorCombustion,
            mosquitoCoilUsage: false,
            indoorSmoking: false,
            unventedGasHeater: false
          },
          filtration: {
            hasAirPurifier: false,
            purifierLocations: [],
            filterType: "UNKNOWN"
          },
          windowSealingQuality: "STANDARD_WINDOWS"
        };
        const decision = determineVentilationStrategy(parsed.data.aqiCategory as CpcbCategory | null, dummyDwelling);
        return {
          ok: true,
          data: decision,
          trace: {
            toolName,
            status: "SUCCESS",
            source: "NCDC_INDOOR_VENTILATION_ENGINE",
            dataClassification: "EDUCATIONAL",
            summary: `Ventilation recommendation: ${decision.windowAction} (${decision.optimalTimeWindow}).`
          }
        };
      }

      case "get_data_provenance": {
        return {
          ok: true,
          data: {
            types: [
              { code: "TYPE_A", label: "Official CPCB CAAQMS Bulletin AQI" },
              { code: "TYPE_B", label: "Independently Calculated CPCB NAQI (requires >=3 pollutants & PM2.5/PM10)" },
              { code: "TYPE_C", label: "Raw Sensor Measurement (preserves timestamp, unit, averaging period)" },
              { code: "TYPE_D", label: "Open-Meteo CAMS Global Model Forecast (~45 km grid, CC BY 4.0)" }
            ]
          },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "PROVENANCE_REGISTRY",
            dataClassification: "EDUCATIONAL",
            summary: "Returned 4-tier HawaSaathi scientific data provenance taxonomy."
          }
        };
      }

      case "calculate_ach": {
        const parsed = CalculateAchInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "ESTIMATE",
              summary: "Invalid room or purifier CADR inputs."
            }
          };
        }
        const volumeM3 = Math.round(
          parsed.data.roomLengthMeters * parsed.data.roomWidthMeters * parsed.data.roomHeightMeters * 10
        ) / 10;
        const achievedAch = Math.round((parsed.data.deviceCadrM3H / volumeM3) * 10) / 10;
        const adequacy = achievedAch >= 4.5 ? "OPTIMAL" : achievedAch >= 2.5 ? "MODERATE" : "UNDERSIZED";
        return {
          ok: true,
          data: { roomVolumeM3: volumeM3, deviceCadrM3H: parsed.data.deviceCadrM3H, achievedAch, adequacy },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "FILTRATION_ENGINEERING_CALCULATOR",
            dataClassification: "ESTIMATE",
            summary: `Calculated ${achievedAch} ACH (${adequacy}) for ${volumeM3} m³ at ${parsed.data.deviceCadrM3H} m³/h.`
          }
        };
      }

      case "create_daily_plan":
      case "update_daily_plan": {
        const parsed = PlanMutationInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "EDUCATIONAL",
              summary: "Invalid daily plan activity payload."
            }
          };
        }
        if (parsed.data.persistToCloud && (!ctx.isAuthenticated || !ctx.hasCloudConsent)) {
          return {
            ok: false,
            error: "Cloud schedule persistence requires authenticated session and explicit DPDP consent.",
            trace: {
              toolName,
              status: "PERMISSION_DENIED",
              source: "AUTH_AND_DPDP_POLICY",
              dataClassification: "EDUCATIONAL",
              summary: "Denied cloud plan write without authenticated session + consent."
            }
          };
        }
        const planEval = evaluateScheduleDay({
          activities: parsed.data.activities,
          aqiResult: null,
          observations: [],
          forecast: []
        });
        return {
          ok: true,
          data: {
            activities: parsed.data.activities,
            evaluation: planEval,
            storageScope: parsed.data.persistToCloud ? "CLOUD_ELIGIBLE" : "LOCAL_PREVIEW"
          },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "DETERMINISTIC_PLANNER_ENGINE",
            dataClassification: "ESTIMATE",
            summary: `Validated ${parsed.data.activities.length} planned activity item(s).`
          }
        };
      }

      case "get_alert_rules": {
        return {
          ok: true,
          data: {
            supportedThresholds: ["MODERATE", "POOR", "VERY_POOR", "SEVERE"],
            hysteresisBufferAqi: 5,
            quietHoursSupported: true,
            deduplicationActive: true
          },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "SMART_ALERT_ENGINE",
            dataClassification: "EDUCATIONAL",
            summary: "Returned active CPCB alert threshold rules and hysteresis semantics."
          }
        };
      }

      case "update_alert_rules": {
        const parsed = UpdateAlertRulesInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "EDUCATIONAL",
              summary: "Invalid alert rule update payload."
            }
          };
        }
        if (parsed.data.persistToCloud && (!ctx.isAuthenticated || !ctx.hasCloudConsent)) {
          return {
            ok: false,
            error: "Cloud alert rule updates require authenticated session and DPDP consent.",
            trace: {
              toolName,
              status: "PERMISSION_DENIED",
              source: "AUTH_AND_DPDP_POLICY",
              dataClassification: "EDUCATIONAL",
              summary: "Denied cloud alert update without session + consent."
            }
          };
        }
        return {
          ok: true,
          data: { updated: true, rule: parsed.data },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "SMART_ALERT_ENGINE",
            dataClassification: "EDUCATIONAL",
            summary: `Validated alert threshold ${parsed.data.severityThreshold} with quiet hours=${parsed.data.quietHoursEnabled}.`
          }
        };
      }

      case "validate_alert_rule": {
        const parsed = AlertRuleInputSchema.safeParse(rawInput);
        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues.map((i) => i.message).join("; "),
            trace: {
              toolName,
              status: "VALIDATION_ERROR",
              source: "ZOD_SCHEMA",
              dataClassification: "EDUCATIONAL",
              summary: "Invalid alert rule specification."
            }
          };
        }
        return {
          ok: true,
          data: { valid: true, rule: parsed.data },
          trace: {
            toolName,
            status: "SUCCESS",
            source: "ALERT_RULE_VALIDATOR",
            dataClassification: "EDUCATIONAL",
            summary: `Validated alert rule at ${parsed.data.severityThreshold} threshold.`
          }
        };
      }
    }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      trace: {
        toolName,
        status: "EXECUTION_ERROR",
        source: "TOOL_RUNNER",
        dataClassification: "EDUCATIONAL",
        summary: `Tool ${toolName} encountered an execution error.`
      }
    };
  }
}
