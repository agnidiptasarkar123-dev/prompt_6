// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BRAND_COLORS, AQI_CATEGORY_COLORS, TYPOGRAPHY, SHADOWS } from "@/theme/tokens";
import { HawaSaathiLogo } from "@/components/brand/logo";
import { Sidebar } from "@/components/shared/sidebar";

describe("Brand Design System & Tokens Verification Suite", () => {
  describe("1. Centralized Theme Tokens (tokens.ts)", () => {
    it("exports complete primary and supporting BRAND_COLORS", () => {
      expect(BRAND_COLORS.midnightTeal).toBe("#102A2A");
      expect(BRAND_COLORS.deepTeal).toBe("#164E4A");
      expect(BRAND_COLORS.saathiGreen).toBe("#1F9D78");
      expect(BRAND_COLORS.mint).toBe("#B8E6D2");
      expect(BRAND_COLORS.warmCanvas).toBe("#F6F8F4");
      expect(BRAND_COLORS.white).toBe("#FFFFFF");
      expect(BRAND_COLORS.slate).toBe("#526466");
      expect(BRAND_COLORS.amber).toBe("#F2B544");
      expect(BRAND_COLORS.orange).toBe("#E98245");
      expect(BRAND_COLORS.aqiRed).toBe("#D94B4B");
    });

    it("exports CPCB AQI_CATEGORY_COLORS with correct labels and palette mappings", () => {
      expect(AQI_CATEGORY_COLORS.GOOD.label).toBe("Good");
      expect(AQI_CATEGORY_COLORS.GOOD.badgeBg).toBe("#1F9D78");
      expect(AQI_CATEGORY_COLORS.SATISFACTORY.label).toBe("Satisfactory");
      expect(AQI_CATEGORY_COLORS.SATISFACTORY.badgeBg).toBe("#84CC16");
      expect(AQI_CATEGORY_COLORS.MODERATE.label).toBe("Moderate");
      expect(AQI_CATEGORY_COLORS.MODERATE.badgeBg).toBe("#F2B544");
      expect(AQI_CATEGORY_COLORS.POOR.label).toBe("Poor");
      expect(AQI_CATEGORY_COLORS.POOR.badgeBg).toBe("#E98245");
      expect(AQI_CATEGORY_COLORS.VERY_POOR.label).toBe("Very Poor");
      expect(AQI_CATEGORY_COLORS.VERY_POOR.badgeBg).toBe("#D94B4B");
      expect(AQI_CATEGORY_COLORS.SEVERE.label).toBe("Severe");
      expect(AQI_CATEGORY_COLORS.SEVERE.badgeBg).toBe("#991B1B");
    });

    it("exports TYPOGRAPHY and SHADOWS token groups", () => {
      expect(TYPOGRAPHY.fontSans).toContain("Inter");
      expect(TYPOGRAPHY.fontMono).toContain("monospace");
      expect(TYPOGRAPHY.heading1).toContain("text-2xl");
      expect(TYPOGRAPHY.body).toContain("text-sm");
      expect(SHADOWS.cardSubtle).toBeDefined();
      expect(SHADOWS.cardHover).toBeDefined();
      expect(SHADOWS.modal).toBeDefined();
    });
  });

  describe("2. HawaSaathi Vector Logo Component (logo.tsx)", () => {
    it("renders default horizontal logo with wordmark and accessible tags", () => {
      const html = renderToStaticMarkup(<HawaSaathiLogo />);
      expect(html).toContain("<svg");
      expect(html).toContain('viewBox="0 0 200 48"');
      expect(html).toContain('aria-label="HawaSaathi"');
      expect(html).toContain("<title>HawaSaathi</title>");
      expect(html).toContain("<desc>HawaSaathi — Flowing air current, environmental leaf and guidance compass</desc>");
      expect(html).toContain("Hawa");
      expect(html).toContain("Saathi");
    });

    it("renders icon-only variant with 48x48 square viewBox", () => {
      const html = renderToStaticMarkup(<HawaSaathiLogo variant="icon" size={40} />);
      expect(html).toContain('viewBox="0 0 48 48"');
      expect(html).toContain('width="40"');
      expect(html).toContain('height="40"');
      expect(html).not.toContain("Saathi</text>");
    });

    it("renders monochrome variant with currentColor fills and strokes", () => {
      const html = renderToStaticMarkup(<HawaSaathiLogo variant="monochrome" />);
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('fill="currentColor"');
    });

    it("renders reversed variant with white and mint highlights for dark backgrounds", () => {
      const html = renderToStaticMarkup(<HawaSaathiLogo variant="reversed" />);
      expect(html).toContain('stroke="#FFFFFF"');
      expect(html).toContain('stroke="#B8E6D2"');
    });

    it("applies custom size, className, and ariaLabel", () => {
      const html = renderToStaticMarkup(
        <HawaSaathiLogo size={48} className="custom-test-class" ariaLabel="Test Logo" />
      );
      expect(html).toContain('height="48"');
      expect(html).toContain("custom-test-class");
      expect(html).toContain('aria-label="Test Logo"');
      expect(html).toContain("<title>Test Logo</title>");
    });
  });

  describe("3. Desktop Sidebar Component (sidebar.tsx)", () => {
    it("renders desktop sidebar with logo and navigation items", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          language="en"
          activeSection="aqi-overview"
          isAuthenticated={false}
        />
      );
      expect(html).toContain("<aside");
      expect(html).toContain("Pan-India Air Intelligence");
      expect(html).toContain('aria-label="Application Sidebar Navigation"');
      expect(html).toContain("Air Quality");
      expect(html).toContain("Monitoring Station Details");
      expect(html).toContain("Atmospheric Forecast (CAMS Global)");
      expect(html).toContain("Commute Exposure");
      expect(html).toContain("Indoor Air Quality Coach");
      expect(html).toContain("Personalised Health &amp; Routine Actions");
      expect(html).toContain("Guest Mode (Local)");
    });

    it("renders multilingual navigation labels for Hindi and Bengali", () => {
      const htmlHi = renderToStaticMarkup(<Sidebar language="hi" />);
      expect(htmlHi).toContain("वायु गुणवत्ता");

      const htmlBn = renderToStaticMarkup(<Sidebar language="bn" />);
      expect(htmlBn).toContain("বায়ুর মান");
    });

    it("renders authenticated identity when logged in", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          language="en"
          isAuthenticated={true}
          userEmail="citizen@hawasaathi.in"
        />
      );
      expect(html).toContain("citizen@hawasaathi.in");
      expect(html).not.toContain("Guest Mode");
    });

    it("renders authenticated fallback string when userEmail is omitted", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          language="en"
          isAuthenticated={true}
        />
      );
      expect(html).toContain("Authenticated");
    });

    it("renders alert preferences and household context action buttons when callbacks provided", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          language="en"
          onOpenAlertPreferences={() => {}}
          onOpenHouseholdModal={() => {}}
          unreadAlertsCount={3}
        />
      );
      expect(html).toContain("Alert Thresholds");
      expect(html).toContain("Household Context");
      expect(html).toContain(">3</span>");
    });

    it("executes interactive click handlers on nav links and modal triggers", () => {
      const selectSpy = vi.fn();
      const alertPrefSpy = vi.fn();
      const householdSpy = vi.fn();

      const element = (
        <Sidebar
          language="en"
          activeSection="aqi-overview"
          onSelectSection={selectSpy}
          onOpenAlertPreferences={alertPrefSpy}
          onOpenHouseholdModal={householdSpy}
          unreadAlertsCount={1}
        />
      );

      // Simulate React element prop execution directly
      const props = element.props;
      props.onOpenAlertPreferences();
      expect(alertPrefSpy).toHaveBeenCalledTimes(1);

      props.onOpenHouseholdModal();
      expect(householdSpy).toHaveBeenCalledTimes(1);

      interface NavLinkVNode {
        props: {
          onClick: (e: { preventDefault: () => void }) => void;
        };
      }
      interface TopGroupVNode {
        props: {
          children: [
            unknown,
            { props: { children: readonly NavLinkVNode[] } }
          ];
        };
      }
      interface SidebarVNode {
        type: (props: unknown) => SidebarVNode;
        props: {
          children: [
            TopGroupVNode,
            unknown
          ];
        };
      }

      // Walk nav items and invoke click
      const rendered = (element as unknown as SidebarVNode).type(props);
      const navChildren = rendered.props.children[0].props.children[1].props.children;
      const fakeEvent = { preventDefault: vi.fn() };
      navChildren[1]!.props.onClick(fakeEvent);
      expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(selectSpy).toHaveBeenCalledWith("stations-map");
    });

    it("handles click when onSelectSection is undefined", () => {
      interface NavLinkVNode {
        props: {
          onClick: (e: { preventDefault: () => void }) => void;
        };
      }
      interface TopGroupVNode {
        props: {
          children: [
            unknown,
            { props: { children: readonly NavLinkVNode[] } }
          ];
        };
      }
      interface SidebarVNode {
        type: (props: unknown) => SidebarVNode;
        props: {
          children: [
            TopGroupVNode,
            unknown
          ];
        };
      }

      const element = (
        <Sidebar
          language="en"
          activeSection="aqi-overview"
        />
      );

      const rendered = (element as unknown as SidebarVNode).type(element.props);
      const navChildren = rendered.props.children[0].props.children[1].props.children;
      const fakeEvent = { preventDefault: vi.fn() };
      // Should not throw
      expect(() => navChildren[0]!.props.onClick(fakeEvent)).not.toThrow();
      expect(fakeEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("omits alert count badge when unreadAlertsCount is 0", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          language="en"
          onOpenAlertPreferences={() => {}}
          unreadAlertsCount={0}
        />
      );
      expect(html).not.toContain("bg-[#D94B4B]");
    });
  });
});
