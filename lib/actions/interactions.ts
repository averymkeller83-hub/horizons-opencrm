"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { interactions } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

const schema = z.object({
  contactId: z.string(),
  type: z.enum(["call", "email", "message", "meeting", "note"]),
  direction: z.enum(["inbound", "outbound", "internal"]).optional(),
  summary: z.string().min(1, "Summary required"),
  occurredAt: z.date().optional(),
});

export async function logInteraction(input: z.infer<typeof schema>) {
  const orgId = await requireOrg();
  const parsed = schema.parse(input);
  const [row] = db.insert(interactions).values({
    contactId: parsed.contactId,
    organizationId: orgId,
    type: parsed.type,
    direction: parsed.direction ?? null,
    summary: parsed.summary,
    occurredAt: parsed.occurredAt ?? new Date(),
  }).returning().all();
  return row;
}
