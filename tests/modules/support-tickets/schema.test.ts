import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { supportTickets } from "@/modules/support-tickets/schema";

describe("support tickets schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a ticket with priority + SLA", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Customer" }).returning().get();
    const slaDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
    db.insert(supportTickets).values({
      organizationId: "org_test",
      contactId: c.id,
      subject: "Cannot log in",
      body: "Password reset isn't sending email.",
      priority: "high",
      slaDueAt: slaDue,
    }).run();
    const all = db.select().from(supportTickets).where(eq(supportTickets.contactId, c.id)).all();
    expect(all).toHaveLength(1);
    expect(all[0].priority).toBe("high");
    expect(all[0].status).toBe("new");
  });

  it("cascades: deleting contact deletes tickets", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Doomed" }).returning().get();
    db.insert(supportTickets).values({
      organizationId: "org_test",
      contactId: c.id,
      subject: "x",
      body: "y",
    }).run();
    db.delete(contacts).where(eq(contacts.id, c.id)).run();
    expect(db.select().from(supportTickets).all()).toHaveLength(0);
  });
});
