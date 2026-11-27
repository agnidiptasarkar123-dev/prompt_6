// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Wind
} from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import {
  LEARNING_LESSONS,
  getLessonById,
  type DifficultyLevel,
  type LearnCategoryId,
  type LearningLesson
} from "@/domain/learn/learning-curriculum";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { SafeMarkdown } from "@/components/shared/safe-markdown";

export interface LearningCentreProps {
  readonly language: SupportedLanguage;
}

type LearnTab = LearnCategoryId;
type StudyMode = "learn" | "flashcards" | "quiz" | "revision" | "recap";

let tutorSeq = 0;
function nextTutorId(prefix: string): string {
  tutorSeq += 1;
  return `${prefix}-${tutorSeq}`;
}

interface TutorMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly references?: readonly string[];
  readonly isAiGenerated?: boolean;
  readonly policyRefusalApplied?: boolean;
  readonly latencyMs?: number;
}

interface LearnProgressState {
  readonly masteredFlashcards: readonly string[];
  readonly needsReviewFlashcards: readonly string[];
  readonly quizScores: Readonly<Record<string, { score: number; total: number }>>;
}

const PROGRESS_STORAGE_KEY = "hs_learn_progress_v1";

const EMPTY_PROGRESS: LearnProgressState = {
  masteredFlashcards: [],
  needsReviewFlashcards: [],
  quizScores: {}
};

const CPCB_BANDS = [
  { band: "Good (0–50)", impact: "Minimal health impact. Ideal for all outdoor activities and natural ventilation.", color: "bg-emerald-700 text-white" },
  { band: "Satisfactory (51–100)", impact: "Minor breathing discomfort possible for unusually sensitive people.", color: "bg-lime-500 text-slate-900" },
  { band: "Moderate (101–200)", impact: "Discomfort for people with asthma, heart, or lung conditions; children should pace strenuous outdoor sport.", color: "bg-amber-400 text-slate-950" },
  { band: "Poor (201–300)", impact: "Breathing discomfort for most people on prolonged exposure; prefer indoor alternatives.", color: "bg-orange-500 text-slate-950" },
  { band: "Very Poor (301–400)", impact: "Respiratory illness on prolonged exposure; wear N95/FFP2 masks outdoors and keep windows sealed.", color: "bg-red-600 text-white" },
  { band: "Severe (401–500)", impact: "Health impact even on healthy individuals; avoid outdoor exertion and run True HEPA purifiers.", color: "bg-rose-700 text-white" }
] as const;

const DIFFICULTY_META: readonly { id: DifficultyLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" }
];

const STUDY_MODES: readonly { id: StudyMode; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quick Quiz" },
  { id: "revision", label: "Revision" },
  { id: "recap", label: "Topic Recap" }
];

function readSessionProgress(): LearnProgressState {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.sessionStorage?.getItem?.(PROGRESS_STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LearnProgressState>;
    return {
      masteredFlashcards: Array.isArray(parsed.masteredFlashcards) ? parsed.masteredFlashcards : [],
      needsReviewFlashcards: Array.isArray(parsed.needsReviewFlashcards) ? parsed.needsReviewFlashcards : [],
      quizScores: parsed.quizScores && typeof parsed.quizScores === "object" ? parsed.quizScores : {}
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export const LearningCentre: React.FC<LearningCentreProps> = ({ language }) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [tab, setTab] = useState<LearnTab>("pollutants");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [level, setLevel] = useState<DifficultyLevel>("beginner");
  const [studyMode, setStudyMode] = useState<StudyMode>("learn");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [progress, setProgress] = useState<LearnProgressState>(() => readSessionProgress());

  // CADR interactive calculator inputs (deterministic domain helper)
  const [roomLength, setRoomLength] = useState(5);
  const [roomWidth, setRoomWidth] = useState(4);
  const [roomHeight, setRoomHeight] = useState(3);
  const [targetAch, setTargetAch] = useState(4.5);

  // Dedicated educational-only Learning Agent state
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useState<readonly TutorMessage[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const pollutantLessons = useMemo(
    () => LEARNING_LESSONS.filter((l) => l.category === "pollutants"),
    []
  );

  const selectedLesson = useMemo(
    () => (activeLessonId ? getLessonById(activeLessonId) : null),
    [activeLessonId]
  );

  const cadrResult = useMemo(
    () =>
      calculateRoomFiltrationRequirements({
        roomLengthMeters: Math.max(1, roomLength),
        roomWidthMeters: Math.max(1, roomWidth),
        roomHeightMeters: Math.max(2, roomHeight),
        targetAirChangesPerHour: Math.max(1, targetAch)
      }),
    [roomLength, roomWidth, roomHeight, targetAch]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage?.setItem?.(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // sessionStorage blocked in restricted browser contexts
    }
  }, [progress]);

  const openLesson = (lessonId: string, trigger?: HTMLButtonElement | null) => {
    if (trigger) {
      lastTriggerRef.current = trigger;
    }
    setActiveLessonId(lessonId);
    setStudyMode("learn");
    setFlashcardIndex(0);
    setFlashcardRevealed(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setTutorMessages([]);
    setTutorError(null);
    queueMicrotask(() => {
      detailHeadingRef.current?.focus();
    });
  };

  const closeLesson = () => {
    setActiveLessonId(null);
    queueMicrotask(() => {
      lastTriggerRef.current?.focus();
    });
  };

  const markFlashcard = (cardId: string, mastered: boolean) => {
    setProgress((prev) => {
      const masteredSet = new Set(prev.masteredFlashcards);
      const reviewSet = new Set(prev.needsReviewFlashcards);
      if (mastered) {
        masteredSet.add(cardId);
        reviewSet.delete(cardId);
      } else {
        reviewSet.add(cardId);
        masteredSet.delete(cardId);
      }
      return {
        ...prev,
        masteredFlashcards: Array.from(masteredSet),
        needsReviewFlashcards: Array.from(reviewSet)
      };
    });
  };

  const handleSubmitQuiz = (lesson: LearningLesson) => {
    setQuizSubmitted(true);
    let score = 0;
    for (const q of lesson.quiz) {
      if (quizAnswers[q.id] === q.correctIndex) {
        score += 1;
      }
    }
    setProgress((prev) => ({
      ...prev,
      quizScores: {
        ...prev.quizScores,
        [lesson.id]: { score, total: lesson.quiz.length }
      }
    }));
  };

  const askLearningAgent = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!selectedLesson || !trimmed || tutorLoading) return;

    const userMsg: TutorMessage = {
      id: nextTutorId("learn-u"),
      role: "user",
      text: trimmed
    };
    const nextHistory = [...tutorMessages, userMsg].slice(-8);
    setTutorMessages(nextHistory);
    setTutorInput("");
    setTutorError(null);
    setTutorLoading(true);

    try {
      const res = await fetch("/api/v1/learn/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedLesson.id,
          question: trimmed,
          level,
          language,
          recentMessages: tutorMessages.slice(-4).map((m) => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      const payload = (await res.json()) as {
        status?: string;
        message?: string;
        data?: {
          reply: string;
          references?: readonly string[];
          isAiGenerated?: boolean;
          policyRefusalApplied?: boolean;
          timings?: { serverTotalMs?: number };
        };
      };

      if (!res.ok || payload.status !== "SUCCESS" || !payload.data) {
        setTutorError(payload.message ?? "Learning tutor is temporarily unavailable.");
        return;
      }

      const assistantMsg: TutorMessage = {
        id: nextTutorId("learn-a"),
        role: "assistant",
        text: payload.data.reply,
        references: payload.data.references,
        isAiGenerated: payload.data.isAiGenerated,
        policyRefusalApplied: payload.data.policyRefusalApplied,
        latencyMs: payload.data.timings?.serverTotalMs
      };
      setTutorMessages([...nextHistory, assistantMsg].slice(-10));
    } catch {
      setTutorError("Could not reach the educational learning tutor. Please retry.");
    } finally {
      setTutorLoading(false);
    }
  };

  const revisionCards = useMemo(() => {
    if (!selectedLesson) return [];
    const flagged = selectedLesson.flashcards.filter((fc) =>
      progress.needsReviewFlashcards.includes(fc.id)
    );
    return flagged.length > 0 ? flagged : selectedLesson.flashcards;
  }, [selectedLesson, progress.needsReviewFlashcards]);

  return (
    <section
      aria-labelledby="learning-centre-heading"
      className="hs-card rounded-2xl border border-[var(--hs-learn-border)] bg-[var(--hs-surface-bg)] p-6 shadow-sm"
    >
      {/* Header + Category Navigation */}
      <div className="flex flex-col gap-3 border-b border-[var(--hs-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] text-[var(--hs-accent-violet)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="learning-centre-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.learnTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              {v2.learnSubtitle} · {progress.masteredFlashcards.length} flashcards mastered (session-only)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ["pollutants", "8 Pollutants"],
            ["naqi", "CPCB NAQI"],
            ["provenance", "Type A–D Data"],
            ["indoor", "CADR & Ventilation"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setActiveLessonId(null);
              }}
              aria-pressed={tab === key && !selectedLesson}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === key && !selectedLesson
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] shadow-xs"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
          {progress.masteredFlashcards.length > 0 && (
            <button
              type="button"
              onClick={() => setProgress(EMPTY_PROGRESS)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset progress</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Interactive Lesson View */}
      {selectedLesson ? (
        <div className="mt-5 space-y-5" data-testid="learning-lesson-detail">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] p-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={closeLesson}
                data-testid="back-to-learning-centre"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent-violet)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Learning Centre</span>
              </button>
              <h3
                ref={detailHeadingRef}
                tabIndex={-1}
                className="pt-1 text-lg font-extrabold text-[var(--hs-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hs-focus-ring)] rounded"
              >
                {selectedLesson.title}
              </h3>
              <p className="text-xs text-[var(--hs-text-secondary)]">
                Unit: <span className="font-semibold text-[var(--hs-text-primary)]">{selectedLesson.unit}</span> · Window:{" "}
                <span className="font-semibold text-[var(--hs-text-primary)]">{selectedLesson.cpcbWindow}</span>
              </p>
            </div>

            {/* Difficulty Toggle */}
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--hs-accent-violet)]">
                Difficulty Level
              </span>
              <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-1">
                {DIFFICULTY_META.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={level === item.id}
                    onClick={() => setLevel(item.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      level === item.id
                        ? "bg-[var(--hs-accent-violet)] text-[var(--hs-accent-text)]"
                        : "text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Study Mode Sub-tabs */}
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Study mode selector">
            {STUDY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={studyMode === m.id}
                onClick={() => setStudyMode(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  studyMode === m.id
                    ? "bg-[var(--hs-accent-blue)] text-[var(--hs-accent-text)]"
                    : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left 7 cols: Curriculum Content / Flashcards / Quiz / Revision / Recap */}
            <div className="space-y-4 lg:col-span-7">
              {studyMode === "learn" && (
                <div className="space-y-4 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
                  <div>
                    <span className="inline-block rounded-full border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--hs-accent-violet)]">
                      {level.toUpperCase()} EXPLANATION
                    </span>
                    <div className="mt-2 text-sm text-[var(--hs-text-primary)]">
                      <SafeMarkdown content={selectedLesson.levels[level]} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] p-3">
                      <h4 className="text-xs font-bold text-[var(--hs-accent-blue)]">Major Indian Urban Sources</h4>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[var(--hs-text-secondary)]">
                        {selectedLesson.sources.map((src) => (
                          <li key={src}>{src}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-3">
                      <h4 className="text-xs font-bold text-[var(--hs-accent-amber)]">Common Misconception</h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--hs-text-secondary)]">
                        {selectedLesson.misconceptions}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-3 space-y-2 text-xs">
                    <p className="text-[var(--hs-text-secondary)]">
                      <strong className="text-[var(--hs-text-primary)]">Environmental effects:</strong>{" "}
                      {selectedLesson.environmentalEffects}
                    </p>
                    <p className="text-[var(--hs-text-secondary)]">
                      <strong className="text-[var(--hs-text-primary)]">Health &amp; exposure context:</strong>{" "}
                      {selectedLesson.healthImplications}
                    </p>
                    <div className="text-[var(--hs-text-secondary)]">
                      <strong className="text-[var(--hs-text-primary)]">CPCB / Engineering Methodology:</strong>
                      <div className="mt-1">
                        <SafeMarkdown content={selectedLesson.cpcbMethodology} />
                      </div>
                    </div>
                    <p className="text-[var(--hs-text-secondary)]">
                      <strong className="text-[var(--hs-text-primary)]">Practical precautions:</strong>{" "}
                      {selectedLesson.precautions}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--hs-text-primary)]">Worked Examples &amp; Key Terms</h4>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--hs-text-secondary)]">
                      {selectedLesson.examples.map((ex) => (
                        <li key={ex} className="rounded bg-[var(--hs-surface-bg)] px-2.5 py-1.5 border border-[var(--hs-border-subtle)]">
                          {ex}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedLesson.keyTerms.map((kt) => (
                        <div key={kt.term} className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-2.5 text-xs">
                          <div className="font-bold text-[var(--hs-text-primary)]">{kt.term}</div>
                          <div className="mt-0.5 text-[var(--hs-text-secondary)]">{kt.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {studyMode === "flashcards" && (() => {
                const cards = selectedLesson.flashcards;
                const safeIdx = flashcardIndex % cards.length;
                const currentCard = cards[safeIdx]!;
                const isMastered = progress.masteredFlashcards.includes(currentCard.id);
                return (
                  <div className="rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--hs-accent-violet)]">
                      <span>Flashcard {safeIdx + 1} of {cards.length}</span>
                      <span>{isMastered ? "Marked as Got it" : "Active recall"}</span>
                    </div>
                    <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-4">
                      <p className="text-sm font-bold text-[var(--hs-text-primary)]">{currentCard.front}</p>
                      {flashcardRevealed && (
                        <div className="mt-3 border-t border-[var(--hs-border-subtle)] pt-3 text-xs leading-relaxed text-[var(--hs-text-secondary)]" data-testid="flashcard-answer">
                          <SafeMarkdown content={currentCard.back} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        aria-expanded={flashcardRevealed}
                        onClick={() => setFlashcardRevealed((v) => !v)}
                        className="rounded-lg bg-[var(--hs-accent-violet)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
                      >
                        {flashcardRevealed ? "Hide Answer" : "Reveal Answer"}
                      </button>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => markFlashcard(currentCard.id, true)}
                          className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--hs-accent)]"
                        >
                          Got it
                        </button>
                        <button
                          type="button"
                          onClick={() => markFlashcard(currentCard.id, false)}
                          className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--hs-accent-amber)]"
                        >
                          Needs review
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFlashcardRevealed(false);
                            setFlashcardIndex((i) => (i + 1) % cards.length);
                          }}
                          className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--hs-text-primary)]"
                        >
                          Next Card
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {studyMode === "quiz" && (
                <div className="rounded-xl border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] p-5 space-y-4">
                  <h4 className="text-sm font-bold text-[var(--hs-text-primary)]">Quick Knowledge Check — {selectedLesson.code}</h4>
                  {selectedLesson.quiz.map((q, qIdx) => {
                    const chosen = quizAnswers[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-4 space-y-2">
                        <p className="text-xs font-bold text-[var(--hs-text-primary)]">
                          Q{qIdx + 1}. {q.prompt}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => (
                            <button
                              key={opt}
                              type="button"
                              aria-pressed={chosen === optIdx}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                              className={`block w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                                chosen === optIdx
                                  ? "border-[var(--hs-accent-blue)] bg-[var(--hs-info-bg)] font-bold text-[var(--hs-text-primary)]"
                                  : "border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {quizSubmitted && (
                          <p className={`text-xs font-medium ${chosen === q.correctIndex ? "text-[var(--hs-accent)]" : "text-[var(--hs-accent-coral)]"}`}>
                            {chosen === q.correctIndex ? "Correct — " : "Explanation — "}
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSubmitQuiz(selectedLesson)}
                      className="rounded-lg bg-[var(--hs-accent-blue)] px-4 py-2 text-xs font-bold text-[var(--hs-accent-text)]"
                    >
                      Check Answers
                    </button>
                    {progress.quizScores[selectedLesson.id] && (
                      <span className="text-xs font-bold text-[var(--hs-text-primary)]">
                        Saved session score: {progress.quizScores[selectedLesson.id]!.score}/
                        {progress.quizScores[selectedLesson.id]!.total}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {studyMode === "revision" && (
                <div className="rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-5 space-y-3">
                  <h4 className="text-sm font-bold text-[var(--hs-text-primary)]">
                    Targeted Revision Queue ({revisionCards.length} cards)
                  </h4>
                  <p className="text-xs text-[var(--hs-text-secondary)]">
                    {progress.needsReviewFlashcards.some((id) =>
                      selectedLesson.flashcards.some((fc) => fc.id === id)
                    )
                      ? "Showing concepts marked as Needs review in this session."
                      : "No missed cards yet — reviewing core lesson highlights."}
                  </p>
                  {revisionCards.map((fc) => (
                    <div key={fc.id} className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-3 text-xs space-y-1">
                      <div className="font-bold text-[var(--hs-text-primary)]">{fc.front}</div>
                      <div className="text-[var(--hs-text-secondary)]">{fc.back}</div>
                    </div>
                  ))}
                </div>
              )}

              {studyMode === "recap" && (
                <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-5 space-y-3">
                  <h4 className="text-sm font-bold text-[var(--hs-text-primary)]">60-Second Topic Recap</h4>
                  <p className="text-xs leading-relaxed text-[var(--hs-text-primary)]">{selectedLesson.recap}</p>
                  <div className="text-[11px] text-[var(--hs-text-secondary)]">
                    <span className="font-bold text-[var(--hs-text-primary)]">References:</span>{" "}
                    {selectedLesson.references.join(" · ")}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Dedicated Isolated Educational Learning Agent */}
            <div className="flex flex-col rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-elevated-bg)] p-4 lg:col-span-5">
              <div className="flex items-start justify-between gap-2 border-b border-[var(--hs-border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hs-learn-bg)] text-[var(--hs-accent-violet)]">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--hs-text-primary)]">
                      HawaSaathi Learning Agent
                    </h4>
                    <p className="text-[10px] text-[var(--hs-text-secondary)]">
                      Study Tutor Only · Locked to {selectedLesson.code} ({level})
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--hs-accent-violet)]">
                  No Pricing / No Tools
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  `Explain ${selectedLesson.code} simply`,
                  `What CPCB formula & window apply?`,
                  `Quiz me on ${selectedLesson.code}`
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={tutorLoading}
                    onClick={() => {
                      void askLearningAgent(prompt);
                    }}
                    className="rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--hs-text-primary)] hover:border-[var(--hs-accent-violet)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div
                className="mt-3 flex-1 space-y-2.5 overflow-y-auto rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-3 min-h-[220px] max-h-[340px]"
                aria-label="Learning tutor conversation"
              >
                {tutorMessages.length === 0 ? (
                  <p className="text-xs text-[var(--hs-text-secondary)]">
                    Ask a concept question about <strong>{selectedLesson.code}</strong>, request a formula walkthrough, or test yourself with a practice question.
                  </p>
                ) : (
                  tutorMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        msg.role === "user"
                          ? "ml-6 bg-[var(--hs-accent-violet)] text-[var(--hs-accent-text)]"
                          : "mr-2 border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-primary)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p>{msg.text}</p>
                      ) : (
                        <div className="space-y-1.5">
                          <SafeMarkdown content={msg.text} />
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-[var(--hs-text-secondary)]">
                            {msg.isAiGenerated ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--hs-accent-violet)]">
                                <Sparkles className="h-2.5 w-2.5" /> Gemini Tutor
                              </span>
                            ) : (
                              <span className="font-semibold">Curriculum Baseline</span>
                            )}
                            {msg.policyRefusalApplied && (
                              <span className="rounded bg-[var(--hs-warm-bg)] px-1.5 py-0.5 text-[var(--hs-accent-amber)] font-semibold">
                                Educational scope notice
                              </span>
                            )}
                            {typeof msg.latencyMs === "number" && (
                              <span className="hs-tabular">{msg.latencyMs} ms</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {tutorError && (
                <p className="mt-2 text-[11px] font-medium text-[var(--hs-accent-coral)]">{tutorError}</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void askLearningAgent(tutorInput);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder={`Ask about ${selectedLesson.code} concepts...`}
                  aria-label={`Ask learning tutor about ${selectedLesson.code}`}
                  className="flex-1 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)] placeholder:text-[var(--hs-text-secondary)] focus:border-[var(--hs-accent-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hs-focus-ring)]"
                />
                <button
                  type="submit"
                  disabled={tutorLoading || !tutorInput.trim()}
                  aria-label="Ask learning tutor"
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--hs-accent-violet)] px-3.5 py-2 text-xs font-bold text-[var(--hs-accent-text)] disabled:opacity-50"
                >
                  {tutorLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {tab === "pollutants" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pollutantLessons.map((item) => {
                const quizDone = progress.quizScores[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`lesson-card-${item.id}`}
                    onClick={(e) => openLesson(item.id, e?.currentTarget)}
                    className="group flex flex-col justify-between rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 text-left transition hover:border-[var(--hs-accent-violet)] hover:bg-[var(--hs-learn-bg)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[var(--hs-text-primary)] group-hover:text-[var(--hs-accent-violet)]">
                          {item.title}
                        </span>
                        <span className="shrink-0 rounded border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--hs-accent-blue)]">
                          Type C
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--hs-text-secondary)]">
                        {item.shortSummary}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--hs-border-subtle)] text-[11px] font-semibold">
                      <span className="text-[var(--hs-accent-violet)]">Open lesson &amp; quiz →</span>
                      {quizDone && (
                        <span className="inline-flex items-center gap-1 text-[var(--hs-accent)]">
                          <CheckCircle2 className="h-3 w-3" /> {quizDone.score}/{quizDone.total}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "naqi" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] p-3.5 text-xs">
                <p className="text-[var(--hs-text-primary)]">
                  <strong>CPCB National Air Quality Index (MoEFCC 2014):</strong> 6 bands defined by deterministic piecewise linear sub-index interpolation. Requires ≥3 pollutants including PM2.5 or PM10.
                </p>
                <button
                  type="button"
                  onClick={(e) => openLesson("cpcb-naqi", e?.currentTarget)}
                  className="shrink-0 rounded-lg bg-[var(--hs-accent)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
                >
                  Open Interactive NAQI Lesson →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CPCB_BANDS.map((b) => (
                  <div key={b.band} className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${b.color}`}>
                      {b.band}
                    </span>
                    <p className="mt-2 text-xs text-[var(--hs-text-secondary)]">{b.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "provenance" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] p-3.5 text-xs">
                <p className="text-[var(--hs-text-primary)]">
                  <strong>Scientific Truthfulness Contract:</strong> HawaSaathi separates official bulletins, calculated indices, raw readings, and regional model grids.
                </p>
                <button
                  type="button"
                  onClick={(e) => openLesson("type-a-d", e?.currentTarget)}
                  className="shrink-0 rounded-lg bg-[var(--hs-accent-violet)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
                >
                  Practice Type A–D Quiz →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    type: "Type A",
                    title: "Official CPCB-Published AQI",
                    desc: "Reported directly from official CAAQMS government bulletins with original authority.",
                    icon: ShieldCheck,
                    cls: "bg-[var(--hs-subtle-bg)] border-[var(--hs-border-subtle)] text-[var(--hs-accent)]"
                  },
                  {
                    type: "Type B",
                    title: "Calculated CPCB Sub-Index AQI",
                    desc: "Independently computed by HawaSaathi from validated 24h/8h hourly concentrations using MoEFCC breakpoints.",
                    icon: Layers,
                    cls: "bg-[var(--hs-info-bg)] border-[var(--hs-info-border)] text-[var(--hs-accent-blue)]"
                  },
                  {
                    type: "Type C",
                    title: "Raw Measured Concentration",
                    desc: "Physical sensor measurements (µg/m³ or mg/m³) with exact observation timestamp, unit, and averaging window.",
                    icon: Wind,
                    cls: "bg-[var(--hs-learn-bg)] border-[var(--hs-learn-border)] text-[var(--hs-accent-violet)]"
                  },
                  {
                    type: "Type D",
                    title: "Atmospheric Model Forecast",
                    desc: "Copernicus Open-Meteo CAMS (~45 km grid) prediction tagged MODEL_FORECAST — never shown as a ground station measurement.",
                    icon: HelpCircle,
                    cls: "bg-[var(--hs-warm-bg)] border-[var(--hs-warm-border)] text-[var(--hs-accent-amber)]"
                  }
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.type} className={`rounded-xl border p-4 ${card.cls}`}>
                      <div className="flex items-center gap-2 font-bold">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-wider">{card.type}</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-[var(--hs-text-primary)]">{card.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--hs-text-secondary)]">{card.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "indoor" && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[var(--hs-text-primary)]">
                      Interactive CADR &amp; ACH Sizing Playground
                    </h3>
                    <span className="rounded border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--hs-accent-blue)]">
                      Calculated (NOT Measured)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hs-text-secondary)]">Length (m)</span>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        step={0.5}
                        value={roomLength}
                        onChange={(e) => setRoomLength(Number(e.target.value) || 1)}
                        className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)] hs-tabular"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hs-text-secondary)]">Width (m)</span>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        step={0.5}
                        value={roomWidth}
                        onChange={(e) => setRoomWidth(Number(e.target.value) || 1)}
                        className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)] hs-tabular"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hs-text-secondary)]">Height (m)</span>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        step={0.1}
                        value={roomHeight}
                        onChange={(e) => setRoomHeight(Number(e.target.value) || 2)}
                        className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)] hs-tabular"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hs-text-secondary)]">Target ACH</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={targetAch}
                        onChange={(e) => setTargetAch(Number(e.target.value) || 4.5)}
                        className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)] hs-tabular"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-3 text-center">
                    <div>
                      <div className="text-[10px] text-[var(--hs-text-secondary)]">Room Volume</div>
                      <div className="text-sm font-extrabold text-[var(--hs-text-primary)] hs-tabular">{cadrResult.roomVolumeM3} m³</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--hs-text-secondary)]">Required CADR</div>
                      <div className="text-sm font-extrabold text-[var(--hs-accent)] hs-tabular">{cadrResult.requiredCadrM3H} m³/h</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--hs-text-secondary)]">CFM Equivalent</div>
                      <div className="text-sm font-extrabold text-[var(--hs-accent-blue)] hs-tabular">{cadrResult.requiredCadrCfm} CFM</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--hs-text-secondary)]">{cadrResult.engineeringAssumptionNote}</p>
                </div>

                <div className="rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-4 lg:col-span-6 space-y-2.5">
                  <h3 className="text-sm font-bold text-[var(--hs-text-primary)]">
                    Ventilation, HEPA Standards &amp; Combustion Safety
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--hs-text-secondary)]">
                    {cadrResult.filterTypeGuidance}
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--hs-text-secondary)]">
                    <strong>Avoid trapping indoor CO:</strong> Never seal a kitchen or unvented burner room completely without exhaust. Cross-ventilate briefly during midday dips when outdoor air improves.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => openLesson("cadr-ventilation", e?.currentTarget)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--hs-accent-violet)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
                  >
                    Open CADR Lesson &amp; Study Tutor →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
