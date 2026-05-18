import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { subscriptions } from "@/modules/subscriptions/schema";

describe("subscriptions schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a subscription", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "SaaSCo" }).returning().get();
    db.insert(subscriptions).values({
      organizationId: "org_test",
      contactId: c.id,
      planName: "Pro",
      status: "active",
      monthlyValueCents: 2900,
    }).run();
    const all = db.select().from(subscriptions).where(eq(subscriptions.contactId, c.id)).all();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("active");
    expect(all[0].monthlyValueCents).toBe(2900);
  });

  it("cascades: deleting contact deletes subs", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Doomed" }).returning().get();
    db.insert(subscriptions).values({
      organizationId: "org_test",
      contactId: c.id,
      planName: "X",
      monthlyValueCents: 100,
    }).run();
    db.delete(contacts).where(eq(contacts.id, c.id)).run();
    expect(db.select().from(subscriptions).all()).toHaveLength(0);
  });
});
