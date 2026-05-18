import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { JobsDashboardWidget } from "./dashboard-widget";

export const jobsModule: ModuleManifest = {
  name: "jobs",
  label: "Jobs",
  navIcon: "Briefcase",
  routes: [{ path: "/jobs", label: "Jobs" }],
  schema,
  dashboardWidget: JobsDashboardWidget,
};
