// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";

export type LogoVariant = "horizontal" | "icon" | "monochrome" | "reversed";

export interface LogoProps {
  readonly variant?: LogoVariant;
  readonly size?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export const HawaSaathiLogo: React.FC<LogoProps> = ({
  variant = "horizontal",
  size = 36,
  className = "",
  ariaLabel = "HawaSaathi"
}) => {
  const isIconOnly = variant === "icon";
  const isMonochrome = variant === "monochrome";
  const isReversed = variant === "reversed";

  // Palette resolution based on variant
  const outerStroke = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#FFFFFF"
    : "#164E4A";

  const outerFill = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#FFFFFF"
    : "#164E4A";

  const airCurrentStroke = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#B8E6D2"
    : "#1F9D78";

  const innerAirStroke = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#FFFFFF"
    : "#B8E6D2";

  const compassNorthFill = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#B8E6D2"
    : "#1F9D78";

  const compassSouthFill = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#FFFFFF"
    : "#102A2A";

  const compassCenterFill = isMonochrome
    ? "transparent"
    : isReversed
    ? "#164E4A"
    : "#FFFFFF";

  const textPrimaryFill = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#FFFFFF"
    : "#102A2A";

  const textSecondaryFill = isMonochrome
    ? "currentColor"
    : isReversed
    ? "#B8E6D2"
    : "#1F9D78";

  const height = size;
  const width = isIconOnly ? size : Math.round(size * 4.16);
  const viewBox = isIconOnly ? "0 0 48 48" : "0 0 200 48";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={height}
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={`inline-block select-none transition-transform duration-200 ${className}`}
    >
      <title>{ariaLabel}</title>
      <desc>HawaSaathi — Flowing air current, environmental leaf and guidance compass</desc>

      {/* Symbol Graphics Group */}
      <g transform="translate(0, 0)">
        {/* Outer leaf silhouette envelope */}
        <path
          d="M10 38C7.5 27 13 14 27 8C36 10 40 17 40 24C40 32 32 39 21 40C16 40.5 12 39.5 10 38Z"
          fill={outerFill}
          fillOpacity={isReversed ? 0.15 : 0.10}
        />
        <path
          d="M10 38C7.5 27 13 14 27 8C36 10 40 17 40 24C40 32 32 39 21 40C16 40.5 12 39.5 10 38Z"
          stroke={outerStroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Laminar clean air streams */}
        <path
          d="M8 29C14 29 19 23 25 16C29 11 35 10 39 12"
          stroke={airCurrentStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M13 36C18 35 22 30 27 24C31 19 35 17 38 18"
          stroke={innerAirStroke}
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Directional Intelligence Compass Needle */}
        <polygon points="31,13 34,22 25,19" fill={compassNorthFill} />
        <polygon
          points="31,13 22,23 25,19"
          fill={compassSouthFill}
          fillOpacity={isMonochrome ? 0.6 : 1}
        />
        <circle cx="28" cy="18" r="1.5" fill={compassCenterFill} />
      </g>

      {/* Wordmark (rendered when variant is not icon-only) */}
      {!isIconOnly && (
        <text
          x="54"
          y="32"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="700"
          letterSpacing="-0.5"
        >
          {isMonochrome ? (
            <tspan fill={textPrimaryFill}>HawaSaathi</tspan>
          ) : (
            <>
              <tspan fill={textPrimaryFill}>Hawa</tspan>
              <tspan fill={textSecondaryFill}>Saathi</tspan>
            </>
          )}
        </text>
      )}
    </svg>
  );
};
