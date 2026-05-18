import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { jobs } from "@/modules/jobs/schema";

describe("jobs schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a job referencing a contact", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Cindy" }).returning().get();
    db.insert(jobs).values({
      organizationId: "org_test",
      contactId: c.id,
      title: "Pet sit, May 25-30",
      status: "scheduled",
      scheduledAt: new Date("2026-05-25T08:00:00"),
      priceCents: 15000,
    }).run();
    const all = db.select().from(jobs).where(eq(jobs.contactId, c.id)).all();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("scheduled");
  });

  it("cascades: deleting contact deletes jobs", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Doomed" }).returning().get();
    db.insert(jobs).values({
      organizationId: "org_test",
      contactId: c.id,
      title: "x",
      status: "requested",
      priceCents: 0,
    }).run();
    db.delete(contacts).where(eq(contacts.id, c.id)).run();
    expect(db.select().from(jobs).all()).toHaveLength(0);
  });
});
