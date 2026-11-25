// SPDX-License-Identifier: Apache-2.0
"use client";

import dynamic from "next/dynamic";
import { WorkspaceLoadingSkeleton } from "@/components/shared/workspace-loading-skeleton";

export const loadStationMap = () =>
  import("@/components/maps/station-map").then((m) => m.StationMap);
export const loadStationComparison = () =>
  import("@/components/stations/station-comparison").then((m) => m.StationComparison);
export const loadDailyPlanner = () =>
  import("@/components/planner/daily-planner").then((m) => m.DailyPlanner);
export const loadAgentWorkspace = () =>
  import("@/components/agent/agent-workspace").then((m) => m.AgentWorkspace);
export const loadAiChatWorkspace = () =>
  import("@/components/chat/ai-chat-workspace").then((m) => m.AiChatWorkspace);
export const loadInsightsWorkspace = () =>
  import("@/components/insights/insights-workspace").then((m) => m.InsightsWorkspace);
export const loadLearningCentre = () =>
  import("@/components/learn/learning-centre").then((m) => m.LearningCentre);
export const loadSettingsWorkspace = () =>
  import("@/components/settings/settings-workspace").then((m) => m.SettingsWorkspace);

export const StationMap = dynamic(loadStationMap, {
  loading: WorkspaceLoadingSkeleton,
  ssr: false
});
export const StationComparison = dynamic(loadStationComparison, {
  loading: WorkspaceLoadingSkeleton
});
export const DailyPlanner = dynamic(loadDailyPlanner, {
  loading: WorkspaceLoadingSkeleton
});
export const AgentWorkspace = dynamic(loadAgentWorkspace, {
  loading: WorkspaceLoadingSkeleton
});
export const AiChatWorkspace = dynamic(loadAiChatWorkspace, {
  loading: WorkspaceLoadingSkeleton
});
export const InsightsWorkspace = dynamic(loadInsightsWorkspace, {
  loading: WorkspaceLoadingSkeleton
});
export const LearningCentre = dynamic(loadLearningCentre, {
  loading: WorkspaceLoadingSkeleton
});
export const SettingsWorkspace = dynamic(loadSettingsWorkspace, {
  loading: WorkspaceLoadingSkeleton
});
