import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { campaigns, type Campaign } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type CampaignsSummary = { activeCount: number; totalBudgetCents: number };

export async function getCampaignsSummary(): Promise<CampaignsSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(campaigns).where(eq(campaigns.organizationId, orgId)).all();
  const active = all.filter((c) => c.status === "active");
  const totalBudget = active.reduce((acc, c) => acc + c.budgetCents, 0);
  return { activeCount: active.length, totalBudgetCents: totalBudget };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const orgId = await requireOrg();
  return db.select().from(campaigns).where(eq(campaigns.organizationId, orgId)).all();
}

/** Returns the campaign plus counts of linked entities (deals/jobs/orders/subs/tickets). */
export async function getCampaignWithLinkedCounts(id: string) {
  const orgId = await requireOrg();
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign || campaign.organizationId !== orgId) return null;

  const { deals } = await import("@/modules/pipeline/schema");
  const { jobs } = await import("@/modules/jobs/schema");
  const { orders } = await import("@/modules/orders/schema");
  const { subscriptions } = await import("@/modules/subscriptions/schema");
  const { supportTickets } = await import("@/modules/support-tickets/schema");

  const counts = {
    deals: db.select().from(deals).where(eq(deals.campaignId, id)).all().length,
    jobs: db.select().from(jobs).where(eq(jobs.campaignId, id)).all().length,
    orders: db.select().from(orders).where(eq(orders.campaignId, id)).all().length,
    subscriptions: db.select().from(subscriptions).where(eq(subscriptions.campaignId, id)).all().length,
    tickets: db.select().from(supportTickets).where(eq(supportTickets.campaignId, id)).all().length,
  };
  return { campaign, counts };
}
