// SPDX-License-Identifier: Apache-2.0
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  readonly failureThreshold?: number; // failures before tripping
  readonly recoveryTimeMs?: number; // time in OPEN before attempting HALF_OPEN
  readonly successThreshold?: number; // consecutive successes in HALF_OPEN to CLOSE
}

export class CircuitBreaker {
  public state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastStateChange: number = Date.now();
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeMs = options.recoveryTimeMs || 15000;
    this.successThreshold = options.successThreshold || 2;
  }

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === "OPEN") {
      if (now - this.lastStateChange >= this.recoveryTimeMs) {
        this.state = "HALF_OPEN";
        this.lastStateChange = now;
        this.successCount = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.lastStateChange = Date.now();
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  public recordFailure(): void {
    const now = Date.now();
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.lastStateChange = now;
    } else if (this.state === "CLOSED") {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
        this.lastStateChange = now;
      }
    }
  }

  public reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }
}
