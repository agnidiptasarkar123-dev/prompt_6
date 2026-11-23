// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { searchIndianCities } from "@/services/location/location-service";

export async function GET(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const url = new URL(req.url);
  const q = url.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return errorResponse(400, "INVALID_QUERY", "Search query 'q' must be at least 2 characters.");
  }

  if (q.length > 100) {
    return errorResponse(400, "QUERY_TOO_LONG", "Search query 'q' must not exceed 100 characters.");
  }

  const results = searchIndianCities(q.trim(), 10);
  return successResponse({
    data: {
      query: q.trim(),
      count: results.length,
      locations: results
    }
  });
}
