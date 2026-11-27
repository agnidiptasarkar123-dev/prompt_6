// SPDX-License-Identifier: Apache-2.0
import type {
  NormalizedForecast,
  NormalizedObservation
} from "@/schemas/providers/normalized-provider.schema";

const DEFAULT_MAX_OBSERVATIONS = 60;
const DEFAULT_MAX_FORECAST = 96;

/**
 * Strips heavy raw upstream payloads (`rawRecord`) and bounds observation arrays
 * before client-to-BFF JSON serialization so legitimate live city payloads remain
 * well below strict API body size and schema limits.
 */
export function compactObservationsForRequest(
  observations: readonly NormalizedObservation[],
  maxCount: number = DEFAULT_MAX_OBSERVATIONS
): readonly Omit<NormalizedObservation, "rawRecord">[] {
  return observations.slice(0, maxCount).map(({ rawRecord: _raw, ...rest }) => rest);
}

/**
 * Bounds CAMS forecast arrays sent to interactive BFF routes to the earliest upcoming
 * horizon slice, preventing payload bloat when upstream returns multi-day grids.
 */
export function compactForecastForRequest(
  forecast: readonly NormalizedForecast[],
  maxCount: number = DEFAULT_MAX_FORECAST
): readonly NormalizedForecast[] {
  return forecast.slice(0, maxCount);
}
