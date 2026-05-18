import type { ComponentType } from "react";

export type ModuleRouteEntry = {
  path: string;
  label: string;
};

export type ModuleDashboardWidget = ComponentType;

export type ModuleManifest = {
  /** Unique key, matches the key in horizons.config.ts:modules */
  name: string;
  /** Human-readable label for nav entries, settings, etc. */
  label: string;
  /** lucide-react icon name (string) — Nav resolves at render time */
  navIcon: string;
  /** Top-level routes the module contributes */
  routes: ModuleRouteEntry[];
  /** Optional: card shown on /dashboard when module enabled */
  dashboardWidget?: ModuleDashboardWidget;
  /** Drizzle schema tables (re-exported so migrations pick them up) */
  schema: Record<string, unknown>;
};
