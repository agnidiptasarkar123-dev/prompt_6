// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";

export async function GET(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const url = new URL(req.url);
  const latStr = url.searchParams.get("lat");
  const lonStr = url.searchParams.get("lon");
  const radiusStr = url.searchParams.get("radiusKm") ?? url.searchParams.get("radius");
  const query = url.searchParams.get("query") || undefined;

  if (!latStr || !lonStr) {
    return errorResponse(400, "MISSING_COORDINATES", "Both 'lat' and 'lon' query parameters are required.");
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || lat < 6.0 || lat > 38.0) {
    return errorResponse(400, "INVALID_LATITUDE", "Latitude must be a valid number within India bounds (6.0 to 38.0).");
  }

  if (isNaN(lon) || lon < 68.0 || lon > 98.0) {
    return errorResponse(400, "INVALID_LONGITUDE", "Longitude must be a valid number within India bounds (68.0 to 98.0).");
  }

  const radiusKm = radiusStr ? parseFloat(radiusStr) : 50;
  if (isNaN(radiusKm) || radiusKm < 1 || radiusKm > 150) {
    return errorResponse(400, "INVALID_RADIUS", "radiusKm must be a number between 1 and 150 km.");
  }

  try {
    const result = await globalSourceOrchestrator.searchNearbyStations({
      latitude: lat,
      longitude: lon,
      radiusKm,
      query
    });

    return successResponse({
      data: {
        center: { latitude: lat, longitude: lon },
        radiusKm,
        count: result.stations.length,
        stations: result.stations
      },
      warnings: result.warnings
    });
  } catch (err: unknown) {
    return errorResponse(500, "ORCHESTRATOR_ERROR", err instanceof Error ? err.message : String(err));
  }
}
