// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";

export async function GET(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const url = new URL(req.url);
  const stationId = url.searchParams.get("stationId");
  const stationName = url.searchParams.get("stationName") || undefined;
  const latStr = url.searchParams.get("lat");
  const lonStr = url.searchParams.get("lon");

  if (!stationId && (!latStr || !lonStr)) {
    return errorResponse(
      400,
      "MISSING_PARAMETERS",
      "Provide either 'stationId' or both 'lat' and 'lon' coordinates."
    );
  }

  try {
    let resolvedStationId: string | undefined = stationId || undefined;
    let resolvedStationHint = undefined;

    if (!resolvedStationId && latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (isNaN(lat) || isNaN(lon) || lat < 6.0 || lat > 38.0 || lon < 68.0 || lon > 98.0) {
        return errorResponse(400, "INVALID_COORDINATES", "Coordinates outside valid India geographic range.");
      }

      const nearby = await globalSourceOrchestrator.searchNearbyStations({
        latitude: lat,
        longitude: lon,
        radiusKm: 60
      });

      if (nearby.stations.length === 0) {
        return successResponse({
          data: {
            station: null,
            observations: [],
            calculatedAqi: null,
            aqiStatus: "AQI_UNAVAILABLE",
            statusMessage: "No monitoring stations found within 60 km radius of selected location.",
            provider: "NONE"
          },
          warnings: ["No ground monitoring stations available nearby. Check Open-Meteo atmospheric forecast."]
        });
      }

      resolvedStationHint = nearby.stations[0];
      resolvedStationId = resolvedStationHint?.id;
    }

    if (!resolvedStationId) {
      return errorResponse(404, "STATION_NOT_FOUND", "No valid monitoring station could be resolved.");
    }

    const aqResult = await globalSourceOrchestrator.getStationAirQuality(
      resolvedStationId,
      resolvedStationHint,
      stationName
    );
    return successResponse({
      data: aqResult,
      warnings: aqResult.warnings
    });
  } catch (err: unknown) {
    return errorResponse(500, "AIR_QUALITY_FETCH_ERROR", err instanceof Error ? err.message : String(err));
  }
}
