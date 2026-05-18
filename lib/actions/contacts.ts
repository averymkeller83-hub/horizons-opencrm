"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function createContact(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(contacts).values({
    organizationId: orgId,
    name: parsed.name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    company: parsed.company || null,
    notes: parsed.notes || null,
  }).returning().all();
  return row;
}

export async function updateContact(id: string, input: z.infer<typeof updateSchema>) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db
    .update(contacts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function deleteContact(id: string) {
  const orgId = await requireOrg();
  db.delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .run();
}
