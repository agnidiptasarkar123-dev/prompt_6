// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BookOpenText,
  Navigation,
  Pencil,
  Bell,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import { compactForecastForRequest, compactObservationsForRequest } from "@/lib/http/compact-payload";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type {
  PlannedActivity,
  PlannerActivityCategory,
  ActivityEnvironment,
  ExposureDiaryEntry
} from "@/schemas/planner.schema";
import { evaluateScheduleDay, timeToMinutes, type DailyScheduleEvaluation } from "@/domain/planner/schedule-planner";
import { CommutePlanner } from "@/components/commute/commute-planner";

export interface DailyPlannerProps {
  readonly language: SupportedLanguage;
  readonly stations: readonly NormalizedStation[];
  readonly selectedStation: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
  readonly activities: readonly PlannedActivity[];
  readonly onUpdateActivities: (next: PlannedActivity[]) => void;
  readonly diaryEntries: readonly ExposureDiaryEntry[];
  readonly onUpdateDiary: (next: ExposureDiaryEntry[]) => void;
}

const CATEGORY_OPTIONS: readonly {
  readonly value: PlannerActivityCategory;
  readonly label: string;
  readonly defaultEnv: ActivityEnvironment;
}[] = [
  { value: "WALKING", label: "Walking", defaultEnv: "OUTDOOR" },
  { value: "RUNNING", label: "Running / Jogging", defaultEnv: "OUTDOOR" },
  { value: "CYCLING", label: "Cycling", defaultEnv: "OUTDOOR" },
  { value: "OUTDOOR_EXERCISE", label: "Outdoor Exercise", defaultEnv: "OUTDOOR" },
  { value: "INDOOR_EXERCISE", label: "Indoor Exercise", defaultEnv: "INDOOR" },
  { value: "SCHOOL_COMMUTE", label: "School Commute", defaultEnv: "TRANSIT" },
  { value: "COLLEGE_COMMUTE", label: "College Commute", defaultEnv: "TRANSIT" },
  { value: "OFFICE_COMMUTE", label: "Office Commute", defaultEnv: "TRANSIT" },
  { value: "SHOPPING", label: "Market / Shopping", defaultEnv: "OUTDOOR" },
  { value: "OUTDOOR_SPORTS", label: "Outdoor Sports", defaultEnv: "OUTDOOR" },
  { value: "INDOOR_WORK", label: "Indoor Study / Work", defaultEnv: "INDOOR" },
  { value: "VENTILATION_WINDOW", label: "Ventilation Window", defaultEnv: "INDOOR" }
];

const PLANNER_TEMPLATES: readonly Omit<PlannedActivity, "id">[] = [
  {
    title: "Morning Walk / Jog",
    category: "WALKING",
    environment: "OUTDOOR",
    startTime: "06:30",
    endTime: "07:15",
    locationName: "Neighbourhood Park",
    notes: "Flexible to move indoors on Poor+ AQI days",
    isFavorite: true,
    reminderEnabled: false
  },
  {
    title: "College / School Commute",
    category: "COLLEGE_COMMUTE",
    environment: "TRANSIT",
    startTime: "08:00",
    endTime: "08:45",
    locationName: "Main Road Corridor",
    notes: "Prefer closed cabin / metro when roadside NO2 spikes",
    isFavorite: false,
    reminderEnabled: true
  },
  {
    title: "Midday Natural Ventilation",
    category: "VENTILATION_WINDOW",
    environment: "INDOOR",
    startTime: "13:00",
    endTime: "13:30",
    locationName: "Home Living Area",
    notes: "Open windows briefly during daytime boundary-layer mixing",
    isFavorite: false,
    reminderEnabled: false
  },
  {
    title: "Evening Cycling",
    category: "CYCLING",
    environment: "OUTDOOR",
    startTime: "17:30",
    endTime: "18:15",
    locationName: "Lakefront / Cycle Track",
    notes: "Check evening rush-hour dispersion",
    isFavorite: false,
    reminderEnabled: false
  }
];

let plannerSeq = 0;
function nextPlannerId(prefix: string): string {
  plannerSeq += 1;
  return `${prefix}-${plannerSeq}`;
}

function getDateKeyOffset(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function parseSuggestedWindow(text: string): { start: string; end: string } | null {
  const match = /(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/.exec(text);
  if (!match || !match[1] || !match[2]) return null;
  if (match[1] >= match[2]) return null;
  return { start: match[1], end: match[2] };
}

export const DailyPlanner: React.FC<DailyPlannerProps> = ({
  language,
  stations,
  selectedStation,
  calculatedAqi,
  observations,
  forecast,
  activities,
  onUpdateActivities,
  diaryEntries,
  onUpdateDiary
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [subTab, setSubTab] = useState<"schedule" | "commute" | "diary">("schedule");
  const [dayOffset, setDayOffset] = useState<0 | 1 | 2>(0);
  const activeDateKey = useMemo(() => getDateKeyOffset(dayOffset), [dayOffset]);
  const todayDateKey = useMemo(() => getDateKeyOffset(0), []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerActivityCategory>("WALKING");
  const [environment, setEnvironment] = useState<ActivityEnvironment>("OUTDOOR");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("07:45");
  const [locationName, setLocationName] = useState(selectedStation?.city || "Local Area");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [serverVerifyLoading, setServerVerifyLoading] = useState(false);
  const [serverVerifyError, setServerVerifyError] = useState<string | null>(null);
  const [serverEvaluation, setServerEvaluation] = useState<DailyScheduleEvaluation | null>(null);

  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryDuration, setDiaryDuration] = useState("30");
  const [diaryEnv, setDiaryEnv] = useState<ActivityEnvironment>("OUTDOOR");
  const [diaryNotes, setDiaryNotes] = useState("");

  const dayActivities = useMemo(() => {
    return activities
      .filter((a) => (a.dateKey ? a.dateKey === activeDateKey : activeDateKey === todayDateKey))
      .slice()
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [activities, activeDateKey, todayDateKey]);

  const localEvaluation = useMemo(
    () =>
      evaluateScheduleDay({
        activities: dayActivities,
        aqiResult: calculatedAqi,
        observations,
        forecast
      }),
    [dayActivities, calculatedAqi, observations, forecast]
  );

  const evaluation = serverEvaluation ?? localEvaluation;

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("WALKING");
    setEnvironment("OUTDOOR");
    setStartTime("07:00");
    setEndTime("07:45");
    setLocationName(selectedStation?.city || "Local Area");
    setReminderEnabled(false);
    setFormError(null);
  };

  const handleCategoryChange = (nextCat: PlannerActivityCategory) => {
    setCategory(nextCat);
    const meta = CATEGORY_OPTIONS.find((c) => c.value === nextCat);
    if (meta) setEnvironment(meta.defaultEnv);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError("Please enter an activity title.");
      return;
    }
    if (startTime >= endTime) {
      setFormError("End time must be after start time.");
      return;
    }
    setFormError(null);
    setServerEvaluation(null);

    if (editingId) {
      onUpdateActivities(
        activities.map((a) =>
          a.id === editingId
            ? {
                ...a,
                dateKey: activeDateKey,
                title: trimmed.slice(0, 80),
                category,
                environment,
                startTime,
                endTime,
                locationName: locationName.trim() || selectedStation?.city || "Local Area",
                reminderEnabled
              }
            : a
        )
      );
      resetForm();
      return;
    }

    const nextItem: PlannedActivity = {
      id: nextPlannerId("act"),
      dateKey: activeDateKey,
      title: trimmed.slice(0, 80),
      category,
      environment,
      startTime,
      endTime,
      locationName: locationName.trim() || selectedStation?.city || "Local Area",
      isFavorite: false,
      reminderEnabled
    };
    onUpdateActivities([...activities, nextItem]);
    resetForm();
  };

  const handleStartEdit = (act: PlannedActivity) => {
    setEditingId(act.id);
    setTitle(act.title);
    setCategory(act.category);
    setEnvironment(act.environment);
    setStartTime(act.startTime);
    setEndTime(act.endTime);
    setLocationName(act.locationName);
    setReminderEnabled(Boolean(act.reminderEnabled));
    setFormError(null);
  };

  const handleReschedule = (id: string, parsed: { start: string; end: string }) => {
    setServerEvaluation(null);
    onUpdateActivities(
      activities.map((a) =>
        a.id === id ? { ...a, startTime: parsed.start, endTime: parsed.end } : a
      )
    );
  };

  const handleApplyTemplate = (tpl: Omit<PlannedActivity, "id">) => {
    setServerEvaluation(null);
    const item: PlannedActivity = {
      ...tpl,
      dateKey: activeDateKey,
      id: nextPlannerId("act")
    };
    onUpdateActivities([...activities, item]);
  };

  const handleToggleFavorite = (id: string) => {
    onUpdateActivities(
      activities.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a))
    );
  };

  const handleToggleReminder = (id: string) => {
    onUpdateActivities(
      activities.map((a) => (a.id === id ? { ...a, reminderEnabled: !a.reminderEnabled } : a))
    );
  };

  const handleDeleteActivity = (id: string) => {
    setServerEvaluation(null);
    if (editingId === id) resetForm();
    onUpdateActivities(activities.filter((a) => a.id !== id));
  };

  const handleVerifyWithServer = async () => {
    setServerVerifyLoading(true);
    setServerVerifyError(null);
    try {
      const res = await fetch("/api/v1/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: dayActivities,
          aqiResult: calculatedAqi,
          observations: compactObservationsForRequest(observations),
          forecast: compactForecastForRequest(forecast)
        })
      });
      const json = await res.json();
      if (!res.ok || json.status === "ERROR") {
        setServerVerifyError(json.message || "Unable to verify plan on server.");
      } else {
        setServerEvaluation(json.data as DailyScheduleEvaluation);
      }
    } catch {
      setServerVerifyError("Network error querying /api/v1/planner.");
    } finally {
      setServerVerifyLoading(false);
    }
  };

  const handleAddDiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryTitle.trim()) return;
    const mins = Math.max(1, Math.min(1440, parseInt(diaryDuration, 10) || 30));
    const entry: ExposureDiaryEntry = {
      id: nextPlannerId("diary"),
      recordedAt: new Date().toISOString(),
      activityTitle: diaryTitle.trim().slice(0, 80),
      durationMinutes: mins,
      environment: diaryEnv,
      locationLabel: selectedStation?.city || "Local Area",
      ambientAqiAtTime: calculatedAqi?.overallAqi ?? null,
      stationUsed: selectedStation?.name ?? null,
      selfReportedNotes: diaryNotes.trim().slice(0, 400) || undefined,
      isUserEntered: true
    };
    onUpdateDiary([entry, ...diaryEntries]);
    setDiaryTitle("");
    setDiaryNotes("");
  };

  const badgeStyle = (suitability: string) => {
    if (suitability === "RECOMMENDED") return "bg-emerald-500/15 text-[var(--hs-accent)] border-emerald-500/35";
    if (suitability === "CAUTION") return "bg-[var(--hs-warm-bg)] text-[var(--hs-accent-amber)] border-[var(--hs-warm-border)]";
    if (suitability === "AVOID_OR_RESCHEDULE") return "bg-rose-500/15 text-[var(--hs-accent-coral)] border-rose-500/35";
    return "bg-[var(--hs-info-bg)] text-[var(--hs-accent-blue)] border-[var(--hs-info-border)]";
  };

  return (
    <section
      aria-labelledby="daily-planner-heading"
      className="space-y-6"
    >
      <div className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--hs-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="daily-planner-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
                {v2.plannerTitle}
              </h2>
              <p className="text-xs text-[var(--hs-text-secondary)]">{v2.plannerSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubTab("schedule")}
              aria-pressed={subTab === "schedule"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "schedule"
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Daily Schedule ({dayActivities.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("commute")}
              aria-pressed={subTab === "commute"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "commute"
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Commute Advisor</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("diary")}
              aria-pressed={subTab === "diary"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "diary"
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
              }`}
            >
              <BookOpenText className="h-3.5 w-3.5" />
              <span>Exposure Journal ({diaryEntries.length})</span>
            </button>
          </div>
        </div>

        {subTab === "schedule" && (
          <div className="mt-5 space-y-6">
            {/* Day Navigation & Server Verification Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Schedule day navigation">
                {([
                  { offset: 0 as const, label: "Today" },
                  { offset: 1 as const, label: "Tomorrow" },
                  { offset: 2 as const, label: "Day +2" }
                ]).map((d) => (
                  <button
                    key={d.offset}
                    type="button"
                    onClick={() => {
                      setDayOffset(d.offset);
                      setServerEvaluation(null);
                    }}
                    aria-pressed={dayOffset === d.offset}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      dayOffset === d.offset
                        ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                        : "border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)]"
                    }`}
                  >
                    {d.label} ({getDateKeyOffset(d.offset)})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--hs-text-secondary)]">
                  Basis: {evaluation.overallConfidence}
                </span>
                {dayActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleVerifyWithServer()}
                    disabled={serverVerifyLoading}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${serverVerifyLoading ? "animate-spin" : ""}`} />
                    <span>{serverVerifyLoading ? "Verifying..." : "Verify Plan"}</span>
                  </button>
                )}
              </div>
            </div>

            {serverVerifyError && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-[var(--hs-accent-coral)]">
                {serverVerifyError}
              </div>
            )}

            {/* Optimal Windows Summary */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hs-accent)]">
                  Best Outdoor Window ({forecast.length > 0 ? "Type D Forecast" : "Diurnal Guidance"})
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--hs-text-primary)]">
                  {evaluation.bestOutdoorWindow}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hs-accent)]">
                  Natural Ventilation Outlook ({calculatedAqi?.overallAqi !== undefined && calculatedAqi?.overallAqi !== null ? "Type B AQI" : "Precautionary"})
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--hs-text-primary)]">
                  {evaluation.bestVentilationWindow}
                </p>
              </div>
            </div>

            {/* Overlap Warnings */}
            {evaluation.conflicts.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-3.5 text-xs text-[var(--hs-accent-amber)] space-y-1"
              >
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Schedule Timing Conflict Detected ({evaluation.conflicts.length})</span>
                </p>
                {evaluation.conflicts.map((c, idx) => (
                  <p key={idx}>• {c.message}</p>
                ))}
              </div>
            )}

            {/* Quick Indian Routine Presets */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hs-text-secondary)] mb-2">
                Quick Add Routine Templates
              </p>
              <div className="flex flex-wrap gap-2">
                {PLANNER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-1 text-xs font-medium text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)] transition"
                  >
                    <Plus className="h-3 w-3 text-[var(--hs-accent)]" />
                    <span>{tpl.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add / Edit Activity Form */}
            <form
              onSubmit={handleSaveActivity}
              className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <label htmlFor="planner-title" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  Activity Title
                </label>
                <input
                  id="planner-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning Walk in Park"
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-category" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  Activity Category
                </label>
                <select
                  id="planner-category"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as PlannerActivityCategory)}
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="planner-env" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  Setting
                </label>
                <select
                  id="planner-env"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as ActivityEnvironment)}
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                >
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="TRANSIT">Commute / Transit</option>
                  <option value="INDOOR">Indoor</option>
                </select>
              </div>

              <div>
                <label htmlFor="planner-location" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  Activity Location
                </label>
                <input
                  id="planner-location"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="City, Park or Station"
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-start" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  Start Time
                </label>
                <input
                  id="planner-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="planner-end" className="block text-[11px] font-semibold text-[var(--hs-text-secondary)] mb-1">
                  End Time
                </label>
                <input
                  id="planner-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  id="planner-reminder"
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--hs-border-subtle)]"
                />
                <label htmlFor="planner-reminder" className="text-xs text-[var(--hs-text-primary)]">
                  Enable reminder alert
                </label>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--hs-accent)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)] hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{editingId ? "Save Changes" : v2.plannerAddActivity}</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)]"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {formError && (
                <p className="sm:col-span-2 lg:col-span-4 text-xs font-medium text-[var(--hs-accent-coral)]">{formError}</p>
              )}
            </form>

            {/* Activity Evaluation Timeline */}
            {dayActivities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--hs-border-subtle)] p-6 text-center text-xs text-[var(--hs-text-secondary)]">
                Your daily plan for {activeDateKey} is currently empty. Add an activity above or pick a quick template.
              </div>
            ) : (
              <div className="space-y-3">
                {dayActivities.map((act) => {
                  const ev = evaluation.evaluations.find((e) => e.activityId === act.id);
                  const durationMin = Math.max(0, timeToMinutes(act.endTime) - timeToMinutes(act.startTime));
                  const parsedWindow = ev?.suggestedRescheduleWindow
                    ? parseSuggestedWindow(ev.suggestedRescheduleWindow)
                    : null;

                  return (
                    <div
                      key={act.id}
                      className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[var(--hs-text-primary)]">{act.title}</span>
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-2 py-0.5 text-[10px] font-mono text-[var(--hs-text-secondary)]">
                            <Clock className="h-3 w-3" />
                            {act.startTime}–{act.endTime} ({durationMin} min)
                          </span>
                          <span className="rounded bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--hs-text-secondary)]">
                            {act.category.replace(/_/g, " ")} • {act.environment}
                          </span>
                          {act.locationName && (
                            <span className="text-[10px] text-[var(--hs-text-secondary)]">
                              @{act.locationName}
                            </span>
                          )}
                          {ev && (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeStyle(ev.suitability)}`}>
                              {ev.suitability.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        {ev && (
                          <>
                            <p className="text-xs text-[var(--hs-text-secondary)] leading-relaxed">{ev.explanation}</p>
                            <p className="text-[10px] text-[var(--hs-text-secondary)]">
                              Basis: {ev.confidenceLabel} ({ev.provenanceBasis.replace(/_/g, " ")})
                            </p>
                          </>
                        )}
                        {ev?.suggestedRescheduleWindow && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="text-[11px] font-medium text-[var(--hs-accent)]">
                              Suggested shift: {ev.suggestedRescheduleWindow}
                            </span>
                            {parsedWindow && (
                              <button
                                type="button"
                                onClick={() => handleReschedule(act.id, parsedWindow)}
                                className="rounded-lg border border-[var(--hs-accent)]/40 bg-[var(--hs-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--hs-accent)] hover:bg-[var(--hs-accent)] hover:text-[var(--hs-accent-text)] transition"
                              >
                                Apply Suggested Window
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(act)}
                          aria-label={`Edit ${act.title}`}
                          className="rounded-lg p-1.5 border border-[var(--hs-border-subtle)] text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReminder(act.id)}
                          aria-label={act.reminderEnabled ? `Disable reminder for ${act.title}` : `Enable reminder for ${act.title}`}
                          className={`rounded-lg p-1.5 border border-[var(--hs-border-subtle)] ${
                            act.reminderEnabled ? "text-[var(--hs-accent)] bg-[var(--hs-accent)]/10" : "text-[var(--hs-text-secondary)]"
                          }`}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(act.id)}
                          aria-label={act.isFavorite ? "Remove favorite" : "Mark favorite"}
                          className={`rounded-lg p-1.5 border border-[var(--hs-border-subtle)] ${
                            act.isFavorite ? "text-[var(--hs-accent-amber)] bg-[var(--hs-warm-bg)]" : "text-[var(--hs-text-secondary)]"
                          }`}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.id)}
                          aria-label={`Delete ${act.title}`}
                          className="rounded-lg p-1.5 border border-[var(--hs-border-subtle)] text-[var(--hs-accent-coral)] hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hs-border-subtle)] pt-3 text-[11px] text-[var(--hs-text-secondary)]">
              <p>
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[var(--hs-accent)]" />
                {evaluation.summaryNote}
              </p>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                Guest plans persist locally on device only.
              </span>
            </div>
          </div>
        )}
      </div>

      {subTab === "commute" && (
        <CommutePlanner
          language={language}
          stations={stations}
          currentAqi={calculatedAqi?.overallAqi ?? null}
          forecast={forecast}
        />
      )}

      {subTab === "diary" && (
        <div className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-4">
          <div className="border-b border-[var(--hs-border-subtle)] pb-3">
            <h3 className="text-sm font-bold text-[var(--hs-text-primary)]">Personal Exposure Journal (User-Entered Log)</h3>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              Track outdoor durations alongside ambient station context at the time of entry. Saved locally unless you choose to clear it.
            </p>
          </div>

          <form onSubmit={handleAddDiaryEntry} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="text"
              value={diaryTitle}
              onChange={(e) => setDiaryTitle(e.target.value)}
              placeholder="Activity logged (e.g., Bus commute)"
              aria-label="Journal activity title"
              className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)] sm:col-span-2"
            />
            <input
              type="number"
              min={1}
              max={1440}
              value={diaryDuration}
              onChange={(e) => setDiaryDuration(e.target.value)}
              aria-label="Duration in minutes"
              className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
            />
            <div className="flex gap-2">
              <select
                value={diaryEnv}
                onChange={(e) => setDiaryEnv(e.target.value as ActivityEnvironment)}
                aria-label="Journal environment"
                className="flex-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2 py-2 text-xs text-[var(--hs-text-primary)]"
              >
                <option value="OUTDOOR">Outdoor</option>
                <option value="TRANSIT">Transit</option>
                <option value="INDOOR">Indoor</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-[var(--hs-accent)] px-3 py-2 text-xs font-bold text-[var(--hs-accent-text)]"
              >
                Log
              </button>
            </div>
            <input
              type="text"
              value={diaryNotes}
              onChange={(e) => setDiaryNotes(e.target.value)}
              placeholder="Optional notes (e.g., Wore N95 mask)"
              aria-label="Journal optional notes"
              className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)] sm:col-span-4"
            />
          </form>

          {diaryEntries.length === 0 ? (
            <p className="text-xs text-[var(--hs-text-secondary)]">No journal entries logged yet.</p>
          ) : (
            <div className="space-y-2">
              {diaryEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[var(--hs-text-primary)]">
                      {entry.activityTitle} • {entry.durationMinutes} min ({entry.environment})
                    </p>
                    <p className="text-[11px] text-[var(--hs-text-secondary)]">
                      Station: {entry.stationUsed || "None"} • Ambient AQI at time:{" "}
                      {entry.ambientAqiAtTime !== null ? entry.ambientAqiAtTime : "Unavailable"}
                    </p>
                    {entry.selfReportedNotes && (
                      <p className="mt-1 text-[11px] italic text-[var(--hs-text-secondary)]">{entry.selfReportedNotes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateDiary(diaryEntries.filter((d) => d.id !== entry.id))}
                    aria-label="Remove journal entry"
                    className="rounded p-1 text-[var(--hs-accent-coral)] hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
