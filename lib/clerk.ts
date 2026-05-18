import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireOrg(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  if (!orgId) throw new Error("No active organization — create one in Clerk dashboard");
  return orgId;
}

export async function getCurrentUserOrg(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
