// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";
import { DataProvenanceRecordSchema } from "./provenance.schema";
import { CpcbAqiResultSchema } from "./cpcb.schema";
import { RawPollutantMeasurementSchema } from "./pollutant.schema";

/**
 * Complete snapshot representing current station observations.
 */
export const AirQualityObservationSnapshotSchema = z.object({
  provenance: DataProvenanceRecordSchema,
  cpcbResult: CpcbAqiResultSchema,
  rawMeasurements: z.array(RawPollutantMeasurementSchema)
});

export type AirQualityObservationSnapshot = z.infer<typeof AirQualityObservationSnapshotSchema>;
