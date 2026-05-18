"use server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "./schema";
import { requireOrg } from "@/lib/clerk";

const itemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

const createSchema = z.object({
  contactId: z.string(),
  status: z.enum(["placed", "paid", "fulfilling", "shipped", "delivered", "refunded"]).default("placed"),
  notes: z.string().optional(),
  items: z.array(itemSchema).default([]),
});

function computeTotal(items: { quantity: number; unitPriceCents: number }[]): number {
  return items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
}

export async function createOrder(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const total = computeTotal(parsed.items);
  const [order] = db.insert(orders).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    status: parsed.status,
    totalCents: total,
    notes: parsed.notes ?? null,
  }).returning().all();
  if (parsed.items.length > 0) {
    db.insert(orderItems).values(parsed.items.map((it) => ({
      orderId: order.id,
      productName: it.productName,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
    }))).run();
  }
  return order;
}

export async function updateOrderStatus(id: string, status: z.infer<typeof createSchema>["status"]) {
  const orgId = await requireOrg();
  const fulfilledAt = (status === "delivered" || status === "shipped") ? new Date() : null;
  const [row] = db.update(orders).set({ status, fulfilledAt: fulfilledAt ?? undefined })
    .where(and(eq(orders.id, id), eq(orders.organizationId, orgId)))
    .returning().all();
  return row;
}

async function recomputeOrderTotal(orderId: string): Promise<void> {
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  const total = computeTotal(items);
  db.update(orders).set({ totalCents: total }).where(eq(orders.id, orderId)).run();
}

export async function addLineItem(orderId: string, input: z.infer<typeof itemSchema>) {
  await requireOrg();
  const parsed = itemSchema.parse(input);
  const [row] = db.insert(orderItems).values({
    orderId,
    productName: parsed.productName,
    quantity: parsed.quantity,
    unitPriceCents: parsed.unitPriceCents,
  }).returning().all();
  await recomputeOrderTotal(orderId);
  return row;
}

export async function removeLineItem(itemId: string) {
  await requireOrg();
  const item = db.select().from(orderItems).where(eq(orderItems.id, itemId)).get();
  if (!item) return;
  db.delete(orderItems).where(eq(orderItems.id, itemId)).run();
  await recomputeOrderTotal(item.orderId);
}

export async function deleteOrder(id: string) {
  const orgId = await requireOrg();
  db.delete(orders).where(and(eq(orders.id, id), eq(orders.organizationId, orgId))).run();
}
