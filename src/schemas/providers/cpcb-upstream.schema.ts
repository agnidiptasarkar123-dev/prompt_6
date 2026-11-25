// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

/**
 * Zod schema for individual pollutant records in CPCB / data.gov.in feed
 * Resource ID: 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69
 */
export const CpcbRawRecordSchema = z.object({
  country: z.string().optional().default("India"),
  state: z.string().min(1),
  city: z.string().min(1),
  station: z.string().min(1),
  last_update: z.string().optional().nullable(),
  pollutant_id: z.string().min(1),
  pollutant_min: z.union([z.string(), z.number()]).optional().nullable(),
  pollutant_max: z.union([z.string(), z.number()]).optional().nullable(),
  pollutant_avg: z.union([z.string(), z.number()]).optional().nullable(),
  min_value: z.union([z.string(), z.number()]).optional().nullable(),
  max_value: z.union([z.string(), z.number()]).optional().nullable(),
  avg_value: z.union([z.string(), z.number()]).optional().nullable(),
  pollutant_unit: z.string().optional().nullable(),
  latitude: z.union([z.string(), z.number()]).optional().nullable(),
  longitude: z.union([z.string(), z.number()]).optional().nullable()
});
export type CpcbRawRecord = z.infer<typeof CpcbRawRecordSchema>;

export const CpcbApiResponseSchema = z.object({
  index_name: z.string().optional(),
  title: z.string().optional(),
  desc: z.string().optional(),
  created: z.union([z.number(), z.string()]).optional(),
  updated: z.union([z.number(), z.string()]).optional(),
  created_date: z.string().optional(),
  updated_date: z.string().optional(),
  active: z.string().optional(),
  count: z.union([z.number(), z.string()]).optional(),
  limit: z.union([z.number(), z.string()]).optional(),
  offset: z.union([z.number(), z.string()]).optional(),
  total: z.union([z.number(), z.string()]).optional(),
  records: z.array(CpcbRawRecordSchema).default([])
});
export type CpcbApiResponse = z.infer<typeof CpcbApiResponseSchema>;
