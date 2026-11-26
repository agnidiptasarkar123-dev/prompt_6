// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import {
  calculatePersonalExposureImpact,
  calculateEmissionsImpact,
  calculateIndoorAirImpact,
  INDIA_ROAD_CO2_FACTORS,
  type TransportEmissionMode,
} from "@/domain/impact/impact-calculator";
import { generateSustainableAlternatives } from "@/domain/rules/sustainable-alternatives";
import {
  RecommendationsPanel,
  formatActionImpactTag,
} from "@/components/recommendations/recommendations-panel";
import { saveGuestContext, getGuestContext, clearGuestContext } from "@/lib/firebase/guest-context";

describe("Challenge 6: Family & Community Air Action Intelligence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Part 1: Personal Exposure Ambient Proxy", () => {
    it("computes ambient proxy difference without duration mismatch or personal dose/health claims", () => {
      const est = calculatePersonalExposureImpact({
        pollutant: "PM2.5",
        stationConcentration: 180,
        unit: "µg/m³",
        assumedReductionFraction: 0.5,
        sourceLabel: "OpenAQ / CPCB",
        observationTimestamp: "2026-11-26T12:00:00Z",
      });
      expect(est.basis).toBe("Estimated");
      expect(est.direction).toBe("REDUCES_EXPOSURE");
      expect(est.ambientProxyDifference).toBe(90);
      expect(est.unit).toBe("µg/m³");
      expect(est.summary).toContain("~50%");
      expect(est.stationProxyNote).toContain("NOT personal breathing-zone air");
      expect(est.stationProxyNote).toContain("NOT actual inhaled dose");
      expect(est.stationProxyNote).toContain("NOT a guaranteed health improvement");
      expect(est.assumptions[0]).toContain("stationary PM2.5 reading (180 µg/m³) solely as an ambient proxy");
      expect(est.assumptions[1]).toContain("attenuation factor (50%) without inventing personal breathing-rate");
      expect(est.uncertainty).toContain("no medical benefit is guaranteed");

      const zeroRed = calculatePersonalExposureImpact({
        pollutant: "PM2.5",
        stationConcentration: 0,
        unit: "µg/m³",
        assumedReductionFraction: 0,
        sourceLabel: "OpenAQ",
        observationTimestamp: null,
      });
      expect(zeroRed.basis).toBe("Estimated");
      expect(zeroRed.ambientProxyDifference).toBe(0);
      expect(zeroRed.summary).toContain("~0%");

      const fullRed = calculatePersonalExposureImpact({
        pollutant: "PM10",
        stationConcentration: 120,
        unit: "µg/m³",
        assumedReductionFraction: 1,
        sourceLabel: "OpenAQ",
        observationTimestamp: null,
      });
      expect(fullRed.ambientProxyDifference).toBe(120);
      expect(fullRed.summary).toContain("~100%");
    });

    it("degrades to Qualitative for null/negative/non-finite concentration and rejects invalid fractions", () => {
      for (const badConc of [null, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const res = calculatePersonalExposureImpact({
          pollutant: "PM2.5",
          stationConcentration: badConc,
          unit: "µg/m³",
          assumedReductionFraction: 0.4,
          sourceLabel: "CPCB",
          observationTimestamp: null,
        });
        expect(res.basis).toBe("Qualitative");
        expect(res.direction).toBe("UNVERIFIED");
        expect(res.ambientProxyDifference).toBeNull();
        expect(res.stationProxyNote).toBeNull();
        expect(res.summary).toContain("Qualitative exposure precaution: verified ambient station concentration is unavailable or invalid");
        expect(res.assumptions[0]).toContain("No valid ambient station concentration");
        expect(res.uncertainty).toContain("Quantitative proxy unavailable without valid ambient station measurements");
      }

      for (const badFrac of [-0.01, 1.01, Number.NaN]) {
        expect(() =>
          calculatePersonalExposureImpact({
            pollutant: "PM2.5",
            stationConcentration: 100,
            unit: "µg/m³",
            assumedReductionFraction: badFrac,
            sourceLabel: "OpenAQ",
            observationTimestamp: null,
          })
        ).toThrow("Reduction fraction must be finite and within [0, 1].");
      }
    });
  });

  describe("Parts 2 & 3: India GHG 2015 CO2 Factors & Symmetric Occupancy Conversion", () => {
    it("documents every vehicle category, rawUnit, and source in INDIA_ROAD_CO2_FACTORS", () => {
      expect(INDIA_ROAD_CO2_FACTORS.CAR_PETROL_LT_1400CC.rawUnit).toBe("PER_VEHICLE_KM");
      expect(INDIA_ROAD_CO2_FACTORS.CAR_PETROL_LT_1400CC.source).toContain("Petrol Hatchback <1400cc (0.130 kg CO2/vkm");
      expect(INDIA_ROAD_CO2_FACTORS.CAR_DIESEL_LT_1400CC.rawUnit).toBe("PER_VEHICLE_KM");
      expect(INDIA_ROAD_CO2_FACTORS.CAR_DIESEL_LT_1400CC.source).toContain("Diesel Hatchback <1400cc (0.117 kg CO2/vkm)");
      expect(INDIA_ROAD_CO2_FACTORS.MOTORCYCLE_LT_125CC.rawUnit).toBe("PER_VEHICLE_KM");
      expect(INDIA_ROAD_CO2_FACTORS.MOTORCYCLE_LT_125CC.source).toContain("Motorcycle <125cc (0.0290 kg CO2/vkm)");
      expect(INDIA_ROAD_CO2_FACTORS.SCOOTER_LT_110CC.rawUnit).toBe("PER_VEHICLE_KM");
      expect(INDIA_ROAD_CO2_FACTORS.SCOOTER_LT_110CC.source).toContain("Scooter <110cc (0.0334 kg CO2/vkm)");
      expect(INDIA_ROAD_CO2_FACTORS.BUS_INTRACITY.rawUnit).toBe("PER_PASSENGER_KM");
      expect(INDIA_ROAD_CO2_FACTORS.BUS_INTRACITY.source).toContain("SRTU Intracity Bus (0.015161 kg CO2/pax-km)");
      expect(INDIA_ROAD_CO2_FACTORS.METRO_RAIL.rawUnit).toBe("UNAVAILABLE");
      expect(INDIA_ROAD_CO2_FACTORS.METRO_RAIL.source).toContain("Not in India GHG Program Road Transport v1.0");
      expect(INDIA_ROAD_CO2_FACTORS.WALK_CYCLE.rawUnit).toBe("PER_PASSENGER_KM");
      expect(INDIA_ROAD_CO2_FACTORS.WALK_CYCLE.source).toContain("Zero direct tailpipe CO2 emissions");
      expect(INDIA_ROAD_CO2_FACTORS.TRIP_AVOIDED.rawUnit).toBe("PER_PASSENGER_KM");
      expect(INDIA_ROAD_CO2_FACTORS.TRIP_AVOIDED.source).toContain("Avoided travel (0 kg CO2)");
    });

    it("verifies documented India GHG Program 2015 factors and kg CO2 unit across all scenarios", () => {
      // 1. Car (<1400cc petrol, 0.130 kg CO2/vkm) to Intracity Bus (0.015161 kg CO2/pkm), 10 km, occ=1
      const carToBus = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "CAR_PETROL_LT_1400CC",
        toMode: "BUS_INTRACITY",
        occupancy: 1,
      });
      expect(carToBus.unit).toBe("kg CO2");
      expect(carToBus.basis).toBe("Estimated");
      expect(carToBus.direction).toBe("REDUCES_EMISSIONS");
      expect(carToBus.estimatedCo2DeltaKg).toBe(1.148);
      expect(carToBus.summary).toContain("1.148 kg CO2 avoided");
      expect(carToBus.assumptions[1]).toContain("Tailpipe CO2 only (not full CO2e lifecycle)");
      expect(carToBus.uncertainty).toContain("Historical 2015 fleet benchmark (+/-30% variance");
      expect(carToBus.emissionFactorSource).toContain("Petrol Hatchback <1400cc");
      expect(carToBus.emissionFactorSource).toContain("SRTU Intracity Bus");

      // 2. Bus to Car (reverse -> additional CO2 emitted, NEVER "saved")
      const busToCar = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "BUS_INTRACITY",
        toMode: "CAR_PETROL_LT_1400CC",
        occupancy: 1,
      });
      expect(busToCar.direction).toBe("INCREASES_EMISSIONS");
      expect(busToCar.estimatedCo2DeltaKg).toBe(-1.148);
      expect(busToCar.summary).toContain("additional CO2 emitted");
      expect(busToCar.summary).not.toContain("avoided");
      expect(busToCar.summary).not.toContain("saved");

      // 3. Car (0.130) to Motorcycle (<125cc, 0.0290), 10 km -> 1.01 kg CO2 avoided
      const carToMoto = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "CAR_PETROL_LT_1400CC",
        toMode: "MOTORCYCLE_LT_125CC",
      });
      expect(carToMoto.estimatedCo2DeltaKg).toBe(1.01);

      // 4. Motorcycle to Car -> -1.01 kg CO2 (additional CO2 emitted)
      const motoToCar = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "MOTORCYCLE_LT_125CC",
        toMode: "CAR_PETROL_LT_1400CC",
      });
      expect(motoToCar.direction).toBe("INCREASES_EMISSIONS");
      expect(motoToCar.estimatedCo2DeltaKg).toBe(-1.01);

      // 5. Petrol car solo (occ=1) to Petrol car carpool (occ=3), 15 km: (0.130 - 0.130/3)*15 = 1.30 kg CO2
      const soloToCarpool = calculateEmissionsImpact({
        distanceKm: 15,
        fromMode: "CAR_PETROL_LT_1400CC",
        toMode: "CAR_PETROL_LT_1400CC",
        fromOccupancy: 1,
        toOccupancy: 3,
      });
      expect(soloToCarpool.direction).toBe("REDUCES_EMISSIONS");
      expect(soloToCarpool.estimatedCo2DeltaKg).toBe(1.3);

      // 6. Diesel hatchback (<1400cc, 0.117) to Intracity Bus (0.015161), 10 km -> 1.018 kg CO2
      const dieselToBus = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "CAR_DIESEL_LT_1400CC",
        toMode: "BUS_INTRACITY",
      });
      expect(dieselToBus.estimatedCo2DeltaKg).toBe(1.018);

      // 7. Same mode to same mode -> NO_CHANGE (+0 kg CO2, explicit message)
      const sameBus = calculateEmissionsImpact({
        distanceKm: 8,
        fromMode: "BUS_INTRACITY",
        toMode: "BUS_INTRACITY",
        occupancy: 4,
      });
      expect(sameBus.direction).toBe("NO_CHANGE");
      expect(Object.is(sameBus.estimatedCo2DeltaKg, 0)).toBe(true);
      expect(sameBus.summary).toBe("No estimated CO2 change for 8 km (BUS_INTRACITY -> BUS_INTRACITY).");

      // 8. Different symmetric occupancy: Bus -> Petrol car (toOccupancy=2: 0.130/2=0.065)
      const busToSharedCar = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "BUS_INTRACITY",
        toMode: "CAR_PETROL_LT_1400CC",
        fromOccupancy: 1,
        toOccupancy: 2,
      });
      expect(busToSharedCar.direction).toBe("INCREASES_EMISSIONS");
      expect(busToSharedCar.estimatedCo2DeltaKg).toBe(-0.498);

      const soloScooterToPillion = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "SCOOTER_LT_110CC",
        toMode: "SCOOTER_LT_110CC",
        fromOccupancy: 1,
        toOccupancy: 2,
      });
      expect(soloScooterToPillion.estimatedCo2DeltaKg).toBe(0.167);

      // 9. Missing occupancy defaults to 1
      expect(soloToCarpool.assumptions[0]).toContain("occ=1");

      // 10. Invalid origin & destination occupancies throw specific RangeError labels
      for (const badOcc of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 6]) {
        expect(() =>
          calculateEmissionsImpact({
            distanceKm: 10,
            fromMode: "CAR_PETROL_LT_1400CC",
            toMode: "BUS_INTRACITY",
            fromOccupancy: badOcc,
          })
        ).toThrow("Origin occupancy must be a finite number between 1 and 5.");

        expect(() =>
          calculateEmissionsImpact({
            distanceKm: 10,
            fromMode: "BUS_INTRACITY",
            toMode: "CAR_PETROL_LT_1400CC",
            toOccupancy: badOcc,
          })
        ).toThrow("Destination occupancy must be a finite number between 1 and 5.");
      }

      // 11. Zero distance -> Qualitative, null + full contract messages
      const zeroDist = calculateEmissionsImpact({
        distanceKm: 0,
        fromMode: "CAR_PETROL_LT_1400CC",
        toMode: "BUS_INTRACITY",
      });
      expect(zeroDist.basis).toBe("Qualitative");
      expect(zeroDist.direction).toBe("NO_CHANGE");
      expect(zeroDist.unit).toBe("kg CO2");
      expect(zeroDist.estimatedCo2DeltaKg).toBeNull();
      expect(zeroDist.summary).toContain("No distance supplied (0 km); CO2 impact is qualitative");
      expect(zeroDist.assumptions[0]).toBe("Trip distance is 0 km.");
      expect(zeroDist.uncertainty).toContain("Non-zero distance required to quantify kg CO2 difference");
      expect(zeroDist.emissionFactorSource).toContain("Petrol Hatchback <1400cc");

      // 12. Missing factor (METRO_RAIL) returns Qualitative UNAVAILABLE with contract disclosures; invalid mode throws
      const metro = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "CAR_PETROL_LT_1400CC",
        toMode: "METRO_RAIL",
      });
      expect(metro.basis).toBe("Qualitative");
      expect(metro.direction).toBe("UNAVAILABLE");
      expect(metro.unit).toBe("kg CO2");
      expect(metro.estimatedCo2DeltaKg).toBeNull();
      expect(metro.summary).toContain("METRO_RAIL");
      expect(metro.assumptions[0]).toContain("Metro rail electricity emission intensity");
      expect(metro.uncertainty).toContain("City-specific traction electricity intensity");
      expect(metro.emissionFactorSource).toContain("city-specific electric grid factor required");

      const metroOrigin = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "METRO_RAIL",
        toMode: "BUS_INTRACITY",
      });
      expect(metroOrigin.direction).toBe("UNAVAILABLE");
      expect(metroOrigin.summary).toContain("METRO_RAIL");

      expect(() =>
        calculateEmissionsImpact({
          distanceKm: 10,
          fromMode: "INVALID" as TransportEmissionMode,
          toMode: "BUS_INTRACITY",
        })
      ).toThrow("Unsupported transport mode.");

      // 13. Walk to Bus -> additional CO2 emitted
      const walkToBus = calculateEmissionsImpact({
        distanceKm: 5,
        fromMode: "WALK_CYCLE",
        toMode: "BUS_INTRACITY",
      });
      expect(walkToBus.direction).toBe("INCREASES_EMISSIONS");
      expect(walkToBus.estimatedCo2DeltaKg).toBe(-0.076);

      // 14. Rounding boundaries + -0 normalization
      const oneKmBus = calculateEmissionsImpact({
        distanceKm: 1,
        fromMode: "BUS_INTRACITY",
        toMode: "TRIP_AVOIDED",
      });
      expect(oneKmBus.estimatedCo2DeltaKg).toBe(0.015);
      const negZeroGuard = calculateEmissionsImpact({
        distanceKm: 0.001,
        fromMode: "WALK_CYCLE",
        toMode: "BUS_INTRACITY",
      });
      expect(Object.is(negZeroGuard.estimatedCo2DeltaKg, 0)).toBe(true);
      expect(negZeroGuard.direction).toBe("NO_CHANGE");

      // 15. Per-passenger BUS_INTRACITY invariant under occupancy change
      const busOccCheck = calculateEmissionsImpact({
        distanceKm: 10,
        fromMode: "BUS_INTRACITY",
        toMode: "TRIP_AVOIDED",
        occupancy: 3,
      });
      expect(busOccCheck.estimatedCo2DeltaKg).toBe(0.152);

      // Negative / non-finite distance throws RangeError with contract message
      expect(() =>
        calculateEmissionsImpact({
          distanceKm: -1,
          fromMode: "CAR_PETROL_LT_1400CC",
          toMode: "BUS_INTRACITY",
        })
      ).toThrow("Distance must be a non-negative finite number.");
    });
  });

  describe("Part 4: Indoor Air Provenance Separation", () => {
    it("keeps ACH strictly Calculated even when valid indoor PM2.5 is Measured, and enforces exact freshness/rejection contracts", () => {
      const nowIso = "2026-11-26T12:00:00.000Z";
      const nowMs = Date.parse(nowIso);

      // Valid room + missing CADR + absent sensor
      const base = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
      });
      expect(base.achBasis).toBe("Calculated");
      expect(base.indoorPm25Basis).toBe("Unavailable");
      expect(base.calculatedAch).toBe(4.5);
      expect(base.measuredIndoorPm25).toBeNull();
      expect(base.sensorStatusNote).toBe("No indoor sensor reading provided; indoor air quality remains unmeasured.");
      expect(base.limitations[0]).toContain("never a Measured indoor result");
      expect(base.limitations[1]).toContain("does not automatically remove gaseous pollutants");
      expect(base.limitations[2]).toContain("door/window infiltration");

      // Valid CADR + valid indoor sensor -> ACH remains Calculated, PM2.5 is Measured
      const validTs = "2026-11-26T11:30:00.000Z";
      const validWithSensor = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
        purifierCadrM3H: 300,
        indoorSensorReading: {
          value: 28,
          unit: "µg/m³",
          observationTimestamp: validTs,
          sourceType: "INDOOR_SENSOR",
          nowUtc: nowIso,
        },
      });
      expect(validWithSensor.achBasis).toBe("Calculated");
      expect(validWithSensor.indoorPm25Basis).toBe("Measured");
      expect(validWithSensor.calculatedAch).toBe(5);
      expect(validWithSensor.measuredIndoorPm25).toBe(28);
      expect(validWithSensor.sensorStatusNote).toBe(`Measured indoor PM2.5: 28 µg/m³ at ${validTs}.`);
      expect(validWithSensor.summary).toContain("Measured indoor PM2.5: 28 µg/m³");

      // Exact boundary ticks: +60_000 ms (valid), +60_001 ms (invalid), -24h exact (valid), -24h-1ms (invalid)
      const boundaryFutureValid = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
        indoorSensorReading: {
          value: 0,
          unit: "µg/m³",
          observationTimestamp: new Date(nowMs + 60_000).toISOString(),
          sourceType: "INDOOR_SENSOR",
          nowUtc: nowIso,
        },
      });
      expect(boundaryFutureValid.indoorPm25Basis).toBe("Measured");
      expect(boundaryFutureValid.measuredIndoorPm25).toBe(0);

      const boundary24hExactValid = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
        indoorSensorReading: {
          value: 12,
          unit: "µg/m³",
          observationTimestamp: new Date(nowMs - 24 * 3600_000).toISOString(),
          sourceType: "INDOOR_SENSOR",
          nowUtc: nowIso,
        },
      });
      expect(boundary24hExactValid.indoorPm25Basis).toBe("Measured");

      // Default nowUtc uses current time
      const zeroIndoorDefaultClock = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
        indoorSensorReading: {
          value: 0,
          unit: "µg/m³",
          observationTimestamp: new Date().toISOString(),
          sourceType: "INDOOR_SENSOR",
        },
      });
      expect(zeroIndoorDefaultClock.indoorPm25Basis).toBe("Measured");

      // Outdoor station supplied as indoor data must be rejected
      const outdoorRejected = calculateIndoorAirImpact({
        roomLengthMeters: 4,
        roomWidthMeters: 5,
        roomHeightMeters: 3,
        purifierCadrM3H: 270,
        indoorSensorReading: {
          value: 210,
          unit: "µg/m³",
          observationTimestamp: "2026-11-26T11:30:00.000Z",
          sourceType: "OUTDOOR_STATION",
          nowUtc: nowIso,
        },
      });
      expect(outdoorRejected.achBasis).toBe("Calculated");
      expect(outdoorRejected.indoorPm25Basis).toBe("Unavailable");
      expect(outdoorRejected.measuredIndoorPm25).toBeNull();
      expect(outdoorRejected.sensorStatusNote).toContain("Rejected: outdoor station concentration");

      // Invalid/stale/future+1ms/wrong-unit indoor readings stay Unavailable
      for (const badReading of [
        { value: -5, unit: "µg/m³", observationTimestamp: "2026-11-26T11:00:00.000Z", sourceType: "INDOOR_SENSOR" as const, nowUtc: nowIso },
        { value: 25, unit: "ppm", observationTimestamp: "2026-11-26T11:00:00.000Z", sourceType: "INDOOR_SENSOR" as const, nowUtc: nowIso },
        { value: 25, unit: "µg/m³", observationTimestamp: new Date(nowMs - 24 * 3600_000 - 1).toISOString(), sourceType: "INDOOR_SENSOR" as const, nowUtc: nowIso },
        { value: 25, unit: "µg/m³", observationTimestamp: new Date(nowMs + 60_001).toISOString(), sourceType: "INDOOR_SENSOR" as const, nowUtc: nowIso },
        { value: Number.NaN, unit: "µg/m³", observationTimestamp: "bad", sourceType: "INDOOR_SENSOR" as const, nowUtc: nowIso },
      ]) {
        const res = calculateIndoorAirImpact({
          roomLengthMeters: 4,
          roomWidthMeters: 5,
          roomHeightMeters: 3,
          indoorSensorReading: badReading,
        });
        expect(res.indoorPm25Basis).toBe("Unavailable");
        expect(res.measuredIndoorPm25).toBeNull();
        expect(res.sensorStatusNote).toContain("Unavailable:");
        expect(res.summary).toContain("indoor PM2.5 unmeasured");
      }

      // Invalid dimensions and invalid CADR throw RangeError with exact contract message
      expect(() =>
        calculateIndoorAirImpact({ roomLengthMeters: 0, roomWidthMeters: 5, roomHeightMeters: 3 })
      ).toThrow(RangeError);
      for (const badCadr of [0, -100, Number.NaN]) {
        expect(() =>
          calculateIndoorAirImpact({
            roomLengthMeters: 4,
            roomWidthMeters: 5,
            roomHeightMeters: 3,
            purifierCadrM3H: badCadr,
          })
        ).toThrow("Purifier CADR (m³/h) must be a positive finite number when provided.");
      }
    });
  });

  describe("Sustainable Alternatives, Privacy Isolation & RecommendationsPanel", () => {
    it("enforces complete contract assertions across severe, poor, moderate, zero, null, and invalid AQI inputs", () => {
      const severe = generateSustainableAlternatives({ aqi: 301, hasTransitAccess: true });
      expect(severe).toHaveLength(2);

      const bundlePlan = severe[0]!;
      expect(bundlePlan.primaryActionId).toBe("alt-errand-bundling");
      expect(bundlePlan.impactType).toBe("BOTH");
      expect(bundlePlan.basis).toBe("Qualitative");
      expect(bundlePlan.whySuggested).toContain("reduces both ambient traffic exposure");

      const [optMidday, optCarpool, optDelivery] = bundlePlan.realisticAlternatives;
      expect(optMidday?.id).toBe("opt-bundle-midday");
      expect(optMidday?.title).toBe("Bundle errands into one midday trip");
      expect(optMidday?.description).toContain("12:00-15:00");
      expect(optMidday?.impactType).toBe("BOTH");
      expect(optMidday?.basis).toBe("Qualitative");
      expect(optMidday?.assumptions).toContain("flexible daytime scheduling");
      expect(optMidday?.uncertainty).toContain("local meteorology");

      expect(optCarpool?.id).toBe("opt-carpool");
      expect(optCarpool?.title).toBe("Share a ride / carpool with neighbours");
      expect(optCarpool?.description).toContain("1/N");
      expect(optCarpool?.impactType).toBe("EMISSIONS_REDUCTION");
      expect(optCarpool?.basis).toBe("Estimated");
      expect(optCarpool?.assumptions).toContain("kg CO2, not CO2e");
      expect(optCarpool?.uncertainty).toContain("+/-30%");

      expect(optDelivery?.id).toBe("opt-delivery-consolidate");
      expect(optDelivery?.title).toBe("Consolidate local deliveries");
      expect(optDelivery?.description).toContain("last-mile two-wheeler");
      expect(optDelivery?.impactType).toBe("EMISSIONS_REDUCTION");
      expect(optDelivery?.basis).toBe("Qualitative");
      expect(optDelivery?.assumptions).toContain("existing route dispatches");
      expect(optDelivery?.uncertainty).toContain("carrier consolidation");

      const commutePlan = severe[1]!;
      expect(commutePlan.primaryActionId).toBe("alt-commute-exposure");
      expect(commutePlan.impactType).toBe("EXPOSURE_REDUCTION");
      expect(commutePlan.basis).toBe("Estimated");
      expect(commutePlan.whySuggested).toContain("walking or cycling along busy corridors");

      const sideStreet = commutePlan.realisticAlternatives.find((a) => a.id === "opt-side-street");
      expect(sideStreet?.title).toBe("Shift to quieter side-streets or off-peak hours");
      expect(sideStreet?.description).toContain("peak-hour arterial roads");
      expect(sideStreet?.impactType).toBe("EXPOSURE_REDUCTION");
      expect(sideStreet?.basis).toBe("Qualitative");
      expect(sideStreet?.assumptions).toContain("typically lower than arterial kerbsides");
      expect(sideStreet?.uncertainty).toContain("street-canyon plumes");

      const transit = commutePlan.realisticAlternatives.find((a) => a.id === "opt-metro-bus");
      expect(transit?.title).toBe("Use intracity bus / enclosed Metro where verified");
      expect(transit?.description).toContain("0.015161 kg CO2/pax-km");
      expect(transit?.description).not.toContain("CO2e");
      expect(transit?.impactType).toBe("BOTH");
      expect(transit?.basis).toBe("Qualitative");
      expect(transit?.assumptions).toContain("Metro requires city electricity intensity");
      expect(transit?.uncertainty).toContain("do not measurably alter citywide AQI");

      const noIdle = commutePlan.realisticAlternatives.find((a) => a.id === "opt-no-idling");
      expect(noIdle?.title).toBe("Switch off engine at signals > 30 seconds");
      expect(noIdle?.description).toContain("stationary idling exhaust");
      expect(noIdle?.impactType).toBe("EMISSIONS_REDUCTION");
      expect(noIdle?.basis).toBe("Qualitative");
      expect(noIdle?.assumptions).toContain("without automatic start-stop");
      expect(noIdle?.uncertainty).toContain("idle duration");

      const poorNotSevere = generateSustainableAlternatives({ aqi: 201, hasTransitAccess: false });
      expect(poorNotSevere[0]?.whySuggested).toContain("reduces both ambient traffic exposure");
      expect(poorNotSevere[1]?.basis).toBe("Qualitative");
      expect(poorNotSevere[1]?.whySuggested).toContain("Choosing lower-traffic routes or off-peak windows");

      const modEdge = generateSustainableAlternatives({ aqi: 200, hasTransitAccess: false });
      expect(modEdge[0]?.whySuggested).toContain("reduces avoidable vehicle trips");
      expect(modEdge[1]?.realisticAlternatives.map((a) => a.id)).toEqual([
        "opt-side-street",
        "opt-no-idling",
      ]);

      const zeroAqi = generateSustainableAlternatives({ aqi: 0, hasTransitAccess: false });
      expect(zeroAqi[0]?.whySuggested).toContain("reduces avoidable vehicle trips");
      expect(zeroAqi[1]?.basis).toBe("Qualitative");

      const nullAqi = generateSustainableAlternatives({ aqi: null, hasTransitAccess: false });
      expect(nullAqi[0]?.whySuggested).toContain("reduces avoidable vehicle trips");
      expect(nullAqi[1]?.basis).toBe("Qualitative");

      for (const badAqi of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => generateSustainableAlternatives({ aqi: badAqi })).toThrow(
          "AQI must be null or a non-negative finite number."
        );
      }
    });

    it("enforces guest ephemeral sessionStorage and rejects unauthenticated household profile access", async () => {
      const store = new Map<string, string>();
      vi.stubGlobal("window", {
        sessionStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => { store.set(k, v); },
          removeItem: (k: string) => { store.delete(k); },
        },
      });
      saveGuestContext({ householdContext: { city: "Kolkata" } });
      expect(getGuestContext()?.householdContext).toEqual({ city: "Kolkata" });
      clearGuestContext();
      expect(getGuestContext()).toBeNull();

      const { GET } = await import("@/app/api/v1/profile/route");
      const unauthReq = new NextRequest("http://localhost:3000/api/v1/profile?uid=victim_uid", {
        method: "GET",
      });
      const res = await GET(unauthReq);
      expect(res.status).toBe(401);
    });

    it("exposes assumptions, CO2 unit boundaries, and cycles alternatives cleanly on click", () => {
      expect(formatActionImpactTag("COMMUTE_TIMING")).toContain("Exposure + CO2");
      expect(formatActionImpactTag("AIR_CLEANING")).toContain("Calculated ACH (Sensor Measured only if valid)");
      expect(formatActionImpactTag("VENTILATION_WINDOW")).toContain("Ambient Proxy");

      const sampleRecs = [
        {
          actionId: "rec-1",
          category: "COMMUTE_TIMING" as const,
          urgency: "IMMEDIATE" as const,
          actionSummary: "Shift commute past morning inversion",
          reasoning: "Reduces peak PM2.5 exposure.",
          implementationMethod: "Travel after 10:30 IST.",
          expectedExposureReduction: "Estimated lower ambient proxy",
          applicableConstraintsOrLimits: "Subject to school/work hours",
          evidenceReferences: [
            {
              evidenceId: "EVID-1",
              source: "OpenAQ",
              measuredValue: "210 µg/m³",
              timestamp: "2026-11-26T12:00:00Z",
            },
          ],
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(RecommendationsPanel, {
          language: "en-IN",
          recommendations: sampleRecs,
          aiExplanation: null,
          isAqiUnavailable: true,
        })
      );
      expect(html).toContain("Assumptions &amp; Uncertainty:");
      expect(html).toContain("NOT personal inhaled dose");
      expect(html).toContain("exclude non-CO2 GHGs");

      let clickHandler: (() => void) | undefined;
      const hookStates = new Map<number, unknown>();
      let hookIdx = 0;
      const internals = (
        React as unknown as {
          __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
        }
      ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      const origH = internals?.H;
      const renderTree = () => {
        hookIdx = 0;
        return (RecommendationsPanel as unknown as (props: Record<string, unknown>) => React.ReactNode)({
          language: "en-IN",
          recommendations: sampleRecs,
          aiExplanation: null,
        });
      };
      if (internals) {
        internals.H = {
          useState: <T,>(init: T | (() => T)) => {
            const idx = hookIdx++;
            if (!hookStates.has(idx)) {
              hookStates.set(idx, typeof init === "function" ? (init as () => T)() : init);
            }
            const setState = (updater: T | ((prev: T) => T)) => {
              const prev = hookStates.get(idx) as T;
              hookStates.set(idx, typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater);
            };
            return [hookStates.get(idx) as T, setState];
          },
          useMemo: <T,>(fn: () => T) => fn(),
          useCallback: <T,>(fn: T) => fn,
          useEffect: () => {},
          useRef: <T,>(v: T) => ({ current: v }),
        };
      }
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        const el = node as { type?: unknown; props?: Record<string, unknown> };
        if (el.type === "button" && typeof el.props?.onClick === "function") {
          clickHandler = el.props.onClick as () => void;
        }
        const ch = el.props?.children;
        if (Array.isArray(ch)) ch.forEach(walk);
        else if (ch) walk(ch);
      };
      try {
        walk(renderTree());
        clickHandler?.();
        const afterFirstClick = JSON.stringify(renderTree());
        expect(afterFirstClick).toContain("Selected alternative:");
        expect(afterFirstClick).toContain("Swap alternative");
        clickHandler?.();
        const afterSecondClick = JSON.stringify(renderTree());
        expect(afterSecondClick).toContain("Shift to quieter side-streets");
      } finally {
        if (internals) internals.H = origH;
      }
    });
  });
});
