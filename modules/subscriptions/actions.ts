"use server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  contactId: z.string(),
  planName: z.string().min(1),
  status: z.enum(["active", "past_due", "canceled", "expired"]).default("active"),
  monthlyValueCents: z.number().int().nonnegative().default(0),
  currentPeriodEnd: z.date().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ contactId: true });

export async function createSubscription(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(subscriptions).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    planName: parsed.planName,
    status: parsed.status,
    monthlyValueCents: parsed.monthlyValueCents,
    currentPeriodEnd: parsed.currentPeriodEnd ?? null,
    notes: parsed.notes ?? null,
  }).returning().all();
  return row;
}

export async function updateSubscription(id: string, input: z.infer<typeof updateSchema>) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db.update(subscriptions).set(parsed)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, orgId)))
    .returning().all();
  return row;
}

/** Advances currentPeriodEnd by 30 days. Marks status active. */
export async function markPaymentReceived(id: string) {
  const orgId = await requireOrg();
  const sub = db.select().from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, orgId)))
    .get();
  if (!sub) return null;
  const base = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
  const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [row] = db.update(subscriptions)
    .set({ currentPeriodEnd: newEnd, status: "active" })
    .where(eq(subscriptions.id, id))
    .returning().all();
  return row;
}

export async function cancelSubscription(id: string) {
  const orgId = await requireOrg();
  const [row] = db.update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function deleteSubscription(id: string) {
  const orgId = await requireOrg();
  db.delete(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.organizationId, orgId))).run();
}
