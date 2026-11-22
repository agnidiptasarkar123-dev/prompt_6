// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { checkRunningWindowSufficiency } from "@/domain/cpcb/running-window";

describe("CPCB Running-Window Sufficiency (16h & 6h Rules)", () => {
  it("rejects 24-hr window when valid hours are 15 (<16 statutory requirement)", () => {
    const res15 = checkRunningWindowSufficiency("PM2.5", 15);
    expect(res15.isSufficient).toBe(false);
    expect(res15.requiredHours).toBe(16);
    expect(res15.windowHours).toBe(24);
    expect(res15.regulatoryStatus).toBe("STATUTORY_CPCB_2014");
    expect(res15.dataAvailabilityRatio).toBeCloseTo(15 / 24, 3);
  });

  it("accepts 24-hr window exactly at statutory threshold of 16 hours", () => {
    const res16 = checkRunningWindowSufficiency("PM2.5", 16);
    expect(res16.isSufficient).toBe(true);
    expect(res16.requiredHours).toBe(16);
    expect(res16.windowHours).toBe(24);
    expect(res16.dataAvailabilityRatio).toBeCloseTo(16 / 24, 3);
  });

  it("accepts 24-hr window with complete 24 hours of valid readings", () => {
    const res24 = checkRunningWindowSufficiency("PM10", 24);
    expect(res24.isSufficient).toBe(true);
    expect(res24.dataAvailabilityRatio).toBe(1.0);
  });

  it("rejects 8-hr window when valid hours are 5 (<6 adapted secondary requirement)", () => {
    const res5 = checkRunningWindowSufficiency("CO", 5);
    expect(res5.isSufficient).toBe(false);
    expect(res5.requiredHours).toBe(6);
    expect(res5.windowHours).toBe(8);
    expect(res5.regulatoryStatus).toBe("SECONDARY_75_PERCENT_CRITERION");
  });

  it("accepts 8-hr window exactly at 6 hours for CO", () => {
    const res6 = checkRunningWindowSufficiency("CO", 6);
    expect(res6.isSufficient).toBe(true);
    expect(res6.requiredHours).toBe(6);
    expect(res6.windowHours).toBe(8);
    expect(res6.dataAvailabilityRatio).toBe(0.75);
  });

  it("accepts 8-hr window at 6 hours for standard baseline Ozone (O3)", () => {
    const resO3 = checkRunningWindowSufficiency("O3", 6);
    expect(resO3.isSufficient).toBe(true);
    expect(resO3.windowHours).toBe(8);
  });

  it("rejects 1-hr acute peak ozone window when valid hours are 0", () => {
    const res0 = checkRunningWindowSufficiency("O3", 0, 1);
    expect(res0.isSufficient).toBe(false);
    expect(res0.requiredHours).toBe(1);
    expect(res0.windowHours).toBe(1);
    expect(res0.regulatoryStatus).toBe("ACUTE_1_HOUR_PEAK");
  });

  it("accepts 1-hr acute peak ozone window when valid hours is 1", () => {
    const res1 = checkRunningWindowSufficiency("O3", 1, 1);
    expect(res1.isSufficient).toBe(true);
    expect(res1.requiredHours).toBe(1);
    expect(res1.windowHours).toBe(1);
    expect(res1.dataAvailabilityRatio).toBe(1.0);
  });

  it("clamps negative valid hours to dataAvailabilityRatio of 0", () => {
    const resNegative = checkRunningWindowSufficiency("PM2.5", -5);
    expect(resNegative.dataAvailabilityRatio).toBe(0);
    expect(resNegative.isSufficient).toBe(false);
  });

  it("clamps valid hours exceeding window length to dataAvailabilityRatio of 1.0", () => {
    const resOverflow = checkRunningWindowSufficiency("PM2.5", 30);
    expect(resOverflow.dataAvailabilityRatio).toBe(1.0);
    expect(resOverflow.isSufficient).toBe(true);
  });
});
