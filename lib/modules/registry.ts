import config from "@/horizons.config";
import type { ModuleManifest } from "./types";

import { pipelineModule } from "@/modules/pipeline/module";
import { jobsModule } from "@/modules/jobs/module";
import { ordersModule } from "@/modules/orders/module";
import { subscriptionsModule } from "@/modules/subscriptions/module";
import { supportTicketsModule } from "@/modules/support-tickets/module";
import { campaignsModule } from "@/modules/campaigns/module";

const allModules: Record<string, ModuleManifest> = {
  pipeline: pipelineModule,
  jobs: jobsModule,
  orders: ordersModule,
  subscriptions: subscriptionsModule,
  supportTickets: supportTicketsModule,
  campaigns: campaignsModule,
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
