// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function isSafeMarkdownUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
      return trimmed;
    }
  } catch {
    return "";
  }
  return "";
}

export interface SafeMarkdownProps {
  readonly content: string;
  readonly className?: string;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = React.memo(function SafeMarkdownInner({
  content,
  className = "",
}) {
  return (
    <div className={`hs-markdown space-y-2.5 text-xs sm:text-sm leading-relaxed text-[var(--hs-text-primary)] hs-wrap-safe ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: false }]]}
        urlTransform={isSafeMarkdownUrl}
        components={{
          h1: ({ children }) => <h1 className="mt-2 mb-1 text-base sm:text-lg font-bold text-[var(--hs-text-primary)]">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-2 mb-1 text-sm sm:text-base font-bold text-[var(--hs-text-primary)]">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2 mb-1 text-xs sm:text-sm font-bold text-[var(--hs-accent)]">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed text-[var(--hs-text-primary)]">{children}</p>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 text-[var(--hs-text-primary)]">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 text-[var(--hs-text-primary)]">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--hs-accent-blue)] bg-[var(--hs-info-bg)] px-3 py-1.5 rounded-r-lg text-xs text-[var(--hs-text-secondary)]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-[var(--hs-border-subtle)]" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-[var(--hs-border-subtle)]">
              <table className="min-w-full border-collapse text-left text-xs hs-tabular">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[var(--hs-info-bg)] text-[var(--hs-text-primary)]">{children}</thead>,
          th: ({ children }) => <th className="border-b border-[var(--hs-border-subtle)] px-2.5 py-1.5 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-[var(--hs-border-subtle)] px-2.5 py-1.5">{children}</td>,
          a: ({ href, children }) => (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--hs-accent-blue)] underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            ) : (
              <span className="text-[var(--hs-text-secondary)]">{children}</span>
            )
          ),
          code: ({ className: codeCls, children }) => {
            const isBlock = Boolean(codeCls);
            return isBlock ? (
              <pre className="my-2 overflow-x-auto rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-canvas-bg)] p-2.5 font-mono text-[11px] text-[var(--hs-text-primary)]">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="rounded bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-1 py-0.5 font-mono text-[11px] text-[var(--hs-accent)]">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
