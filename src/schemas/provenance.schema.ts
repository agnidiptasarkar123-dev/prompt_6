import { z } from "zod";

/**
 * Four-Way Data Typology Contract:
 * Enforces strict scientific and regulatory separation across the platform.
 */
export const DataTypologySchema = z.enum([
  "TYPE_A_OFFICIAL_AQI",          // Certified CPCB bulletin value
  "TYPE_A_OFFICIAL_CPCB_AQI",     // Explicit alias for Certified CPCB bulletin value
  "TYPE_B_CALCULATED_AQI",        // Independently calculated using official MoEFCC 2014 CPCB formula
  "TYPE_B_CALCULATED_CPCB_AQI",   // Explicit alias for independently calculated CPCB AQI
  "TYPE_C_RAW_SENSOR",            // Physical observed sensor concentration (µg/m³ or mg/m³)
  "TYPE_D_MODEL_FORECAST"         // Modelled atmospheric dispersion forecast (CAMS Global ~45 km)
]);

export type DataTypology = z.infer<typeof DataTypologySchema>;

export const DataSourceProviderSchema = z.enum([
  "CPCB_CAAQMS",
  "OPENAQ",
  "OPEN_METEO_CAMS"
]);

export type DataSourceProvider = z.infer<typeof DataSourceProviderSchema>;

export const StationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export type StationCoordinates = z.infer<typeof StationCoordinatesSchema>;

export const DataProvenanceRecordSchema = z.object({
  provenanceId: z.string().uuid(),
  typology: DataTypologySchema,
  provider: DataSourceProviderSchema,
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  coordinates: StationCoordinatesSchema,
  observationTimestampUtc: z.string().datetime(),
  retrievalTimestampUtc: z.string().datetime(),
  isCached: z.boolean(),
  cacheAgeMinutes: z.number().nonnegative(),
  attributionNotice: z.string().min(1)
});

export type DataProvenanceRecord = z.infer<typeof DataProvenanceRecordSchema>;
