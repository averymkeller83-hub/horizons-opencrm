import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);
  try {
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  // Phase 1a: just ack. Future phases sync user/org state to local DB.
  console.log("[clerk webhook]", body.slice(0, 200));
  return new Response("ok", { status: 200 });
}
