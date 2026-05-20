"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  name: z.string().min(1),
  type: z
    .enum(["paid_ad", "referral", "cold_email", "event", "content", "partnership", "other"])
    .default("other"),
  status: z
    .enum(["active", "paused", "completed", "archived"])
    .default("active"),
  budgetCents: z.number().int().nonnegative().default(0),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function createCampaign(input: z.input<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db
    .insert(campaigns)
    .values({
      organizationId: orgId,
      name: parsed.name,
      type: parsed.type,
      status: parsed.status,
      budgetCents: parsed.budgetCents,
      startDate: parsed.startDate ?? null,
      endDate: parsed.endDate ?? null,
      notes: parsed.notes ?? null,
    })
    .returning()
    .all();
  return row;
}

export async function updateCampaign(
  id: string,
  input: z.input<typeof updateSchema>,
) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db
    .update(campaigns)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function archiveCampaign(id: string) {
  return updateCampaign(id, { status: "archived" });
}

export async function deleteCampaign(id: string) {
  const orgId = await requireOrg();
  db.delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, orgId)))
    .run();
}
