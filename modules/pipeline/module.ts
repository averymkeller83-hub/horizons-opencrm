import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { PipelineDashboardWidget } from "./dashboard-widget";

export const pipelineModule: ModuleManifest = {
  name: "pipeline",
  label: "Pipeline",
  navIcon: "Trello",
  routes: [
    { path: "/pipeline", label: "Pipeline" },
  ],
  schema,
  dashboardWidget: PipelineDashboardWidget,
};
