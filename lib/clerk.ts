import { auth } from "@clerk/nextjs/server";

/**
 * Returns the active data-scope identifier for the current request.
 * - If the user is in a Clerk Organization (team mode), returns the orgId.
 * - If the user has no active org (solo mode), returns a synthetic
 *   `user:<userId>` scope so each solo user has their own isolated data.
 *   When they later create or join an Organization, switching is automatic
 *   — queries don't care whether the scope string starts with `org_` or `user:`.
 * Throws only when there's no authenticated user at all.
 */
export async function requireOrg(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return orgId ?? `user:${userId}`;
}

export async function getCurrentUserOrg(): Promise<string | null> {
  const { userId, orgId } = await auth();
  if (orgId) return orgId;
  if (userId) return `user:${userId}`;
  return null;
}
