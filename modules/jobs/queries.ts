import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { jobs, type Job } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type JobsSummary = { openCount: number; upcomingCount: number; outstandingCents: number };

export async function getJobsSummary(): Promise<JobsSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(jobs).where(eq(jobs.organizationId, orgId)).all();
  const open = all.filter((j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "paid");
  const upcoming = open.filter((j) => j.scheduledAt && j.scheduledAt > new Date());
  const outstanding = all.filter((j) => j.status === "invoiced").reduce((acc, j) => acc + j.priceCents, 0);
  return { openCount: open.length, upcomingCount: upcoming.length, outstandingCents: outstanding };
}

export async function listJobs(): Promise<Job[]> {
  const orgId = await requireOrg();
  return db.select().from(jobs).where(eq(jobs.organizationId, orgId)).all();
}
