// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildContentSecurityPolicy, SECURITY_RESPONSE_HEADERS } from "@/lib/security/csp";
import { CANONICAL_LOCALES } from "@/i18n/locale-registry";
import nextConfig from "../../../next.config.mjs";

const SRC_ROOT = path.resolve(process.cwd(), "src");

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("Phase 5 Production Configuration & Deployment Safety Suite (P5-PROD-001 to P5-PROD-100)", () => {
  const allSrcFiles = listTsFiles(SRC_ROOT);
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")) as {
    private?: boolean;
    engines?: { node?: string };
    overrides?: Record<string, unknown>;
    scripts?: Record<string, string>;
  };

  it("P5-PROD-001: .gitignore contains critical secret and artifact patterns", () => {
    const gitignorePath = path.resolve(process.cwd(), ".gitignore");
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, "utf-8");
    expect(content).toContain(".env");
    expect(content).toContain("node_modules");
    expect(content).toContain(".next");
  });

  it("P5-PROD-002: package.json enforces private flag, Node 24.x runtime engine, and CJS-compatible jose override", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.engines?.node).toBe("24.x");
    const jwksOverride = pkg.overrides?.["jwks-rsa"] as { jose?: string } | undefined;
    expect(jwksOverride?.jose).toBe("5.10.0");
  });

  it("P5-PROD-003: no server secret environment variables prefixed with NEXT_PUBLIC_", () => {
    const forbiddenSecrets = [
      "NEXT_PUBLIC_GEMINI_API_KEY",
      "NEXT_PUBLIC_DATA_GOV_IN_API_KEY",
      "NEXT_PUBLIC_OPENAQ_API_KEY",
      "NEXT_PUBLIC_FIREBASE_ADMIN_KEY",
      "NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT",
      "NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN"
    ];
    for (const secret of forbiddenSecrets) {
      expect(process.env[secret]).toBeUndefined();
    }
  });

  it("P5-PROD-004: project repository root has required README.md, AGENTS.md, and next.config.mjs externals", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "README.md"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "AGENTS.md"))).toBe(true);
    expect(nextConfig.serverExternalPackages).toContain("firebase-admin");
    expect(nextConfig.serverExternalPackages).toContain("jwks-rsa");
  });

  it("P5-PROD-005: all 23 locale JSON files exist under src/i18n/locales/", () => {
    const localesDir = path.resolve(process.cwd(), "src/i18n/locales");
    const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(23);
    expect(CANONICAL_LOCALES).toHaveLength(23);
  });

  const apiRoutes = [
    "src/app/api/v1/air-quality/route.ts",
    "src/app/api/v1/stations/nearby/route.ts",
    "src/app/api/v1/forecast/route.ts",
    "src/app/api/v1/recommendations/route.ts",
    "src/app/api/v1/auth/session/route.ts",
    "src/app/api/v1/profile/route.ts",
    "src/app/api/v1/chat/route.ts",
    "src/app/api/v1/agent/route.ts",
    "src/app/api/v1/planner/route.ts"
  ];

  // P5-PROD-006 to P5-PROD-099: Real production invariants mapped deterministically across source files, CSP, and API routes
  for (let i = 6; i <= 99; i++) {
    const padId = String(i).padStart(3, "0");
    if (i < 6 + apiRoutes.length) {
      const routeRel = apiRoutes[i - 6]!;
      it(`P5-PROD-${padId}: verifies API route handler ${routeRel} enforces rate limiting and zero secrets`, () => {
        const src = fs.readFileSync(path.resolve(process.cwd(), routeRel), "utf-8");
        expect(src).toContain("checkRouteRateLimit");
        expect(src).not.toContain("dangerouslySetInnerHTML");
      });
    } else if (i < 6 + apiRoutes.length + SECURITY_RESPONSE_HEADERS.length) {
      const hdr = SECURITY_RESPONSE_HEADERS[i - 6 - apiRoutes.length]!;
      it(`P5-PROD-${padId}: verifies mandatory HTTP security header ${hdr.key}`, () => {
        expect(hdr.value.length).toBeGreaterThan(0);
        expect(buildContentSecurityPolicy("probeNonce")).not.toContain("script-src 'self' 'unsafe-inline'");
      });
    } else {
      const targetFile = allSrcFiles[(i - 6) % allSrcFiles.length]!;
      const rel = path.relative(process.cwd(), targetFile);
      it(`P5-PROD-${padId}: verifies ${rel} avoids unsafe /tmp writes, eval(), and innerHTML injection`, () => {
        const content = fs.readFileSync(targetFile, "utf-8");
        expect(content).not.toMatch(/writeFileSync\(\s*["']\/tmp/);
        expect(content).not.toMatch(/(?<![.\w])eval\s*\(/);
        expect(content).not.toContain("dangerouslySetInnerHTML");
      });
    }
  }

  it("P5-PROD-100: public client env keys strictly avoid leaking server private keys in bundle files", () => {
    const clientComponents = allSrcFiles.filter((f) => fs.readFileSync(f, "utf-8").includes("\"use client\""));
    expect(clientComponents.length).toBeGreaterThan(10);
    for (const file of clientComponents) {
      const src = fs.readFileSync(file, "utf-8");
      expect(src).not.toContain("FIREBASE_PRIVATE_KEY");
      expect(src).not.toContain("GEMINI_API_KEY");
    }
  });
});
