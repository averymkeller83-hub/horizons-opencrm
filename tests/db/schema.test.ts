import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { contacts, interactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("universal core schema", () => {
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a contact and reads it back", () => {
    db.insert(contacts).values({
      organizationId: "org_test",
      name: "Jane Doe",
      email: "jane@example.com",
    }).run();

    const result = db.select().from(contacts).where(eq(contacts.email, "jane@example.com")).all();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Jane Doe");
  });

  it("logs an interaction tied to a contact", () => {
    const inserted = db.insert(contacts).values({
      organizationId: "org_test",
      name: "John Smith",
    }).returning().get();

    db.insert(interactions).values({
      contactId: inserted.id,
      organizationId: "org_test",
      type: "call",
      summary: "Initial outreach",
      occurredAt: new Date(),
    }).run();

    const result = db.select().from(interactions).where(eq(interactions.contactId, inserted.id)).all();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("call");
  });

  it("cascades delete: deleting a contact removes its interactions", () => {
    const c = db.insert(contacts).values({
      organizationId: "org_test",
      name: "Cascade Test",
    }).returning().get();

    db.insert(interactions).values({
      contactId: c.id,
      organizationId: "org_test",
      type: "note",
      summary: "Test interaction",
      occurredAt: new Date(),
    }).run();

    db.delete(contacts).where(eq(contacts.id, c.id)).run();

    const remaining = db.select().from(interactions).where(eq(interactions.contactId, c.id)).all();
    expect(remaining).toHaveLength(0);
  });
});
