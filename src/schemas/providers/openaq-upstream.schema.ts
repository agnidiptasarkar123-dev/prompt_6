// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const OpenAQLicenseSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional().nullable(),
  commercialUseAllowed: z.boolean().optional().nullable(),
  attributionRequired: z.boolean().optional().nullable(),
  shareAlike: z.boolean().optional().nullable(),
  url: z.string().optional().nullable()
});

export const OpenAQSensorParameterSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  units: z.string().optional().nullable(),
  displayName: z.string().optional().nullable()
});

export const OpenAQSensorSchema = z.object({
  id: z.number(),
  name: z.string().optional().nullable(),
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
  sensors: z.array(OpenAQSensorSchema).nullable().optional().transform((v) => v ?? []),
  licenses: z.array(OpenAQLicenseSchema).nullable().optional().transform((v) => v ?? []),
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
