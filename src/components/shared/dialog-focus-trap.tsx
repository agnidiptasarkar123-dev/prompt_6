// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

// Tracks stacked [role="dialog"] containers so nested/concurrent dialogs only
// delegate Escape and Tab handling to the topmost active dialog layer.
const activeDialogStack: HTMLElement[] = [];

function isElementVisibleForFocus(el: HTMLElement): boolean {
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (typeof el.hasAttribute === "function" && el.hasAttribute("inert")) return false;
  if (typeof el.closest === "function" && el.closest('[hidden], [aria-hidden="true"], [inert]')) {
    return false;
  }
  if (typeof globalThis.getComputedStyle === "function") {
    try {
      const style = globalThis.getComputedStyle(el);
      if (style && (style.display === "none" || style.visibility === "hidden")) {
        return false;
      }
    } catch {
      // Ignore synthetic mock objects unsupported by native getComputedStyle
    }
  }
  return true;
}

interface LandmarkState {
  readonly element: Element;
  readonly prevAriaHidden: string | null;
  readonly hadInert: boolean;
}

function setBackgroundLandmarksInert(dialogContainer: HTMLElement | null): LandmarkState[] {
  if (typeof document === "undefined" || typeof document.querySelectorAll !== "function" || !dialogContainer) {
    return [];
  }
  const landmarks = Array.from(
    document.querySelectorAll("header, main, footer, aside, nav")
  ).filter((el) => typeof el.contains === "function" && !el.contains(dialogContainer));

  return landmarks.map((el) => {
    const prevAriaHidden = el.getAttribute("aria-hidden");
    const hadInert = el.hasAttribute("inert");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("inert", "");
    return { element: el, prevAriaHidden, hadInert };
  });
}

function restoreBackgroundLandmarks(states: readonly LandmarkState[]): void {
  for (const state of states) {
    if (state.prevAriaHidden === null) {
      state.element.removeAttribute("aria-hidden");
    } else {
      state.element.setAttribute("aria-hidden", state.prevAriaHidden);
    }
    if (!state.hadInert) {
      state.element.removeAttribute("inert");
    }
  }
}

export interface DialogFocusTrapProps {
  readonly onClose: () => void;
  readonly initialFocusSelector?: string;
}

/**
 * Provides WCAG 2.2 AA modal dialog keyboard guarantees: initial focus placement,
 * Tab / Shift+Tab focus containment inside the topmost `[role="dialog"]`, visible/
 * non-inert filtering, background landmark inertness, Escape dismissal, and
 * unmount focus restoration.
 */
export const DialogFocusTrap: React.FC<DialogFocusTrapProps> = ({
  onClose,
  initialFocusSelector
}) => {
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const container = anchorRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null;
    if (container) {
      activeDialogStack.push(container);
    }
    const landmarkStates = setBackgroundLandmarksInert(container);

    const getFocusable = () =>
      container
        ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            isElementVisibleForFocus
          )
        : [];

    const timer = setTimeout(() => {
      const explicit =
        container && initialFocusSelector
          ? container.querySelector<HTMLElement>(initialFocusSelector)
          : null;
      const target =
        explicit && isElementVisibleForFocus(explicit)
          ? explicit
          : (getFocusable()[0] ?? container);
      target?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const topmost = activeDialogStack[activeDialogStack.length - 1];
      if (container && topmost && topmost !== container) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !container) return;
      const focusables = getFocusable();
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || !container.contains(active) || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || !container.contains(active) || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (container) {
        activeDialogStack.splice(activeDialogStack.lastIndexOf(container), 1);
      }
      if (activeDialogStack.length === 0) {
        restoreBackgroundLandmarks(landmarkStates);
      }
      if (
        previousFocus &&
        typeof previousFocus.focus === "function" &&
        previousFocus.isConnected !== false
      ) {
        previousFocus.focus();
      }
    };
  }, [onClose, initialFocusSelector]);

  return <span ref={anchorRef} hidden aria-hidden="true" />;
};
