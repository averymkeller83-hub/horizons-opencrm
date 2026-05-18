import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { supportTickets, type SupportTicket } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type TicketsSummary = { openCount: number; urgentCount: number; overdueCount: number };

export async function getTicketsSummary(): Promise<TicketsSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(supportTickets).where(eq(supportTickets.organizationId, orgId)).all();
  const open = all.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const urgent = open.filter((t) => t.priority === "urgent");
  const now = new Date();
  const overdue = open.filter((t) => t.slaDueAt && t.slaDueAt < now);
  return { openCount: open.length, urgentCount: urgent.length, overdueCount: overdue.length };
}

export async function listOpenTickets(): Promise<SupportTicket[]> {
  const orgId = await requireOrg();
  return db.select().from(supportTickets)
    .where(eq(supportTickets.organizationId, orgId))
    .all()
    .filter((t) => t.status !== "resolved" && t.status !== "closed");
}

export async function listAllTickets(): Promise<SupportTicket[]> {
  const orgId = await requireOrg();
  return db.select().from(supportTickets).where(eq(supportTickets.organizationId, orgId)).all();
}
