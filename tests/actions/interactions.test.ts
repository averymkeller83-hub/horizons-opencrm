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
import { logInteraction } from "@/lib/actions/interactions";

describe("interaction server actions", () => {
  it("logs an interaction tied to a contact", async () => {
    const c = await createContact({ name: "Test" });
    const i = await logInteraction({
      contactId: c.id,
      type: "call",
      summary: "First call",
    });
    expect(i.contactId).toBe(c.id);
    expect(i.type).toBe("call");
  });
});
