"use server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { supportTickets } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  contactId: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  slaDueAt: z.date().optional(),
});

const updateSchema = createSchema.partial().omit({ contactId: true });

export async function createTicket(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(supportTickets).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    subject: parsed.subject,
    body: parsed.body,
    priority: parsed.priority,
    slaDueAt: parsed.slaDueAt ?? null,
  }).returning().all();
  return row;
}

export async function updateTicketStatus(id: string, status: "new" | "in_progress" | "waiting_on_customer" | "resolved" | "closed") {
  const orgId = await requireOrg();
  const [row] = db.update(supportTickets).set({ status })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function setTicketPriority(id: string, priority: "low" | "medium" | "high" | "urgent") {
  const orgId = await requireOrg();
  const [row] = db.update(supportTickets).set({ priority })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function resolveTicket(id: string) {
  const orgId = await requireOrg();
  const [row] = db.update(supportTickets)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function deleteTicket(id: string) {
  const orgId = await requireOrg();
  db.delete(supportTickets)
    .where(and(eq(supportTickets.id, id), eq(supportTickets.organizationId, orgId)))
    .run();
}
