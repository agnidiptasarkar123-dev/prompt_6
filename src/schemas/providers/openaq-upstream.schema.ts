// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const OpenAQLicenseSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  commercialUseAllowed: z.boolean().optional(),
  attributionRequired: z.boolean().optional(),
  shareAlike: z.boolean().optional(),
  url: z.string().optional()
});

export const OpenAQSensorParameterSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  units: z.string().optional(),
  displayName: z.string().optional()
});

export const OpenAQSensorSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  parameter: OpenAQSensorParameterSchema
});

export const OpenAQLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  locality: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  country: z.object({
    id: z.number().optional(),
    code: z.string().optional(),
    name: z.string().optional()
  }).optional().nullable(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  sensors: z.array(OpenAQSensorSchema).optional().default([]),
  licenses: z.array(OpenAQLicenseSchema).optional().default([]),
  provider: z.object({
    id: z.number().optional(),
    name: z.string().optional()
  }).optional().nullable(),
  owner: z.object({
    id: z.number().optional(),
    name: z.string().optional()
  }).optional().nullable(),
  datetimeLast: z.object({
    utc: z.string().optional().nullable(),
    local: z.string().optional().nullable()
  }).optional().nullable()
});
export type OpenAQLocation = z.infer<typeof OpenAQLocationSchema>;

export const OpenAQLocationsResponseSchema = z.object({
  meta: z.object({
    name: z.string().optional(),
    license: z.string().optional(),
    website: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    found: z.union([z.number(), z.string()]).optional()
  }).optional(),
  results: z.array(OpenAQLocationSchema).default([])
});
export type OpenAQLocationsResponse = z.infer<typeof OpenAQLocationsResponseSchema>;

export const OpenAQMeasurementSchema = z.object({
  period: z.object({
    datetimeFrom: z.object({
      utc: z.string(),
      local: z.string().optional()
    }).optional(),
    datetimeTo: z.object({
      utc: z.string(),
      local: z.string().optional()
    })
  }).optional(),
  value: z.number(),
  parameter: OpenAQSensorParameterSchema.optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional().nullable(),
  summary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    avg: z.number().optional()
  }).optional().nullable()
});
export type OpenAQMeasurement = z.infer<typeof OpenAQMeasurementSchema>;

export const OpenAQMeasurementsResponseSchema = z.object({
  meta: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    found: z.union([z.number(), z.string()]).optional()
  }).optional(),
  results: z.array(OpenAQMeasurementSchema).default([])
});
export type OpenAQMeasurementsResponse = z.infer<typeof OpenAQMeasurementsResponseSchema>;
