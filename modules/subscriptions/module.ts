import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { SubscriptionsDashboardWidget } from "./dashboard-widget";

export const subscriptionsModule: ModuleManifest = {
  name: "subscriptions",
  label: "Subscriptions",
  navIcon: "Repeat",
  routes: [{ path: "/subscriptions", label: "Subscriptions" }],
  schema,
  dashboardWidget: SubscriptionsDashboardWidget,
};
