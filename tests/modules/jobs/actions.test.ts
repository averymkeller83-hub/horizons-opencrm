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
import { createJob, updateJob, deleteJob, markJobComplete } from "@/modules/jobs/actions";

describe("jobs server actions", () => {
  it("creates a job tied to a contact", async () => {
    const c = await createContact({ name: "Cindy" });
    const j = await createJob({
      contactId: c.id,
      title: "Pet sit",
      status: "scheduled",
      priceCents: 15000,
    });
    expect(j.title).toBe("Pet sit");
    expect(j.priceCents).toBe(15000);
  });

  it("marks a job complete via markJobComplete", async () => {
    const c = await createContact({ name: "X" });
    const j = await createJob({ contactId: c.id, title: "T", priceCents: 100 });
    const done = await markJobComplete(j.id);
    expect(done.status).toBe("completed");
  });

  it("deletes a job", async () => {
    const c = await createContact({ name: "Z" });
    const j = await createJob({ contactId: c.id, title: "T", priceCents: 100 });
    await deleteJob(j.id);
    const { db } = await import("@/lib/db");
    const { jobs } = await import("@/modules/jobs/schema");
    const { eq } = await import("drizzle-orm");
    expect(db.select().from(jobs).where(eq(jobs.id, j.id)).all()).toHaveLength(0);
  });
});
