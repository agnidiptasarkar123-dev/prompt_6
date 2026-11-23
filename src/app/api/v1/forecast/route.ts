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
  const horizonStr = url.searchParams.get("horizonDays");

  if (!latStr || !lonStr) {
    return errorResponse(400, "MISSING_COORDINATES", "Both 'lat' and 'lon' query parameters are required.");
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || lat < 6.0 || lat > 38.0) {
    return errorResponse(400, "INVALID_LATITUDE", "Latitude must be within India bounds (6.0 to 38.0).");
  }

  if (isNaN(lon) || lon < 68.0 || lon > 98.0) {
    return errorResponse(400, "INVALID_LONGITUDE", "Longitude must be within India bounds (68.0 to 98.0).");
  }

  const horizonDays = horizonStr ? parseInt(horizonStr, 10) : 3;
  if (isNaN(horizonDays) || horizonDays < 1 || horizonDays > 5) {
    return errorResponse(400, "INVALID_HORIZON", "horizonDays must be an integer between 1 and 5.");
  }

  try {
    const forecastResult = await globalSourceOrchestrator.getForecast({
      latitude: lat,
      longitude: lon,
      horizonDays
    });

    return successResponse({
      data: forecastResult,
      warnings: forecastResult.warnings
    });
  } catch (err: unknown) {
    return errorResponse(500, "FORECAST_FETCH_ERROR", err instanceof Error ? err.message : String(err));
  }
}
