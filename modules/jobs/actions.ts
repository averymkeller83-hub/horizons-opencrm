"use server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1),
  status: z.enum(["requested", "scheduled", "in_progress", "completed", "invoiced", "paid", "cancelled"]).default("requested"),
  scheduledAt: z.date().optional(),
  priceCents: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ contactId: true });

export async function createJob(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(jobs).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    title: parsed.title,
    status: parsed.status,
    scheduledAt: parsed.scheduledAt ?? null,
    priceCents: parsed.priceCents,
    notes: parsed.notes ?? null,
  }).returning().all();
  return row;
}

export async function updateJob(id: string, input: z.infer<typeof updateSchema>) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db.update(jobs).set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function markJobComplete(id: string) {
  return updateJob(id, { status: "completed" } as any);
}

export async function deleteJob(id: string) {
  const orgId = await requireOrg();
  db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).run();
}
