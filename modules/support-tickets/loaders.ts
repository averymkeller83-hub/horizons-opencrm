"use server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

export async function getContactsForTicket() {
  const orgId = await requireOrg();
  return db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all();
}
