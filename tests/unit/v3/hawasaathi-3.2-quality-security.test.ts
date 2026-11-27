// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { z } from "zod";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";

import { GET as getAirQuality } from "@/app/api/v1/air-quality/route";
import { POST as postSession, DELETE as deleteSession } from "@/app/api/v1/auth/session/route";
import { GET as getProfile, PUT as putProfile, DELETE as deleteProfile } from "@/app/api/v1/profile/route";
import { POST as postRecommendations } from "@/app/api/v1/recommendations/route";
import { GET as getNearbyStations } from "@/app/api/v1/stations/nearby/route";
import { globalFirebaseAuth } from "@/lib/firebase/admin";
import { globalProfileRepository } from "@/services/profiles/profile-repository";
import { globalRateLimiter } from "@/services/rate-limit/rate-limiter";
import { successResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { compactForecastForRequest, compactObservationsForRequest } from "@/lib/http/compact-payload";
import { fetchJsonWithTimeout } from "@/lib/http/upstream-fetch";
import { verifySameOriginRequest, parseValidatedJsonBody } from "@/lib/http/request-guards";
import { POST as postAgent } from "@/app/api/v1/agent/route";
import { POST as postChat } from "@/app/api/v1/chat/route";
import { LearningCentre } from "@/components/learn/learning-centre";
import { StationComparison } from "@/components/stations/station-comparison";
import { CpcbClient } from "@/services/providers/cpcb/cpcb-client";
import { generateLearningAgentReply } from "@/services/ai/learning-agent-service";
import { useModalOrchestration } from "@/hooks/use-modal-orchestration";
import { buildRecommendationEvaluationContext } from "@/services/recommendations/recommendation-context-builder";
import { getBrowserLocalStorage, readValidatedJsonStorage } from "@/lib/storage/safe-storage";
import { DialogFocusTrap } from "@/components/shared/dialog-focus-trap";
import { usePlannerAndAlerts } from "@/hooks/use-planner-and-alerts";
import { useHouseholdAndRecommendations } from "@/hooks/use-household-and-recommendations";
import { THEME_PALETTES } from "@/theme/tokens";
import { StationPanel } from "@/components/stations/station-panel";
import { StationMap } from "@/components/maps/station-map";

describe("HawaSaathi 3.2 Cycle 1-3 — HTTP Hardening, Dialog Focus Trap, Safe Storage & Resource Cleanup", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.fetch = origFetch;
  });

  it("uses cryptographic requestId format across API responses", () => {
    const res1 = successResponse({ data: { ok: true } });
    const res2 = successResponse({ data: { ok: true } });
    const id1 = res1.headers.get("X-Request-Id") ?? "";
    const id2 = res2.headers.get("X-Request-Id") ?? "";
    expect(id1).toMatch(/^req_[0-9a-f]{8}$/);
    expect(id1).not.toBe(id2);
  });

  it("blocks oversized payloads via Content-Length and raw body limit, while ignoring non-numeric Content-Length", async () => {
    const reqHeader = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "9999999"
      },
      body: JSON.stringify({ overallAqi: 120 })
    });
    const res1 = await postRecommendations(reqHeader);
    expect(res1.status).toBe(413);
    expect((await res1.json()).errorCode).toBe("PAYLOAD_TOO_LARGE");

    const hugeFiller = "a".repeat(300_000);
    const reqActual = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallAqi: 120, note: hugeFiller })
    });
    const res2 = await postRecommendations(reqActual);
    expect(res2.status).toBe(413);
    expect((await res2.json()).errorCode).toBe("PAYLOAD_TOO_LARGE");

    const reqInvalidLen = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "not-a-number"
      },
      body: JSON.stringify({ overallAqi: null })
    });
    const res3 = await postRecommendations(reqInvalidLen);
    expect(res3.status).toBe(200);
  });

  it("rejects invalid prominentPollutant identifiers and supports empty custom routine safely", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overallAqi: 140,
        prominentPollutant: "FAKE_POLLUTANT_<script>"
      })
    });
    const res = await postRecommendations(req);
    expect(res.status).toBe(400);
    expect((await res.json()).errorCode).toBe("SCHEMA_VALIDATION_ERROR");

    const ctx = buildRecommendationEvaluationContext({
      overallAqi: 140,
      aqiCategory: null,
      prominentPollutant: "PM2.5",
      routine: [],
      language: "en"
    });
    expect(ctx.householdContext.members[0]?.id).toBeDefined();
    expect(ctx.effectiveCategory).toBe("MODERATE");
  });

  it("enforces same-origin CSRF and rate limiting on auth/session DELETE, profile PUT, and profile DELETE", async () => {
    expect(
      verifySameOriginRequest(
        new NextRequest("http://localhost:3000/api/v1/profile", {
          method: "PUT",
          headers: { origin: "not a url", host: "localhost:3000" }
        })
      )?.status
    ).toBe(403);

    expect(
      verifySameOriginRequest(
        new NextRequest("http://localhost:3000/api/v1/profile", {
          method: "PUT",
          headers: { origin: "http://localhost:3000", host: "localhost:3000" }
        })
      )
    ).toBeNull();

    const delSessionCross = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "DELETE",
      headers: { origin: "https://evil.example", host: "localhost:3000" }
    });
    expect((await deleteSession(delSessionCross)).status).toBe(403);

    const delSessionSame = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "DELETE",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" }
    });
    const delRes = await deleteSession(delSessionSame);
    expect(delRes.status).toBe(200);
    const clearedCookie = delRes.cookies.get("hs_session");
    expect(clearedCookie?.httpOnly).toBe(true);
    expect(clearedCookie?.sameSite).toBe("lax");
    expect(clearedCookie?.maxAge).toBe(0);

    vi.spyOn(globalRateLimiter, "checkLimit").mockResolvedValueOnce({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetSeconds: 60,
      isDistributed: false
    });
    expect((await deleteSession(delSessionSame)).status).toBe(429);

    const putCross = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "PUT",
      headers: { origin: "https://evil.example", host: "localhost:3000" },
      body: JSON.stringify({})
    });
    expect((await putProfile(putCross)).status).toBe(403);

    const delProfileCross = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "DELETE",
      headers: { origin: "https://evil.example", host: "localhost:3000" }
    });
    expect((await deleteProfile(delProfileCross)).status).toBe(403);
  });

  it("sanitizes Content-Disposition export filename including all-symbol UID fallback", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(true);
    vi.spyOn(globalFirebaseAuth, "verifySessionCookie")
      .mockResolvedValueOnce({
        uid: '../../etc/passwd"\r\nX-Inject: 1',
        email: "user@example.com"
      } as unknown as DecodedIdToken)
      .mockResolvedValueOnce({
        uid: "!!!///...",
        email: "user@example.com"
      } as unknown as DecodedIdToken);
    vi.spyOn(globalProfileRepository, "getProfile").mockResolvedValue({
      uid: "safe-id",
      createdAt: "2026-11-26T00:00:00Z",
      updatedAt: "2026-11-26T00:00:00Z",
      preferences: { language: "en", theme: "light", cloudPersistenceConsent: false },
      savedPlaces: [],
      alertRules: {
        severityThreshold: "POOR",
        hysteresisEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        notifyOnStaleData: true,
        notifyOnStationUnavailable: false,
        notifyOnForecastExceedance: true
      }
    } as never);

    const req1 = new NextRequest("http://localhost:3000/api/v1/profile?export=json");
    req1.cookies.set("hs_session", "valid_tok");
    const res1 = await getProfile(req1);
    expect(res1.status).toBe(200);
    expect(res1.headers.get("Content-Disposition")).toBe(
      'attachment; filename="hawasaathi-profile-etcpasswdX-Inject1.json"'
    );

    const req2 = new NextRequest("http://localhost:3000/api/v1/profile?export=json");
    req2.cookies.set("hs_session", "valid_tok");
    const res2 = await getProfile(req2);
    expect(res2.status).toBe(200);
    expect(res2.headers.get("Content-Disposition")).toBe(
      'attachment; filename="hawasaathi-profile-user.json"'
    );
  });

  it("rejects overly long query parameters in air-quality and stations/nearby routes", async () => {
    const longId = "s".repeat(121);
    const resAq = await getAirQuality(
      new NextRequest(`http://localhost:3000/api/v1/air-quality?stationId=${longId}`)
    );
    expect(resAq.status).toBe(400);

    const longQuery = "q".repeat(101);
    const resNearby = await getNearbyStations(
      new NextRequest(`http://localhost:3000/api/v1/stations/nearby?lat=22.57&lon=88.36&query=${longQuery}`)
    );
    expect(resNearby.status).toBe(400);
  });

  it("enforces redirect:error and fallback error paths inside shared upstream fetch helper", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch: redirect"));
    global.fetch = mockFetch;
    await expect(
      fetchJsonWithTimeout({
        url: "https://api.example.com/data",
        timeoutMs: 1000,
        errorPrefix: "Test",
        parse: (x) => x
      })
    ).rejects.toThrow("Failed to fetch: redirect");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({ redirect: "error" })
    );
  });

  it("covers auth/session POST with oversized payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "x".repeat(20_000) })
    });
    const res = await postSession(req);
    expect(res.status).toBe(413);
  });

  it("validates safe-storage helper across window missing, failed guard, and valid reads", () => {
    const origWin = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    expect(getBrowserLocalStorage()).toBeUndefined();

    const fakeStorage = {
      getItem: (k: string) => (k === "bad" ? '{"x":1}' : '{"ok":true}')
    };
    const isOk = (v: unknown): v is { ok: boolean } =>
      typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true;
    expect(readValidatedJsonStorage(fakeStorage, "bad", isOk)).toBeNull();
    expect(readValidatedJsonStorage(fakeStorage, "good", isOk)).toEqual({ ok: true });
    if (origWin !== undefined) {
      (globalThis as { window?: unknown }).window = origWin;
    }
  });

  it("exercises DialogFocusTrap initial focus, Tab wrapping, Shift+Tab wrapping, 0-focusables fallback, and Escape dismissal", () => {
    vi.useFakeTimers();
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const origH = internals.H;
    const origDoc = globalThis.document;

    let cleanups: Array<() => void> = [];
    const listeners = new Map<string, (ev: KeyboardEvent) => void>();
    const containerFocus = vi.fn();
    const firstFocus = vi.fn();
    const lastFocus = vi.fn();
    const firstBtn = {
      getAttribute: () => null,
      focus: firstFocus
    } as unknown as HTMLElement;
    const hiddenEl = {
      getAttribute: () => "true",
      focus: vi.fn()
    } as unknown as HTMLElement;
    const middleBtn = {
      getAttribute: () => null,
      focus: vi.fn()
    } as unknown as HTMLElement;
    const lastBtn = {
      getAttribute: () => null,
      focus: lastFocus
    } as unknown as HTMLElement;

    let focusablesList: HTMLElement[] = [firstBtn, hiddenEl, middleBtn, lastBtn];
    let activeEl: HTMLElement | null = lastBtn;
    let querySelectorResult: HTMLElement | null = lastBtn;

    const fakeDialog = {
      focus: containerFocus,
      contains: (node: Node | null) => node === firstBtn || node === middleBtn || node === lastBtn,
      querySelector: () => querySelectorResult,
      querySelectorAll: () => focusablesList
    } as unknown as HTMLElement;

    (globalThis as { document: unknown }).document = {
      get activeElement() {
        return activeEl;
      },
      addEventListener: (type: string, fn: (ev: KeyboardEvent) => void) => listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type)
    };

    const refBox = { current: { closest: () => fakeDialog } };
    internals.H = {
      useRef: () => refBox,
      useEffect: (fn: () => void | (() => void)) => {
        const ret = fn();
        if (typeof ret === "function") cleanups.push(ret);
      }
    };

    try {
      const onClose = vi.fn();
      renderTrapWithSelector(onClose, "input");
      vi.advanceTimersByTime(10);
      expect(lastFocus).toHaveBeenCalledTimes(1);

      const keydown = listeners.get("keydown")!;
      // Ignore non-Tab/Escape key
      const noopPrevent = vi.fn();
      keydown({ key: "Enter", preventDefault: noopPrevent } as unknown as KeyboardEvent);
      expect(noopPrevent).not.toHaveBeenCalled();

      // Forward Tab on middleBtn does NOT prevent default or wrap
      activeEl = middleBtn;
      const midTabPrevent = vi.fn();
      keydown({ key: "Tab", shiftKey: false, preventDefault: midTabPrevent } as unknown as KeyboardEvent);
      expect(midTabPrevent).not.toHaveBeenCalled();

      // Backward Shift+Tab on middleBtn does NOT prevent default or wrap
      keydown({ key: "Tab", shiftKey: true, preventDefault: midTabPrevent } as unknown as KeyboardEvent);
      expect(midTabPrevent).not.toHaveBeenCalled();

      // Forward Tab at last -> wraps to first
      activeEl = lastBtn;
      keydown({ key: "Tab", shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(firstFocus).toHaveBeenCalledTimes(1);

      // Backward Shift+Tab at first -> wraps to last
      activeEl = firstBtn;
      keydown({ key: "Tab", shiftKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(lastFocus).toHaveBeenCalledTimes(2);

      // Focus outside container -> forward Tab wraps to first, Shift+Tab wraps to last
      activeEl = null;
      keydown({ key: "Tab", shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(firstFocus).toHaveBeenCalledTimes(2);
      keydown({ key: "Tab", shiftKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(lastFocus).toHaveBeenCalledTimes(3);

      // 0 focusables fallback focuses container both on keydown AND initial timer
      focusablesList = [];
      querySelectorResult = null;
      keydown({ key: "Tab", shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(containerFocus).toHaveBeenCalledTimes(1);

      cleanups.forEach((c) => c());
      cleanups = [];
      renderTrapWithSelector(onClose);
      vi.advanceTimersByTime(10);
      expect(containerFocus).toHaveBeenCalledTimes(2);

      // Escape calls onClose
      listeners.get("keydown")?.({ key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Run second pass with focusables and no initialFocusSelector
      cleanups.forEach((c) => c());
      cleanups = [];
      focusablesList = [firstBtn, lastBtn];
      activeEl = firstBtn;
      renderTrapWithSelector(onClose);
      vi.advanceTimersByTime(10);
      expect(firstFocus).toHaveBeenCalledTimes(3);

      // Simulate missing dialog container
      refBox.current = { closest: () => null as unknown as HTMLElement };
      cleanups.forEach((c) => c());
      cleanups = [];
      renderTrapWithSelector(onClose);
      vi.advanceTimersByTime(10);
      listeners.get("keydown")?.({ key: "Tab", preventDefault: vi.fn() } as unknown as KeyboardEvent);
      cleanups.forEach((c) => c());

      // Static SSR check
      internals.H = origH;
      const html = renderToStaticMarkup(React.createElement(DialogFocusTrap, { onClose }));
      expect(html).toContain('aria-hidden="true"');
    } finally {
      internals.H = origH;
      (globalThis as { document: unknown }).document = origDoc;
    }
  });

  it("covers usePlannerAndAlerts malformed localStorage recovery & useHouseholdAndRecommendations export URL cleanup", async () => {
    vi.useFakeTimers();
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const origH = internals.H;
    const origWin = (globalThis as { window?: unknown }).window;
    const origDoc = (globalThis as { document?: unknown }).document;
    const origCreateObjectUrl = URL.createObjectURL;
    const origRevokeObjectUrl = URL.revokeObjectURL;

    let hookIdx = 0;
    const states = new Map<number, unknown>();
    internals.H = {
      useState: (init: unknown) => {
        const id = hookIdx++;
        if (!states.has(id)) states.set(id, typeof init === "function" ? (init as () => unknown)() : init);
        return [states.get(id), (v: unknown) => states.set(id, typeof v === "function" ? (v as (p: unknown) => unknown)(states.get(id)) : v)];
      },
      useEffect: (fn: () => void) => fn(),
      useMemo: (fn: () => unknown) => fn(),
      useCallback: (fn: unknown) => fn
    };

    const badLocalStorage = {
      getItem: (k: string) =>
        k === "hs_alert_preferences"
          ? '{"severityThreshold":"POOR","hysteresisEnabled":"not_bool"}'
          : '[{"no_id":true}]',
      setItem: vi.fn()
    };
    const revokeSpy = vi.fn();
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-profile-url");
    URL.revokeObjectURL = revokeSpy;
    (globalThis as { window: unknown }).window = {
      localStorage: badLocalStorage,
      sessionStorage: { getItem: () => null, setItem: vi.fn() },
      confirm: () => true
    };
    (globalThis as { document: unknown }).document = {
      createElement: () => ({ href: "", download: "", click: vi.fn() })
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "SUCCESS", data: { uid: "u1" } })
    }) as unknown as typeof fetch;

    try {
      hookIdx = 0;
      const plannerRes = usePlannerAndAlerts({
        loadingAirQuality: true,
        selectedStation: null,
        calculatedAqi: null,
        aqiStatus: "AQI_UNAVAILABLE",
        observations: [],
        forecast: []
      });
      expect(plannerRes.plannerActivities).toEqual([]);

      hookIdx = 0;
      states.clear();
      const hhRes = useHouseholdAndRecommendations({
        language: "en",
        themeMode: "light",
        calculatedAqi: null,
        verifiedAqiCategory: null,
        observations: [],
        loadingAirQuality: true,
        setLanguage: vi.fn(),
        handleThemeChange: vi.fn(),
        setAiExplanation: vi.fn(),
        onAccountDeletedCloseAuth: vi.fn()
      });
      await hhRes.handleExportData();
      vi.advanceTimersByTime(1000);
      expect(revokeSpy).toHaveBeenCalledWith("blob:mock-profile-url");
    } finally {
      internals.H = origH;
      (globalThis as { window: unknown }).window = origWin;
      (globalThis as { document: unknown }).document = origDoc;
      URL.createObjectURL = origCreateObjectUrl;
      URL.revokeObjectURL = origRevokeObjectUrl;
    }
  });

  it("enforces WCAG AA light amber token contrast and h2 section heading hierarchy on StationPanel and StationMap", () => {
    expect(THEME_PALETTES.light.accentAmber).toBe("#7F4D08");

    const panelHtml = renderToStaticMarkup(
      React.createElement(StationPanel, {
        language: "en-IN",
        stations: [],
        selectedStationId: null,
        onSelectStation: vi.fn(),
        onOpenProvenance: vi.fn()
      })
    );
    expect(panelHtml).toContain('<h2 id="stations-heading"');
    expect(panelHtml).not.toContain('<h3 id="stations-heading"');

    const mapHtml = renderToStaticMarkup(
      React.createElement(StationMap, {
        language: "en-IN",
        center: { latitude: 22.5726, longitude: 88.3639 },
        stations: [],
        selectedStationId: null,
        onSelectStation: vi.fn()
      })
    );
    expect(mapHtml).toContain('<h2 id="map-heading"');
    expect(mapHtml).not.toContain('<h3 id="map-heading"');

    const compHtml = renderToStaticMarkup(
      React.createElement(StationComparison, {
        language: "en-IN",
        stations: [
          {
            id: "s1",
            name: "Station One",
            city: "Kolkata",
            state: "WB",
            latitude: 22.5,
            longitude: 88.3,
            providerId: "CPCB_CAAQMS",
            availablePollutants: ["PM2.5", "PM10", "NO2"],
            lastReportedAt: null,
            license: "CC-BY-4.0",
            attribution: "CPCB",
            distanceKm: 1.2
          }
        ],
        selectedStationId: "s1",
        onSelectStation: vi.fn()
      })
    );
    expect(compHtml).toContain("bg-emerald-700 text-white");
    expect(compHtml).not.toContain("bg-emerald-600 text-white");

    const learnHtml = renderToStaticMarkup(
      React.createElement(LearningCentre, { language: "en" })
    );
    expect(learnHtml).not.toMatch(/bg-\[var\(--hs-accent-violet\)\][^"]*text-white/);
  });

  it("enforces streaming byte limits without Content-Length, handles empty/boundary payloads, and enforces strict CSRF on agent/chat", async () => {
    const schema = z.object({ msg: z.string() });
    const encoder = new TextEncoder();

    // 1. Streaming body exceeding limit WITHOUT Content-Length must abort before full buffering
    const oversizedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"msg":"' + "a".repeat(200)));
        controller.enqueue(encoder.encode("b".repeat(200) + '"}'));
        controller.close();
      }
    });
    const streamReq = new Request("https://hawasaathi.in/api/v1/chat", {
      method: "POST",
      body: oversizedStream,
      duplex: "half"
    } as RequestInit);
    const streamRes = await parseValidatedJsonBody(streamReq, schema, { maxBytes: 120 });
    expect(streamRes.ok).toBe(false);
    if (!streamRes.ok) {
      expect(streamRes.response.status).toBe(413);
    }

    // 2. Boundary exact size passes cleanly
    const exactPayload = '{"msg":"ok"}';
    const exactStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(exactPayload));
        controller.close();
      }
    });
    const exactReq = new Request("https://hawasaathi.in/api/v1/chat", {
      method: "POST",
      body: exactStream,
      duplex: "half"
    } as RequestInit);
    const exactRes = await parseValidatedJsonBody(exactReq, schema, { maxBytes: exactPayload.length });
    expect(exactRes).toEqual({ ok: true, data: { msg: "ok" } });

    // 3. Empty whitespace body returns 400 INVALID_JSON
    const emptyReq = new Request("https://hawasaathi.in/api/v1/chat", { method: "POST", body: "   " });
    const emptyRes = await parseValidatedJsonBody(emptyReq, schema);
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) expect(emptyRes.response.status).toBe(400);

    // 4. CSRF Fetch Metadata (Sec-Fetch-Site), cross-scheme HTTPS downgrade, malformed URL host, x-forwarded-host, agent/chat routes
    const secFetchReq = new Request("https://hawasaathi.in/api/v1/profile", {
      method: "PUT",
      headers: { "sec-fetch-site": "cross-site" }
    });
    expect(verifySameOriginRequest(secFetchReq)?.status).toBe(403);

    const schemeDowngradeReq = new Request("https://hawasaathi.in/api/v1/profile", {
      method: "PUT",
      headers: {
        origin: "http://hawasaathi.in",
        host: "hawasaathi.in",
        "x-forwarded-proto": "https"
      }
    });
    expect(verifySameOriginRequest(schemeDowngradeReq)?.status).toBe(403);

    const badProtocolOrigin = new Request("https://hawasaathi.in/api/v1/profile", {
      method: "PUT",
      headers: { origin: "ftp://hawasaathi.in", host: "hawasaathi.in" }
    });
    expect(verifySameOriginRequest(badProtocolOrigin)?.status).toBe(403);

    const forwardedMatchReq = new Request("http://internal:3000/api/v1/profile", {
      method: "PUT",
      headers: {
        origin: "https://hawasaathi.in",
        "x-forwarded-host": "hawasaathi.in",
        "x-forwarded-proto": "https"
      }
    });
    expect(verifySameOriginRequest(forwardedMatchReq)).toBeNull();

    const noHostMockReq = {
      url: "not-a-valid-url",
      headers: new Headers({ origin: "https://evil.example" })
    } as unknown as Request;
    expect(verifySameOriginRequest(noHostMockReq)?.status).toBe(403);

    vi.spyOn(globalRateLimiter, "checkLimit").mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetSeconds: 60,
      isDistributed: true
    });
    const agentCsrf = await postAgent(
      new NextRequest("https://hawasaathi.in/api/v1/agent", {
        method: "POST",
        headers: { host: "hawasaathi.in", origin: "https://evil.example" },
        body: JSON.stringify({ prompt: "hello" })
      })
    );
    expect(agentCsrf.status).toBe(403);

    const chatCsrf = await postChat(
      new NextRequest("https://hawasaathi.in/api/v1/chat", {
        method: "POST",
        headers: { host: "hawasaathi.in", origin: "https://evil.example" },
        body: JSON.stringify({ message: "hello" })
      })
    );
    expect(chatCsrf.status).toBe(403);
  });

  it("blocks SSRF credentials/protocols/private IPs/untrusted hosts and bounds upstream response size", async () => {
    const parse = (x: unknown) => x;

    await expect(
      fetchJsonWithTimeout({ url: "https://user:pass@api.openaq.org/v3/locations", timeoutMs: 1000, errorPrefix: "Test", parse })
    ).rejects.toThrow(/credentials/i);

    await expect(
      fetchJsonWithTimeout({ url: "http://api.openaq.org/v3/locations", timeoutMs: 1000, errorPrefix: "Test", parse })
    ).rejects.toThrow(/protocol/i);

    for (const ssrfUrl of [
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.1/secret",
      "https://172.16.0.5/secret",
      "https://192.168.1.1/admin",
      "https://127.0.0.1/metrics",
      "https://[::1]/",
      "https://metadata.local/"
    ]) {
      await expect(
        fetchJsonWithTimeout({ url: ssrfUrl, timeoutMs: 1000, errorPrefix: "Test", parse })
      ).rejects.toThrow(/blocked/i);
    }

    await expect(
      fetchJsonWithTimeout({
        url: "https://evil.example/data",
        allowedHosts: ["api.openaq.org"],
        timeoutMs: 1000,
        errorPrefix: "Test",
        parse
      })
    ).rejects.toThrow(/Untrusted upstream host blocked/i);

    // Strips secret query string on HTTP error when displayUrl omitted
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers()
    } as unknown as Response);
    await expect(
      fetchJsonWithTimeout({
        url: "https://api.data.gov.in/resource/test?api-key=SUPERSECRET",
        timeoutMs: 1000,
        errorPrefix: "CPCB",
        parse
      })
    ).rejects.toThrow("CPCB upstream error: HTTP 500 from https://api.data.gov.in/resource/test");

    // Enforces content-length ceiling before streaming body
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "99999" })
    } as unknown as Response);
    await expect(
      fetchJsonWithTimeout({
        url: "https://api.openaq.org/v3/locations",
        maxResponseBytes: 1024,
        timeoutMs: 1000,
        errorPrefix: "OpenAQ",
        parse
      })
    ).rejects.toThrow(/exceeded maximum size/i);

    // Enforces streaming ceiling when content-length missing, plus normal streaming JSON parse
    const enc = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: new ReadableStream({
        start(c) {
          c.enqueue(enc.encode('{"big":"' + "x".repeat(500) + '"}'));
          c.close();
        }
      })
    } as unknown as Response);
    await expect(
      fetchJsonWithTimeout({
        url: "https://api.openaq.org/v3/locations",
        maxResponseBytes: 64,
        timeoutMs: 1000,
        errorPrefix: "OpenAQ",
        parse
      })
    ).rejects.toThrow(/exceeded maximum size/i);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: new ReadableStream({
        start(c) {
          c.enqueue(enc.encode('{"ok":42}'));
          c.close();
        }
      })
    } as unknown as Response);
    const okStream = await fetchJsonWithTimeout({
      url: "https://api.openaq.org/v3/locations",
      maxResponseBytes: 1024,
      timeoutMs: 1000,
      errorPrefix: "OpenAQ",
      parse
    });
    expect(okStream).toEqual({ ok: 42 });
  });

  it("handles DialogFocusTrap nested stacks, landmark inertness restoration, hidden/inert filtering, and trigger focus restore", async () => {
    vi.useFakeTimers();
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const origH = internals.H;
    const origDoc = globalThis.document;
    const origGetComputedStyle = globalThis.getComputedStyle;

    const cleanups: Array<() => void> = [];
    const keyListeners: Array<(ev: KeyboardEvent) => void> = [];

    const triggerFocus = vi.fn();
    const triggerBtn = { focus: triggerFocus, isConnected: true } as unknown as HTMLElement;

    const mainAttrs = new Map<string, string>([["aria-hidden", "false"]]);
    const headerAttrs = new Map<string, string>([["inert", ""]]);
    const mainLandmark = {
      contains: () => false,
      getAttribute: (k: string) => mainAttrs.get(k) ?? null,
      setAttribute: (k: string, v: string) => mainAttrs.set(k, v),
      removeAttribute: (k: string) => mainAttrs.delete(k),
      hasAttribute: (k: string) => mainAttrs.has(k)
    };
    const headerLandmark = {
      contains: () => false,
      getAttribute: (k: string) => headerAttrs.get(k) ?? null,
      setAttribute: (k: string, v: string) => headerAttrs.set(k, v),
      removeAttribute: (k: string) => headerAttrs.delete(k),
      hasAttribute: (k: string) => headerAttrs.has(k)
    };

    const hiddenDisplayBtn = {
      getAttribute: () => null,
      hasAttribute: () => false,
      closest: () => null,
      focus: vi.fn()
    } as unknown as HTMLElement;
    const inertBtn = {
      getAttribute: () => null,
      hasAttribute: (k: string) => k === "inert",
      closest: () => null,
      focus: vi.fn()
    } as unknown as HTMLElement;
    const insideHiddenAncestor = {
      getAttribute: () => null,
      hasAttribute: () => false,
      closest: () => ({}),
      focus: vi.fn()
    } as unknown as HTMLElement;
    const outerFocus = vi.fn();
    const outerBtn = {
      getAttribute: () => null,
      hasAttribute: () => false,
      closest: () => null,
      focus: outerFocus
    } as unknown as HTMLElement;
    const innerFocus = vi.fn();
    const innerBtn = {
      getAttribute: () => null,
      hasAttribute: () => false,
      closest: () => null,
      focus: innerFocus
    } as unknown as HTMLElement;

    const outerDialog = {
      focus: vi.fn(),
      contains: (n: Node | null) => n === outerBtn,
      querySelector: () => null,
      querySelectorAll: () => [hiddenDisplayBtn, inertBtn, insideHiddenAncestor, outerBtn]
    } as unknown as HTMLElement;
    const innerDialog = {
      focus: vi.fn(),
      contains: (n: Node | null) => n === innerBtn,
      querySelector: () => null,
      querySelectorAll: () => [innerBtn]
    } as unknown as HTMLElement;

    let currentContainer = outerDialog;
    (globalThis as { getComputedStyle: unknown }).getComputedStyle = (el: unknown) => {
      if (el === hiddenDisplayBtn) return { display: "none", visibility: "visible" };
      if (el === inertBtn) throw new Error("mock error");
      return { display: "block", visibility: "visible" };
    };

    (globalThis as { document: unknown }).document = {
      activeElement: triggerBtn,
      querySelectorAll: () => [mainLandmark, headerLandmark],
      addEventListener: (_: string, fn: (ev: KeyboardEvent) => void) => keyListeners.push(fn),
      removeEventListener: vi.fn()
    };

    internals.H = {
      useRef: () => ({ current: { closest: () => currentContainer } }),
      useEffect: (fn: () => void | (() => void)) => {
        const c = fn();
        if (typeof c === "function") cleanups.push(c);
      }
    };

    try {
      const onCloseOuter = vi.fn();
      const onCloseInner = vi.fn();
      renderTrapWithSelector(onCloseOuter);
      expect(mainAttrs.get("aria-hidden")).toBe("true");
      expect(mainAttrs.has("inert")).toBe(true);

      // Push nested dialog
      currentContainer = innerDialog;
      renderTrapWithSelector(onCloseInner);
      vi.advanceTimersByTime(0);
      expect(innerFocus).toHaveBeenCalled();

      // Escape hits ONLY topmost inner dialog
      for (const listener of keyListeners) {
        listener({ key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent);
      }
      expect(onCloseInner).toHaveBeenCalledTimes(1);
      expect(onCloseOuter).not.toHaveBeenCalled();

      // Unmount inner dialog (landmarks remain inert because outer dialog is still active)
      cleanups.pop()?.();
      expect(mainAttrs.has("inert")).toBe(true);

      // Unmount outer dialog (landmarks and prior trigger focus restored)
      cleanups.pop()?.();
      expect(mainAttrs.get("aria-hidden")).toBe("false");
      expect(mainAttrs.has("inert")).toBe(false);
      expect(headerAttrs.has("aria-hidden")).toBe(false);
      expect(headerAttrs.has("inert")).toBe(true);
      expect(triggerFocus).toHaveBeenCalled();

      // Custom CpcbClient baseUrl + HTTP cross-scheme + body-less fallback + stream cancel rejection branches
      const customCpcb = new CpcbClient({ apiKey: "k", baseUrl: "https://custom.cpcb.example" });
      expect(customCpcb.isConfigured()).toBe(true);

      const httpCrossScheme = new Request("http://hawasaathi.in/api/v1/profile", {
        method: "PUT",
        headers: { origin: "https://hawasaathi.in", host: "hawasaathi.in" }
      });
      expect(verifySameOriginRequest(httpCrossScheme)?.status).toBe(403);

      const relativeUrlReq = {
        url: "/api/v1/profile",
        headers: new Headers({ origin: "https://hawasaathi.in", host: "hawasaathi.in" })
      } as unknown as Request;
      expect(verifySameOriginRequest(relativeUrlReq)).toBeNull();

      const enc2 = new TextEncoder();
      const schema2 = z.object({ ok: z.boolean() });
      const bodyLessTooLarge = {
        headers: new Headers(),
        body: null,
        text: async () => "x".repeat(200)
      } as unknown as Request;
      const bodyLessRes = await parseValidatedJsonBody(bodyLessTooLarge, schema2, { maxBytes: 50 });
      expect(bodyLessRes.ok).toBe(false);

      const bodyLessValid = {
        headers: new Headers(),
        body: null,
        text: async () => '{"ok":true}'
      } as unknown as Request;
      expect(await parseValidatedJsonBody(bodyLessValid, schema2, { maxBytes: 50 })).toEqual({ ok: true, data: { ok: true } });

      const cancelRejectStream = {
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: async () => ({ done: false, value: enc2.encode("x".repeat(100)) }),
            cancel: async () => { throw new Error("cancel err"); },
            releaseLock: () => {}
          })
        }
      } as unknown as Request;
      const cancelReqRes = await parseValidatedJsonBody(cancelRejectStream, schema2, { maxBytes: 10 });
      expect(cancelReqRes.ok).toBe(false);

      for (const extraSsrf of [
        "https://[fe80::1]/",
        "https://[fc00::1]/",
        "https://0.0.0.0/",
        "https://[::]/"
      ]) {
        await expect(
          fetchJsonWithTimeout({ url: extraSsrf, timeoutMs: 1000, errorPrefix: "Test", parse: (x) => x })
        ).rejects.toThrow(/blocked/i);
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "10" }),
        json: async () => ({ ipOk: true })
      } as unknown as Response);
      expect(
        await fetchJsonWithTimeout({
          url: "https://8.8.8.8/api",
          maxResponseBytes: 1024,
          timeoutMs: 1000,
          errorPrefix: "PublicIP",
          parse: (x) => x
        })
      ).toEqual({ ipOk: true });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: async () => ({ done: false, value: enc2.encode("x".repeat(100)) }),
            cancel: async () => { throw new Error("upstream cancel err"); },
            releaseLock: () => {}
          })
        }
      } as unknown as Response);
      await expect(
        fetchJsonWithTimeout({
          url: "https://api.openaq.org/v3/locations",
          maxResponseBytes: 10,
          timeoutMs: 1000,
          errorPrefix: "OpenAQ",
          parse: (x) => x
        })
      ).rejects.toThrow(/exceeded maximum size/i);
    } finally {
      internals.H = origH;
      (globalThis as { document: unknown }).document = origDoc;
      (globalThis as { getComputedStyle: unknown }).getComputedStyle = origGetComputedStyle;
    }

    const zeroBudgetReply = await generateLearningAgentReply(
      { topicId: "so2", question: "Explain SO2", timeoutMs: 0 },
      "test-key"
    );
    expect(zeroBudgetReply.isAiGenerated).toBe(false);
  });

  it("blocks IPv4-mapped IPv6, CGNAT, multicast SSRF and spoofed reverse-proxy X-Forwarded-Host headers cleanly", async () => {
    // 1. Mapped IPv6 private/metadata + CGNAT + multicast blocked
    for (const badUrl of [
      "https://[::ffff:127.0.0.1]/metrics",
      "https://[::ffff:169.254.169.254]/latest/meta-data",
      "https://[::ffff:10.0.0.1]/admin",
      "https://100.64.0.1/internal",
      "https://[ff02::1]/"
    ]) {
      await expect(
        fetchJsonWithTimeout({ url: badUrl, timeoutMs: 1000, errorPrefix: "Test", parse: (x) => x })
      ).rejects.toThrow(/blocked/i);
    }

    // 2. Non-private IPv4-mapped IPv6 passes URL filter cleanly
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ok: true })
    } as unknown as Response);
    expect(
      await fetchJsonWithTimeout({
        url: "https://[::ffff:8.8.8.8]/ok",
        timeoutMs: 1000,
        errorPrefix: "PublicMapped",
        parse: (x) => x
      })
    ).toEqual({ ok: true });

    // 3. Spoofed X-Forwarded-Host ignored when public Host is present
    const spoofedForwarded = new Request("https://hawasaathi.in/api/v1/auth/session", {
      method: "POST",
      headers: {
        host: "hawasaathi.in",
        "x-forwarded-host": "evil.attacker",
        origin: "https://evil.attacker"
      }
    });
    expect(verifySameOriginRequest(spoofedForwarded)?.status).toBe(403);

    // 4. Absent Host or localhost internal proxy hop falls back to X-Forwarded-Host cleanly
    const internalHopForwardedOk = new Request("http://localhost:3000/api/v1/profile", {
      method: "PUT",
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "hawasaathi.in",
        "x-forwarded-proto": "https",
        origin: "https://hawasaathi.in"
      }
    });
    expect(verifySameOriginRequest(internalHopForwardedOk)).toBeNull();

    const noHostForwardedOk = new Request("http://internal:3000/api/v1/profile", {
      method: "PUT",
      headers: {
        "x-forwarded-host": "hawasaathi.in",
        "x-forwarded-proto": "https",
        origin: "https://hawasaathi.in"
      }
    });
    expect(verifySameOriginRequest(noHostForwardedOk)).toBeNull();
  });

  it("exercises useModalOrchestration open/close, keyboard shortcuts, onboarding fallback, and focus restoration cleanly", () => {
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const origH = internals.H;
    const origWin = globalThis.window;
    const origDoc = globalThis.document;

    const states = new Map<number, unknown>();
    let idx = 0;
    const effects: Array<() => void | (() => void)> = [];
    const winListeners = new Map<string, (ev: KeyboardEvent) => void>();
    const focusSpy = vi.fn();

    internals.H = {
      useState: (init: unknown) => {
        const id = idx++;
        if (!states.has(id)) states.set(id, typeof init === "function" ? (init as () => unknown)() : init);
        return [
          states.get(id),
          (v: unknown) => {
            const cur = states.get(id);
            states.set(id, typeof v === "function" ? (v as (c: unknown) => unknown)(cur) : v);
          }
        ];
      },
      useEffect: (fn: () => void | (() => void)) => {
        effects.push(fn);
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init })
    };

    const setItemThrows = vi.fn(() => {
      throw new Error("quota");
    });
    (globalThis as { window: unknown }).window = {
      localStorage: {
        getItem: vi.fn(() => {
          throw new Error("denied");
        }),
        setItem: setItemThrows
      },
      addEventListener: (ev: string, fn: (e: KeyboardEvent) => void) => winListeners.set(ev, fn),
      removeEventListener: vi.fn()
    };
    (globalThis as { document: unknown }).document = {
      activeElement: { focus: focusSpy }
    };

    try {
      idx = 0;
      const hook = useModalOrchestration();
      const cleanups = effects.map((f) => f()).filter((c): c is () => void => typeof c === "function");

      hook.openAuthModal();
      hook.openHouseholdModal();
      hook.openProvenanceModal();
      hook.openNotificationCenter();
      hook.openAlertPreferences();
      hook.openAlertPreferencesFromDrawer();
      hook.openCommandPalette();
      hook.openOnboarding();
      hook.toggleMobileNav();
      hook.closeMobileNav();

      const keydown = winListeners.get("keydown");
      expect(keydown).toBeDefined();
      keydown?.({ metaKey: true, key: "k", preventDefault: vi.fn() } as unknown as KeyboardEvent);
      keydown?.({ ctrlKey: true, key: "k", preventDefault: vi.fn() } as unknown as KeyboardEvent);
      keydown?.({ key: "Escape" } as unknown as KeyboardEvent);

      hook.closeAuthModal();
      hook.closeAuthModalOnDelete();
      hook.closeHouseholdModal();
      hook.closeProvenanceModal();
      hook.closeNotificationCenter();
      hook.closeAlertPreferences();
      hook.closeCommandPalette();
      hook.dismissOnboarding();

      expect(setItemThrows).toHaveBeenCalledWith("hs_onboarding_seen", "true");
      expect(focusSpy).toHaveBeenCalled();
      cleanups.forEach((c) => c());
    } finally {
      internals.H = origH;
      (globalThis as { window: unknown }).window = origWin;
      (globalThis as { document: unknown }).document = origDoc;
    }
  });

  it("scopes checkRouteRateLimit keys per route pathname with malformed-URL fallback and bounds client payloads via compact helpers", async () => {
    const spy = vi.spyOn(globalRateLimiter, "checkLimit").mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      resetSeconds: 60,
      isDistributed: false
    });
    try {
      await checkRouteRateLimit(new Request("https://hawasaathi.in/api/v1/agent"), 30, 60);
      await checkRouteRateLimit(new Request("https://hawasaathi.in/api/v1/stations/nearby"), 60, 60);
      await checkRouteRateLimit({ url: "invalid-url", headers: new Headers() } as unknown as Request, 30, 60);

      expect(spy).toHaveBeenNthCalledWith(1, "ip_anonymous:/api/v1/agent", 30, 60);
      expect(spy).toHaveBeenNthCalledWith(2, "ip_anonymous:/api/v1/stations/nearby", 60, 60);
      expect(spy).toHaveBeenNthCalledWith(3, "ip_anonymous:/api", 30, 60);
    } finally {
      spy.mockRestore();
    }

    const hugeObs = Array.from({ length: 80 }, (_, idx) => ({
      id: `obs-${idx}`,
      stationId: "cpcb_test",
      stationName: "Test Station",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5" as const,
      value: 50,
      unit: "µg/m³",
      rawRecord: { hugeNestedBlob: "x".repeat(2000) },
      averagingPeriod: "24h" as const,
      typology: "TYPE_C_RAW_MEASUREMENT" as const,
      observationTime: "2026-11-27T00:00:00.000Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-27T00:00:00.000Z",
      qualityFlag: "VERIFIED" as const,
      license: "GODL-India",
      attribution: "CPCB"
    }));
    const compactedDefault = compactObservationsForRequest(hugeObs);
    expect(compactedDefault).toHaveLength(60);
    expect("rawRecord" in compactedDefault[0]!).toBe(false);
    expect(compactObservationsForRequest(hugeObs, 12)).toHaveLength(12);

    const hugeForecast = Array.from({ length: 120 }, (_, idx) => ({
      id: `fc-${idx}`,
      latitude: 28.6,
      longitude: 77.2,
      modelDomain: "cams_global",
      spatialResolutionKm: 45,
      temporalResolutionHours: 1,
      pollutant: "PM2.5" as const,
      forecastValue: 80,
      unit: "µg/m³",
      validTime: "2026-11-27T01:00:00.000Z",
      issueTime: null,
      retrievalTime: "2026-11-27T00:00:00.000Z",
      typology: "TYPE_D_MODEL_FORECAST" as const,
      license: "CC-BY-4.0",
      attribution: "Open-Meteo CAMS"
    }));
    expect(compactForecastForRequest(hugeForecast)).toHaveLength(96);
    expect(compactForecastForRequest(hugeForecast, 24)).toHaveLength(24);
  });
});

function renderTrapWithSelector(onClose: () => void, initialFocusSelector?: string) {
  return DialogFocusTrap({ onClose, initialFocusSelector });
}
