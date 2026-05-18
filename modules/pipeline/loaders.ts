"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { pipelineStages } from "./schema";
import { requireOrg } from "@/lib/clerk";

export async function getContactsAndStages() {
  const orgId = await requireOrg();
  return {
    contacts: db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all(),
    stages: db.select().from(pipelineStages).where(eq(pipelineStages.organizationId, orgId)).all(),
  };
}
