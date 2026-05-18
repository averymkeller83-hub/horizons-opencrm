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
import {
  createStage,
  createDeal,
  moveDealStage,
  updateDeal,
  deleteDeal,
} from "@/modules/pipeline/actions";

describe("pipeline server actions", () => {
  it("creates a stage and a deal in it", async () => {
    const stage = await createStage({ name: "Qualified", order: 0 });
    const contact = await createContact({ name: "Test Co" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Q4 deal",
      valueCents: 250000,
    });
    expect(deal.title).toBe("Q4 deal");
    expect(deal.stageId).toBe(stage.id);
  });

  it("moves a deal to a different stage", async () => {
    const lead = await createStage({ name: "Lead", order: 0 });
    const qualified = await createStage({ name: "Qualified", order: 1 });
    const contact = await createContact({ name: "Mover" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: lead.id,
      title: "Move me",
      valueCents: 100,
    });

    const moved = await moveDealStage(deal.id, qualified.id);
    expect(moved.stageId).toBe(qualified.id);
  });

  it("updates a deal", async () => {
    const stage = await createStage({ name: "S1", order: 0 });
    const contact = await createContact({ name: "T" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Original",
      valueCents: 100,
    });

    const updated = await updateDeal(deal.id, { title: "Renamed", valueCents: 200 });
    expect(updated.title).toBe("Renamed");
    expect(updated.valueCents).toBe(200);
  });

  it("deletes a deal", async () => {
    const stage = await createStage({ name: "S", order: 0 });
    const contact = await createContact({ name: "Z" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Doomed",
      valueCents: 1,
    });

    await deleteDeal(deal.id);

    const { db } = await import("@/lib/db");
    const { deals } = await import("@/modules/pipeline/schema");
    const { eq } = await import("drizzle-orm");
    expect(db.select().from(deals).where(eq(deals.id, deal.id)).all()).toHaveLength(0);
  });
});
