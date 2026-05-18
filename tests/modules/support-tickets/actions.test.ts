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
import { createTicket, resolveTicket, setTicketPriority } from "@/modules/support-tickets/actions";

describe("support-tickets server actions", () => {
  it("creates a ticket with priority high", async () => {
    const c = await createContact({ name: "Cust" });
    const t = await createTicket({
      contactId: c.id,
      subject: "Bug",
      body: "Steps to repro...",
      priority: "high",
    });
    expect(t.priority).toBe("high");
    expect(t.status).toBe("new");
  });

  it("resolveTicket sets status resolved + resolvedAt", async () => {
    const c = await createContact({ name: "X" });
    const t = await createTicket({ contactId: c.id, subject: "x", body: "y" });
    const resolved = await resolveTicket(t.id);
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it("setTicketPriority updates priority", async () => {
    const c = await createContact({ name: "X" });
    const t = await createTicket({ contactId: c.id, subject: "x", body: "y" });
    const updated = await setTicketPriority(t.id, "urgent");
    expect(updated.priority).toBe("urgent");
  });
});
