import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { campaigns } from "@/modules/campaigns/schema";

describe("campaigns schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a campaign with name + type + budget", () => {
    db.insert(campaigns).values({
      organizationId: "org_test",
      name: "Facebook Ad — May Launch",
      type: "paid_ad",
      budgetCents: 50000,
      startDate: new Date("2026-05-01"),
    }).run();
    const all = db.select().from(campaigns).all();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Facebook Ad — May Launch");
    expect(all[0].type).toBe("paid_ad");
    expect(all[0].budgetCents).toBe(50000);
  });

  it("defaults status to active when not specified", () => {
    db.insert(campaigns).values({
      organizationId: "org_test",
      name: "Default Status Test",
      type: "referral",
    }).run();
    const c = db.select().from(campaigns).get();
    expect(c?.status).toBe("active");
  });
});
