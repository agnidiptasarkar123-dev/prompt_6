// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  Pencil
} from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";

export interface ChatMessageItem {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly sources?: readonly string[];
  readonly isAiGenerated?: boolean;
  readonly dataDistinction?: string;
  readonly timestamp: string;
}

export interface ChatThread {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly ChatMessageItem[];
}

export interface AiChatWorkspaceProps {
  readonly language: SupportedLanguage;
  readonly selectedStation: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
}

const STARTER_PROMPTS = [
  "Explain the air quality near me",
  "When should I go for a walk?",
  "Compare nearby stations",
  "Plan my commute",
  "Explain PM2.5",
  "How can I improve indoor ventilation?",
  "Why is the AQI unavailable?"
] as const;

const CHAT_STORAGE_KEY = "hs_chat_threads_v2";
let chatSeq = 0;
function nextChatId(prefix: string): string {
  chatSeq += 1;
  return `${prefix}-${chatSeq}`;
}
function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const AiChatWorkspace: React.FC<AiChatWorkspaceProps> = ({
  language,
  selectedStation,
  calculatedAqi,
  observations,
  forecast
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: "thread-default",
      title: "Current Session",
      messages: []
    }
  ]);
  const [activeThreadId, setActiveThreadId] = useState("thread-default");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [shareStationConsent, setShareStationConsent] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatThread[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0]!.id);
        }
      }
    } catch {
      // Ignore storage failures safely
    }
  }, []);

  const persistThreads = (next: ChatThread[]) => {
    setThreads(next);
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota failures
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0]!;

  const sendMessage = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean || sending) return;
    setError(null);
    setLastFailedPrompt(null);
    setSending(true);
    setInput("");

    const userMsg: ChatMessageItem = {
      id: nextChatId("msg-u"),
      role: "user",
      text: clean,
      timestamp: nowTimeLabel()
    };

    const withUser = threads.map((t) =>
      t.id === activeThread.id
        ? {
            ...t,
            title: t.messages.length === 0 ? clean.slice(0, 32) : t.title,
            messages: [...t.messages, userMsg]
          }
        : t
    );
    persistThreads(withUser);

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          language,
          station: shareStationConsent ? selectedStation : null,
          calculatedAqi,
          observations,
          forecast,
          hasConsentForPersonalization: shareStationConsent
        })
      });

      const json = await res.json();
      if (!res.ok || json.status === "ERROR") {
        setError(json.message || "Chat service returned an error.");
        setLastFailedPrompt(clean);
      } else {
        const payload = json.data as {
          reply: string;
          sources: string[];
          isAiGenerated: boolean;
          dataDistinction: string;
        };
        const assistantMsg: ChatMessageItem = {
          id: nextChatId("msg-a"),
          role: "assistant",
          text: payload.reply,
          sources: payload.sources,
          isAiGenerated: payload.isAiGenerated,
          dataDistinction: payload.dataDistinction,
          timestamp: nowTimeLabel()
        };
        persistThreads(
          withUser.map((t) =>
            t.id === activeThread.id ? { ...t, messages: [...t.messages, assistantMsg] } : t
          )
        );
      }
    } catch {
      setError("Network error communicating with HawaSaathi Chat.");
      setLastFailedPrompt(clean);
    } finally {
      setSending(false);
    }
  };

  const handleNewThread = () => {
    const id = nextChatId("thread");
    const created: ChatThread = { id, title: `Chat ${threads.length + 1}`, messages: [] };
    persistThreads([created, ...threads]);
    setActiveThreadId(id);
  };

  const handleDeleteThread = (id: string) => {
    if (threads.length <= 1) {
      persistThreads([{ id: "thread-default", title: "Current Session", messages: [] }]);
      setActiveThreadId("thread-default");
      return;
    }
    const next = threads.filter((t) => t.id !== id);
    persistThreads(next);
    if (activeThreadId === id && next[0]) {
      setActiveThreadId(next[0].id);
    }
  };

  const handleCommitRename = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameText.trim();
    if (clean) {
      persistThreads(
        threads.map((t) => (t.id === renamingId ? { ...t, title: clean.slice(0, 40) } : t))
      );
    }
    setRenamingId(null);
    setRenameText("");
  };

  const handleClearActive = () => {
    persistThreads(
      threads.map((t) => (t.id === activeThread.id ? { ...t, messages: [] } : t))
    );
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <section
      aria-labelledby="ai-chat-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-4"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--hs-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="ai-chat-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.chatTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">{v2.chatSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewThread}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{v2.chatNewConversation}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRenamingId(activeThread.id);
              setRenameText(activeThread.title);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Rename</span>
          </button>
          <button
            type="button"
            onClick={handleClearActive}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{v2.chatClear}</span>
          </button>
        </div>
      </div>

      {/* Inline Thread Rename Form */}
      {renamingId && (
        <form onSubmit={handleCommitRename} className="flex items-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-2.5">
          <input
            type="text"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            aria-label="Conversation title"
            className="flex-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1 text-xs text-[var(--hs-text-primary)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--hs-accent)] px-3 py-1 text-xs font-bold text-[var(--hs-accent-text)]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setRenamingId(null)}
            className="rounded-lg border border-[var(--hs-border-subtle)] px-2.5 py-1 text-xs text-[var(--hs-text-secondary)]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Conversation Switcher */}
      <div className="flex flex-wrap items-center gap-1.5">
        {threads.map((th) => (
          <div key={th.id} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveThreadId(th.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                th.id === activeThread.id
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
              }`}
            >
              {th.title}
            </button>
            <button
              type="button"
              onClick={() => handleDeleteThread(th.id)}
              aria-label={`Delete conversation ${th.title}`}
              className="rounded-full p-1 text-[var(--hs-text-secondary)] hover:text-rose-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Safety Disclosure & Personalization Consent Toggle */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--hs-accent)]/30 bg-[var(--hs-accent)]/10 px-3 py-2 text-[11px] text-[var(--hs-text-primary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--hs-accent)]" />
          <span>{v2.chatAiLabel} • Non-diagnostic environmental guidance only.</span>
        </div>
        <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={shareStationConsent}
            onChange={(e) => setShareStationConsent(e.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          <span>Share selected station context</span>
        </label>
      </div>

      {/* Starter Prompts */}
      {activeThread.messages.length === 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STARTER_PROMPTS.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => void sendMessage(sp)}
              className="flex items-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3 text-left text-xs font-medium text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--hs-accent)]" />
              <span>{sp}</span>
            </button>
          ))}
        </div>
      )}

      {/* Message Feed */}
      <div
        role="log"
        aria-live="polite"
        className="max-h-96 overflow-y-auto space-y-3 pr-1"
      >
        {activeThread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl p-4 text-xs leading-relaxed ${
              msg.role === "user"
                ? "ml-auto max-w-[85%] bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                : "mr-auto max-w-[92%] border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-primary)]"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] opacity-80">
              <span className="font-bold uppercase">
                {msg.role === "user"
                  ? "You"
                  : msg.isAiGenerated
                  ? "HawaSaathi AI"
                  : "Verified Domain Reply"}
              </span>
              <span>{msg.timestamp}</span>
            </div>
            <p className="whitespace-pre-line">{msg.text}</p>
            {msg.role === "assistant" && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hs-border-subtle)] pt-2 text-[10px] text-[var(--hs-text-secondary)]">
                <span>
                  {msg.sources && msg.sources.length > 0 ? `Sources: ${msg.sources.join(" • ")}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(msg.id, msg.text)}
                  aria-label="Copy response"
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)]"
                >
                  {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-500">
          <span>{error}</span>
          {lastFailedPrompt && (
            <button
              type="button"
              onClick={() => void sendMessage(lastFailedPrompt)}
              className="inline-flex items-center gap-1 font-bold underline"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="flex gap-2 border-t border-[var(--hs-border-subtle)] pt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={v2.chatPlaceholder}
          aria-label="Message HawaSaathi Chat"
          className="flex-1 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3.5 py-2 text-xs text-[var(--hs-text-primary)]"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--hs-accent)] px-4 py-2 text-xs font-bold text-[var(--hs-accent-text)] disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{sending ? "..." : v2.chatSend}</span>
        </button>
      </form>
    </section>
  );
};
