import { describe, it, expect, vi } from "vitest";

vi.mock("@/horizons.config", () => ({
  default: {
    business: { name: "Test Co", timezone: "America/Indianapolis" },
    modules: { pipeline: true, jobs: false, orders: false, subscriptions: false, supportTickets: false },
    integrations: {},
    storage: { driver: "better-sqlite3" as const, path: "./data/horizons.db" },
  },
}));

vi.mock("@/modules/pipeline/module", () => ({
  pipelineModule: {
    name: "pipeline",
    label: "Pipeline",
    navIcon: "Trello",
    routes: [{ path: "/pipeline", label: "Pipeline" }],
    schema: {},
  },
}));

import { getEnabledModules } from "@/lib/modules/registry";

describe("module registry", () => {
  it("returns only the enabled modules from horizons.config", () => {
    const enabled = getEnabledModules();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe("pipeline");
  });
});
