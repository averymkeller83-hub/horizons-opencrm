import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { SupportTicketsDashboardWidget } from "./dashboard-widget";

export const supportTicketsModule: ModuleManifest = {
  name: "supportTickets",
  label: "Support tickets",
  navIcon: "LifeBuoy",
  routes: [{ path: "/support-tickets", label: "Support tickets" }],
  schema,
  dashboardWidget: SupportTicketsDashboardWidget,
};
