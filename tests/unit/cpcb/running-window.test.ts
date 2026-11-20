import { describe, it, expect } from "vitest";
import { checkRunningWindowSufficiency } from "@/domain/cpcb/running-window";

describe("CPCB Running-Window Sufficiency (16h & 6h Rules)", () => {
  it("enforces 16-hour minimum for 24-hr running averages", () => {
    // 15 hours is insufficient (62.5% < 67%)
    const res15 = checkRunningWindowSufficiency("PM2.5", 15);
    expect(res15.isSufficient).toBe(false);
    expect(res15.requiredHours).toBe(16);
    expect(res15.windowHours).toBe(24);

    // 16 hours is sufficient (66.7% >= 67%)
    const res16 = checkRunningWindowSufficiency("PM2.5", 16);
    expect(res16.isSufficient).toBe(true);

    // 24 hours is sufficient (100%)
    const res24 = checkRunningWindowSufficiency("PM10", 24);
    expect(res24.isSufficient).toBe(true);
    expect(res24.dataAvailabilityRatio).toBe(1.0);
  });

  it("enforces 6-hour minimum for 8-hr running averages (CO & O3)", () => {
    // 5 hours is insufficient (62.5% < 75%)
    const res5 = checkRunningWindowSufficiency("CO", 5);
    expect(res5.isSufficient).toBe(false);
    expect(res5.requiredHours).toBe(6);
    expect(res5.windowHours).toBe(8);

    // 6 hours is sufficient (75%)
    const res6 = checkRunningWindowSufficiency("CO", 6);
    expect(res6.isSufficient).toBe(true);

    // Ozone (O3)
    const resO3 = checkRunningWindowSufficiency("O3", 6);
    expect(resO3.isSufficient).toBe(true);
  });
});
