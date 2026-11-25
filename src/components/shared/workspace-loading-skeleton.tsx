// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";

export function WorkspaceLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="h-48 w-full rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] animate-pulse"
    />
  );
}
