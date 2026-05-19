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

import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
  deleteCampaign,
} from "@/modules/campaigns/actions";

describe("campaigns server actions", () => {
  it("creates a campaign with name + type + budget", async () => {
    const c = await createCampaign({
      name: "Facebook Ad — May",
      type: "paid_ad",
      budgetCents: 50000,
    });
    expect(c.name).toBe("Facebook Ad — May");
    expect(c.status).toBe("active");
    expect(c.budgetCents).toBe(50000);
  });

  it("archiveCampaign sets status to archived", async () => {
    const c = await createCampaign({ name: "ToArchive", type: "referral" });
    const archived = await archiveCampaign(c.id);
    expect(archived.status).toBe("archived");
  });

  it("deletes a campaign", async () => {
    const c = await createCampaign({ name: "Doomed", type: "other" });
    await deleteCampaign(c.id);
    const { db } = await import("@/lib/db");
    const { campaigns } = await import("@/modules/campaigns/schema");
    const { eq } = await import("drizzle-orm");
    expect(db.select().from(campaigns).where(eq(campaigns.id, c.id)).all()).toHaveLength(0);
  });
});
