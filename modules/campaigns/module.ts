import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { CampaignsDashboardWidget } from "./dashboard-widget";

export const campaignsModule: ModuleManifest = {
  name: "campaigns",
  label: "Campaigns",
  navIcon: "Megaphone",
  routes: [{ path: "/campaigns", label: "Campaigns" }],
  schema,
  dashboardWidget: CampaignsDashboardWidget,
};
