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
import { createSubscription, markPaymentReceived, cancelSubscription } from "@/modules/subscriptions/actions";

describe("subscriptions server actions", () => {
  it("creates a subscription with a plan", async () => {
    const c = await createContact({ name: "SaaSCo" });
    const s = await createSubscription({
      contactId: c.id,
      planName: "Pro",
      monthlyValueCents: 2900,
    });
    expect(s.planName).toBe("Pro");
    expect(s.status).toBe("active");
  });

  it("markPaymentReceived advances currentPeriodEnd by 30 days", async () => {
    const c = await createContact({ name: "X" });
    const s = await createSubscription({ contactId: c.id, planName: "Pro", monthlyValueCents: 100 });
    const before = Date.now();
    const updated = await markPaymentReceived(s.id);
    expect(updated).not.toBeNull();
    expect(updated!.currentPeriodEnd).toBeDefined();
    // currentPeriodEnd should be ~30 days in the future
    const diffMs = updated!.currentPeriodEnd!.getTime() - before;
    const days = diffMs / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it("cancelSubscription sets status canceled + canceledAt", async () => {
    const c = await createContact({ name: "X" });
    const s = await createSubscription({ contactId: c.id, planName: "Pro", monthlyValueCents: 100 });
    const canceled = await cancelSubscription(s.id);
    expect(canceled.status).toBe("canceled");
    expect(canceled.canceledAt).not.toBeNull();
  });
});
