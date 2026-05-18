import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { OrdersDashboardWidget } from "./dashboard-widget";

export const ordersModule: ModuleManifest = {
  name: "orders",
  label: "Orders",
  navIcon: "ShoppingCart",
  routes: [{ path: "/orders", label: "Orders" }],
  schema,
  dashboardWidget: OrdersDashboardWidget,
};
