import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";

export const pipelineModule: ModuleManifest = {
  name: "pipeline",
  label: "Pipeline",
  navIcon: "Trello",
  routes: [
    { path: "/pipeline", label: "Pipeline" },
  ],
  schema,
};
