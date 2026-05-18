import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { subscriptions, type Subscription } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type SubscriptionsSummary = { activeCount: number; mrrCents: number; canceledThisMonth: number };

export async function getSubscriptionsSummary(): Promise<SubscriptionsSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).all();
  const active = all.filter((s) => s.status === "active");
  const mrr = active.reduce((acc, s) => acc + s.monthlyValueCents, 0);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canceledThisMonth = all.filter((s) => s.canceledAt && s.canceledAt >= startOfMonth).length;
  return { activeCount: active.length, mrrCents: mrr, canceledThisMonth };
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const orgId = await requireOrg();
  return db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).all();
}
