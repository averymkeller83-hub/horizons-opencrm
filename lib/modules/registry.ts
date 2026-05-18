import config from "@/horizons.config";
import type { ModuleManifest } from "./types";

import { pipelineModule } from "@/modules/pipeline/module";

const allModules: Record<string, ModuleManifest> = {
  pipeline: pipelineModule,
  // jobs, orders, subscriptions, supportTickets land in Phase 1c
};

export function getEnabledModules(): ModuleManifest[] {
  return Object.entries(config.modules)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => allModules[name])
    .filter((m): m is ModuleManifest => m !== undefined);
}

export function isModuleEnabled(name: string): boolean {
  return Boolean(config.modules[name]);
}
