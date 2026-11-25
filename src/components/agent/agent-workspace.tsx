// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { Bot, Play, Wrench, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { AgentStructuredResponse } from "@/services/ai/agent-orchestrator";

export interface AgentWorkspaceProps {
  readonly language: SupportedLanguage;
  readonly selectedStation: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
}

const QUICK_AGENT_TASKS = [
  "Size a True HEPA air purifier (CADR & ACH) for my room",
  "Should I open windows for indoor ventilation right now?",
  "Find and compare nearby CPCB stations with full pollutants",
  "Compare 48-hour CAMS forecast trend vs current observations",
  "Build a safe daily outdoor & commute plan for today",
  "Explain how HawaSaathi smart alert thresholds and quiet hours work"
] as const;

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({
  language,
  selectedStation,
  calculatedAqi,
  observations,
  forecast
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [prompt, setPrompt] = useState("");
  const [roomLength, setRoomLength] = useState("5");
  const [roomWidth, setRoomWidth] = useState("4");
  const [roomHeight, setRoomHeight] = useState("2.8");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentStructuredResponse | null>(null);

  const runTask = async (taskPrompt: string) => {
    const clean = taskPrompt.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setPrompt(clean);

    try {
      const res = await fetch("/api/v1/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: clean,
          language,
          stationId: selectedStation?.id,
          station: selectedStation,
          calculatedAqi,
          observations,
          forecast,
          coordinates: selectedStation
            ? { latitude: selectedStation.latitude, longitude: selectedStation.longitude }
            : undefined,
          roomDimensions: {
            length: Math.max(1, Math.min(50, parseFloat(roomLength) || 5)),
            width: Math.max(1, Math.min(50, parseFloat(roomWidth) || 4)),
            height: Math.max(1.5, Math.min(15, parseFloat(roomHeight) || 2.8))
          },
          hasCloudConsent: false
        })
      });

      const json = await res.json();
      if (!res.ok || json.status === "ERROR") {
        setError(json.message || "Agent execution failed.");
      } else {
        setResult(json.data as AgentStructuredResponse);
      }
    } catch {
      setError("Network error while executing agent task.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runTask(prompt);
  };

  return (
    <section
      aria-labelledby="agent-workspace-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--hs-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="agent-workspace-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.agentTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">{v2.agentSubtitle}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hs-accent)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--hs-accent)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Typed Tool Registry • Audited Execution
        </span>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {QUICK_AGENT_TASKS.map((task) => (
          <button
            key={task}
            type="button"
            disabled={loading}
            onClick={() => void runTask(task)}
            className="flex items-center justify-between rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--hs-text-primary)] transition hover:border-[var(--hs-accent)] disabled:opacity-50"
          >
            <span>{task}</span>
            <Play className="h-3.5 w-3.5 shrink-0 text-[var(--hs-accent)]" />
          </button>
        ))}
      </div>

      {/* Custom Task Form + Optional Room Sizing Inputs */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a goal (e.g., Calculate CADR for 5x4m bedroom or check safe commute hours)..."
            aria-label="Agent task prompt"
            className="flex-1 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--hs-accent)] px-4 py-2 text-xs font-bold text-[var(--hs-accent-text)] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{loading ? "Running Tools..." : v2.agentRunTask}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
          <div>
            <label htmlFor="agent-len" className="text-[var(--hs-text-secondary)]">Room Length (m)</label>
            <input
              id="agent-len"
              type="number"
              step="0.5"
              value={roomLength}
              onChange={(e) => setRoomLength(e.target.value)}
              className="mt-0.5 w-full rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2 py-1 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="agent-wid" className="text-[var(--hs-text-secondary)]">Room Width (m)</label>
            <input
              id="agent-wid"
              type="number"
              step="0.5"
              value={roomWidth}
              onChange={(e) => setRoomWidth(e.target.value)}
              className="mt-0.5 w-full rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2 py-1 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="agent-ht" className="text-[var(--hs-text-secondary)]">Ceiling Height (m)</label>
            <input
              id="agent-ht"
              type="number"
              step="0.2"
              value={roomHeight}
              onChange={(e) => setRoomHeight(e.target.value)}
              className="mt-0.5 w-full rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2 py-1 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
        </div>
      </form>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-[var(--hs-accent)]/35 bg-[var(--hs-subtle-bg)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-[var(--hs-accent)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--hs-accent-text)]">
              {result.taskType}
            </span>
            <span className="rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--hs-text-secondary)]">
              Data Class: {result.dataDistinction}
            </span>
          </div>

          <p className="text-sm font-bold text-[var(--hs-text-primary)] leading-relaxed">{result.directAnswer}</p>

          {result.verifiedFacts.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hs-text-secondary)]">Verified Facts</p>
              {result.verifiedFacts.map((fact, idx) => (
                <p key={idx} className="text-xs text-[var(--hs-text-primary)] flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--hs-accent)] mt-0.5" />
                  <span>{fact}</span>
                </p>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--hs-text-secondary)] leading-relaxed">{result.explanation}</p>
          <p className="text-xs font-semibold text-[var(--hs-accent)]">Recommended Step: {result.suggestedAction}</p>
          <p className="text-[11px] text-[var(--hs-text-secondary)]">
            <strong>Confidence &amp; Limitation:</strong> {result.confidenceOrLimitation}
          </p>

          {/* Tool Trace Inspector */}
          {result.toolTraces.length > 0 && (
            <div className="border-t border-[var(--hs-border-subtle)] pt-3">
              <p className="text-[11px] font-bold text-[var(--hs-text-secondary)] flex items-center gap-1.5 mb-2">
                <Wrench className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                <span>Auditable Tool Execution Trace</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {result.toolTraces.map((tr, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-[10px] font-mono text-[var(--hs-text-primary)]"
                  >
                    {tr.toolName} • {tr.status} • {tr.dataClassification} ({tr.source})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hs-border-subtle)] pt-3">
            <button
              type="button"
              onClick={() => void runTask(result.followUpPrompt)}
              className="text-xs font-semibold text-[var(--hs-accent)] hover:underline"
            >
              Follow-up: {result.followUpPrompt}
            </button>
            <span className="text-[10px] text-[var(--hs-text-secondary)]">
              Sources: {result.sources.join(" • ")}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
