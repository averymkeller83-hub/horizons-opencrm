import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact } from "@/lib/actions/contacts";
import { createStage, createDeal } from "@/modules/pipeline/actions";
import { getPipelineSummary, getDealsGroupedByStage } from "@/modules/pipeline/queries";

describe("pipeline queries", () => {
  it("computes open + total deal value", async () => {
    const stage = await createStage({ name: "Qualified", order: 0 });
    const c = await createContact({ name: "X" });
    await createDeal({ contactId: c.id, stageId: stage.id, title: "A", valueCents: 100000 });
    await createDeal({ contactId: c.id, stageId: stage.id, title: "B", valueCents: 50000 });

    const summary = await getPipelineSummary();
    expect(summary.openDealCount).toBe(2);
    expect(summary.openValueCents).toBe(150000);
  });

  it("groups deals by stage", async () => {
    const s1 = await createStage({ name: "Lead", order: 0 });
    const s2 = await createStage({ name: "Qualified", order: 1 });
    const c = await createContact({ name: "G" });
    await createDeal({ contactId: c.id, stageId: s1.id, title: "Deal A", valueCents: 100 });
    await createDeal({ contactId: c.id, stageId: s2.id, title: "Deal B", valueCents: 200 });
    await createDeal({ contactId: c.id, stageId: s2.id, title: "Deal C", valueCents: 300 });

    const grouped = await getDealsGroupedByStage();
    const leadCol = grouped.find((g) => g.stage.id === s1.id);
    const qualCol = grouped.find((g) => g.stage.id === s2.id);
    expect(leadCol?.deals).toHaveLength(1);
    expect(qualCol?.deals).toHaveLength(2);
  });
});
