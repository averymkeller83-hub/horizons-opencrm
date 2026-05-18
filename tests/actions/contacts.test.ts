import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

import { createContact, updateContact, deleteContact } from "@/lib/actions/contacts";

describe("contact server actions", () => {
  it("creates a contact bound to the active org", async () => {
    const c = await createContact({ name: "Test User", email: "test@example.com" });
    expect(c.organizationId).toBe("org_test");
    expect(c.name).toBe("Test User");
  });

  it("updates a contact", async () => {
    const c = await createContact({ name: "Original" });
    const updated = await updateContact(c.id, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("deletes a contact", async () => {
    const c = await createContact({ name: "Doomed" });
    await deleteContact(c.id);
    const { db } = await import("@/lib/db");
    const remaining = db.select().from(contacts).where(eq(contacts.id, c.id)).all();
    expect(remaining).toHaveLength(0);
  });
});
