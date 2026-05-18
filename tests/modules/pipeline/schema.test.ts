import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { deals, pipelineStages } from "@/modules/pipeline/schema";

describe("pipeline schema", () => {
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a pipeline stage", () => {
    db.insert(pipelineStages).values({
      organizationId: "org_test",
      name: "Qualified",
      order: 1,
    }).run();
    const rows = db.select().from(pipelineStages).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Qualified");
  });

  it("creates a deal referencing a contact and stage", () => {
    const contact = db.insert(contacts).values({ organizationId: "org_test", name: "Acme Inc" }).returning().get();
    const stage = db.insert(pipelineStages).values({ organizationId: "org_test", name: "Lead", order: 0 }).returning().get();

    db.insert(deals).values({
      organizationId: "org_test",
      contactId: contact.id,
      stageId: stage.id,
      title: "Q3 Renewal",
      valueCents: 500000,
    }).run();

    const result = db.select().from(deals).where(eq(deals.contactId, contact.id)).all();
    expect(result).toHaveLength(1);
    expect(result[0].valueCents).toBe(500000);
  });

  it("cascades: deleting a contact deletes their deals", () => {
    const contact = db.insert(contacts).values({ organizationId: "org_test", name: "ToDelete" }).returning().get();
    const stage = db.insert(pipelineStages).values({ organizationId: "org_test", name: "Lead", order: 0 }).returning().get();

    db.insert(deals).values({
      organizationId: "org_test",
      contactId: contact.id,
      stageId: stage.id,
      title: "Will Cascade",
      valueCents: 100,
    }).run();

    db.delete(contacts).where(eq(contacts.id, contact.id)).run();
    expect(db.select().from(deals).all()).toHaveLength(0);
  });
});
