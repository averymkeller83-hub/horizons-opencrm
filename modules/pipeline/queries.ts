import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { deals, pipelineStages, type Deal, type PipelineStage } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type PipelineSummary = {
  openDealCount: number;
  openValueCents: number;
};

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const orgId = await requireOrg();
  const openDeals = db.select().from(deals)
    .where(and(eq(deals.organizationId, orgId)))
    .all()
    .filter((d) => d.closedAt === null);
  const total = openDeals.reduce((acc, d) => acc + d.valueCents, 0);
  return { openDealCount: openDeals.length, openValueCents: total };
}

export type StageWithDeals = {
  stage: PipelineStage;
  deals: Deal[];
};

export async function getDealsGroupedByStage(): Promise<StageWithDeals[]> {
  const orgId = await requireOrg();
  const stages = db.select().from(pipelineStages)
    .where(eq(pipelineStages.organizationId, orgId))
    .orderBy(pipelineStages.order)
    .all();
  const allDeals = db.select().from(deals)
    .where(eq(deals.organizationId, orgId))
    .all();
  return stages.map((stage) => ({
    stage,
    deals: allDeals.filter((d) => d.stageId === stage.id),
  }));
}
