// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Coordinates modal/drawer open state, onboarding dismissal persistence, global
 * Cmd/Ctrl+K & Escape keyboard shortcuts, and pre-dialog trigger focus capture/restoration.
 */
export function useModalOrchestration() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState<boolean>(false);
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isAlertPreferencesOpen, setIsAlertPreferencesOpen] = useState<boolean>(false);

  const lastFocusRef = useRef<{ focus?: () => void } | null>(null);

  const captureFocusBeforeModal = useCallback(() => {
    lastFocusRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as { focus?: () => void } | null)
        : null;
  }, []);

  const closeModalAndRestoreFocus = useCallback((setter: (open: boolean) => void) => {
    setter(false);
    lastFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    try {
      const seenOnboarding = window.localStorage?.getItem?.("hs_onboarding_seen");
      if (!seenOnboarding) {
        setIsOnboardingOpen(true);
      }
    } catch {
      // Ignore storage errors safely
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => {
          if (!open) captureFocusBeforeModal();
          return !open;
        });
        return;
      }
      if (e.key === "Escape") {
        setIsMobileNavOpen(false);
        setIsAuthModalOpen(false);
        setIsHouseholdModalOpen(false);
        setIsProvenanceModalOpen(false);
        setIsNotificationCenterOpen(false);
        setIsAlertPreferencesOpen(false);
        setIsCommandPaletteOpen(false);
        lastFocusRef.current?.focus?.();
      }
    };

    window.addEventListener?.("keydown", handleKeyDown);
    return () => {
      window.removeEventListener?.("keydown", handleKeyDown);
    };
  }, [captureFocusBeforeModal]);

  const openAuthModal = useCallback(() => {
    captureFocusBeforeModal();
    setIsAuthModalOpen(true);
  }, [captureFocusBeforeModal]);

  const closeAuthModal = useCallback(() => {
    closeModalAndRestoreFocus(setIsAuthModalOpen);
  }, [closeModalAndRestoreFocus]);

  const closeAuthModalOnDelete = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openHouseholdModal = useCallback(() => {
    captureFocusBeforeModal();
    setIsHouseholdModalOpen(true);
  }, [captureFocusBeforeModal]);

  const closeHouseholdModal = useCallback(() => {
    closeModalAndRestoreFocus(setIsHouseholdModalOpen);
  }, [closeModalAndRestoreFocus]);

  const openProvenanceModal = useCallback(() => {
    captureFocusBeforeModal();
    setIsProvenanceModalOpen(true);
  }, [captureFocusBeforeModal]);

  const closeProvenanceModal = useCallback(() => {
    closeModalAndRestoreFocus(setIsProvenanceModalOpen);
  }, [closeModalAndRestoreFocus]);

  const openNotificationCenter = useCallback(() => {
    captureFocusBeforeModal();
    setIsNotificationCenterOpen(true);
  }, [captureFocusBeforeModal]);

  const closeNotificationCenter = useCallback(() => {
    closeModalAndRestoreFocus(setIsNotificationCenterOpen);
  }, [closeModalAndRestoreFocus]);

  const openAlertPreferences = useCallback(() => {
    captureFocusBeforeModal();
    setIsAlertPreferencesOpen(true);
  }, [captureFocusBeforeModal]);

  const openAlertPreferencesFromDrawer = useCallback(() => {
    setIsNotificationCenterOpen(false);
    setIsAlertPreferencesOpen(true);
  }, []);

  const closeAlertPreferences = useCallback(() => {
    closeModalAndRestoreFocus(setIsAlertPreferencesOpen);
  }, [closeModalAndRestoreFocus]);

  const openCommandPalette = useCallback(() => {
    captureFocusBeforeModal();
    setIsCommandPaletteOpen(true);
  }, [captureFocusBeforeModal]);

  const closeCommandPalette = useCallback(() => {
    closeModalAndRestoreFocus(setIsCommandPaletteOpen);
  }, [closeModalAndRestoreFocus]);

  const openOnboarding = useCallback(() => {
    captureFocusBeforeModal();
    setIsOnboardingOpen(true);
  }, [captureFocusBeforeModal]);

  const dismissOnboarding = useCallback(() => {
    closeModalAndRestoreFocus(setIsOnboardingOpen);
    try {
      window.localStorage?.setItem?.("hs_onboarding_seen", "true");
    } catch {
      // Ignore storage errors safely
    }
  }, [closeModalAndRestoreFocus]);

  const toggleMobileNav = useCallback(() => {
    captureFocusBeforeModal();
    setIsMobileNavOpen((prev) => !prev);
  }, [captureFocusBeforeModal]);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  return {
    isMobileNavOpen,
    isCommandPaletteOpen,
    isOnboardingOpen,
    isAuthModalOpen,
    isHouseholdModalOpen,
    isProvenanceModalOpen,
    isNotificationCenterOpen,
    isAlertPreferencesOpen,
    openAuthModal,
    closeAuthModal,
    closeAuthModalOnDelete,
    openHouseholdModal,
    closeHouseholdModal,
    openProvenanceModal,
    closeProvenanceModal,
    openNotificationCenter,
    closeNotificationCenter,
    openAlertPreferences,
    openAlertPreferencesFromDrawer,
    closeAlertPreferences,
    openCommandPalette,
    closeCommandPalette,
    openOnboarding,
    dismissOnboarding,
    toggleMobileNav,
    closeMobileNav
  };
}
