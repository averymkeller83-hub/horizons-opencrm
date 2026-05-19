"use server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { campaigns } from "@/modules/campaigns/schema";
import { requireOrg } from "@/lib/clerk";

export async function getContactsForOrder() {
  const orgId = await requireOrg();
  return {
    contacts: db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all(),
    campaigns: db.select().from(campaigns).where(eq(campaigns.organizationId, orgId)).all(),
  };
}
