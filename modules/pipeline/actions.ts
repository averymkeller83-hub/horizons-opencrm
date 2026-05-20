"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deals, pipelineStages } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createStageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
});

const createDealSchema = z.object({
  contactId: z.string(),
  stageId: z.string(),
  title: z.string().min(1),
  valueCents: z.number().int().nonnegative().default(0),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseAt: z.date().optional(),
  notes: z.string().optional(),
  campaignId: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial().omit({ contactId: true, stageId: true });

export async function createStage(input: z.input<typeof createStageSchema>) {
  const orgId = await requireOrg();
  const parsed = createStageSchema.parse(input);
  const [row] = db.insert(pipelineStages).values({
    organizationId: orgId,
    name: parsed.name,
    order: parsed.order,
    isWon: parsed.isWon,
    isLost: parsed.isLost,
  }).returning().all();
  return row;
}

export async function createDeal(input: z.input<typeof createDealSchema>) {
  const orgId = await requireOrg();
  const parsed = createDealSchema.parse(input);
  const [row] = db.insert(deals).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    stageId: parsed.stageId,
    title: parsed.title,
    valueCents: parsed.valueCents,
    probability: parsed.probability ?? 50,
    expectedCloseAt: parsed.expectedCloseAt ?? null,
    notes: parsed.notes ?? null,
    campaignId: parsed.campaignId ?? null,
  }).returning().all();
  return row;
}

export async function moveDealStage(dealId: string, newStageId: string) {
  const orgId = await requireOrg();
  const [row] = db
    .update(deals)
    .set({ stageId: newStageId, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function updateDeal(id: string, input: z.input<typeof updateDealSchema>) {
  const orgId = await requireOrg();
  const parsed = updateDealSchema.parse(input);
  const [row] = db
    .update(deals)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function deleteDeal(id: string) {
  const orgId = await requireOrg();
  db.delete(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .run();
}
