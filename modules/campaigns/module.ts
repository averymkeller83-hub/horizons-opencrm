import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";

export const campaignsModule: ModuleManifest = {
  name: "campaigns",
  label: "Campaigns",
  navIcon: "Megaphone",
  routes: [{ path: "/campaigns", label: "Campaigns" }],
  schema,
};
