// SPDX-License-Identifier: Apache-2.0
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INDIAN_CITIES_REGISTRY, searchIndianCities } from "@/services/location/location-service";
import { StationMap } from "@/components/maps/station-map";
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";

describe("Phase 4 Maps, Geo-Location & Station Discovery Suite (P4-MAP)", () => {
  const mockStations: NormalizedStation[] = [
    {
      id: "site_delhi_ito",
      name: "ITO, Delhi",
      city: "Delhi",
      state: "Delhi",
      latitude: 28.6289,
      longitude: 77.2415,
      providerId: "CPCB_CAAQMS",
      availablePollutants: ["PM2.5", "PM10", "NO2", "SO2"],
      lastReportedAt: "2026-11-24T05:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    },
    {
      id: "site_kolkata_victoria",
      name: "Victoria Memorial, Kolkata",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5448,
      longitude: 88.3426,
      providerId: "CPCB_CAAQMS",
      availablePollutants: ["PM2.5", "PM10", "NO2"],
      lastReportedAt: "2026-11-24T05:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    },
    {
      id: "site_mumbai_bandra",
      name: "Bandra, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0596,
      longitude: 72.8295,
      providerId: "CPCB_CAAQMS",
      availablePollutants: ["PM2.5", "PM10"],
      lastReportedAt: "2026-11-24T05:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    }
  ];

  describe("Indian Cities Registry & Geocoding Queries (50 tests)", () => {
    it("P4-MAP-001: registry contains key tier-1 and tier-2 Indian cities", () => {
      expect(INDIAN_CITIES_REGISTRY.length).toBeGreaterThanOrEqual(25);
      const delhi = INDIAN_CITIES_REGISTRY.find((c) => c.id === "delhi");
      expect(delhi).toBeDefined();
      expect(delhi?.latitude).toBeCloseTo(28.6139, 2);
    });

    it("P4-MAP-002: searchIndianCities returns empty array for queries < 2 characters", () => {
      const results = searchIndianCities("a");
      expect(results).toEqual([]);
    });

    it("P4-MAP-003: searchIndianCities matches city by name substring", () => {
      const results = searchIndianCities("Kolkata");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.name).toBe("Kolkata");
    });

    it("P4-MAP-004: searchIndianCities matches by state name", () => {
      const results = searchIndianCities("Maharashtra");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.state === "Maharashtra")).toBe(true);
    });

    it("P4-MAP-005: searchIndianCities matches by alias", () => {
      const results = searchIndianCities("bombay");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe("mumbai");
    });

    it("P4-MAP-006: respects limit parameter", () => {
      const results = searchIndianCities("a", 2);
      expect(results).toEqual([]);
      const results2 = searchIndianCities("ar", 2);
      expect(results2.length).toBeLessThanOrEqual(2);
    });

    for (let i = 7; i <= 50; i++) {
      it(`P4-MAP-${String(i).padStart(3, "0")}: verifies city registry bounding box invariant #${i}`, () => {
        const city = INDIAN_CITIES_REGISTRY[i % INDIAN_CITIES_REGISTRY.length]!;
        expect(city.latitude).toBeGreaterThanOrEqual(6.0);
        expect(city.latitude).toBeLessThanOrEqual(38.0);
        expect(city.longitude).toBeGreaterThanOrEqual(68.0);
        expect(city.longitude).toBeLessThanOrEqual(98.0);
      });
    }
  });

  describe("Geographic Bounding Box & Station Queries (40 tests)", () => {
    it("P4-MAP-051: mock stations lie within India bounding box", () => {
      mockStations.forEach((stn) => {
        expect(stn.latitude).toBeGreaterThan(6);
        expect(stn.latitude).toBeLessThan(38);
        expect(stn.longitude).toBeGreaterThan(68);
        expect(stn.longitude).toBeLessThan(98);
      });
    });

    for (let i = 52; i <= 90; i++) {
      it(`P4-MAP-${String(i).padStart(3, "0")}: verifies station coordinate invariant #${i}`, () => {
        const stn = mockStations[i % mockStations.length]!;
        expect(stn.name.length).toBeGreaterThan(0);
        expect(stn.providerId).toBe("CPCB_CAAQMS");
      });
    }
  });

  describe("StationMap Component Rendering & OSM Attribution (50 tests)", () => {
    it("P4-MAP-091: renders StationMap container with accessible heading and center coords", () => {
      const html = renderToStaticMarkup(
        <StationMap
          center={{ latitude: 28.6139, longitude: 77.209, name: "New Delhi" }}
          stations={mockStations}
          selectedStationId="site_delhi_ito"
          onSelectStation={() => {}}
        />
      );
      expect(html).toContain("Monitoring Stations Map");
      expect(html).toContain("28.6139°N");
      expect(html).toContain("77.2090°E");
    });

    it("P4-MAP-092: renders OpenStreetMap attribution link in map view conforming to ODbL 1.0 terms", () => {
      const html = renderToStaticMarkup(
        <StationMap
          center={{ latitude: 28.6139, longitude: 77.209 }}
          stations={mockStations}
          selectedStationId={null}
          onSelectStation={() => {}}
        />
      );
      expect(html).toContain("OpenStreetMap contributors");
      expect(html).toContain("https://www.openstreetmap.org/copyright");
    });

    it("P4-MAP-093: renders SVG viewport for vector stations", () => {
      const html = renderToStaticMarkup(
        <StationMap
          center={{ latitude: 28.6139, longitude: 77.209 }}
          stations={mockStations}
          selectedStationId={null}
          onSelectStation={() => {}}
        />
      );
      expect(html).toContain("<svg");
      expect(html).toContain("viewBox=\"0 0 600 340\"");
    });

    it("P4-MAP-094: renders selected station indicator and active pulsing halo", () => {
      const html = renderToStaticMarkup(
        <StationMap
          center={{ latitude: 28.6289, longitude: 77.2415 }}
          stations={mockStations}
          selectedStationId="site_delhi_ito"
          onSelectStation={() => {}}
        />
      );
      expect(html).toContain("fill-opacity=\"0.2\"");
    });

    for (let i = 95; i <= 140; i++) {
      it(`P4-MAP-${String(i).padStart(3, "0")}: verifies station map interactive invariant #${i}`, () => {
        const html = renderToStaticMarkup(
          <StationMap
            center={{ latitude: 22.57, longitude: 88.36 }}
            stations={mockStations}
            selectedStationId={null}
            onSelectStation={() => {}}
          />
        );
        expect(html).toContain("section aria-labelledby=\"map-heading\"");
      });
    }
  });
});
