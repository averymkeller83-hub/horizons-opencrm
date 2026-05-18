import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact } from "@/lib/actions/contacts";
import { createOrder, addLineItem, removeLineItem, deleteOrder } from "@/modules/orders/actions";

describe("orders server actions", () => {
  it("creates order with items and computes total", async () => {
    const c = await createContact({ name: "Buyer" });
    const o = await createOrder({
      contactId: c.id,
      items: [
        { productName: "Cookie", quantity: 2, unitPriceCents: 500 },
        { productName: "Brownie", quantity: 1, unitPriceCents: 500 },
      ],
    });
    expect(o.totalCents).toBe(1500);
  });

  it("addLineItem recomputes total", async () => {
    const c = await createContact({ name: "B" });
    const o = await createOrder({ contactId: c.id, items: [{ productName: "A", quantity: 1, unitPriceCents: 100 }] });
    await addLineItem(o.id, { productName: "B", quantity: 1, unitPriceCents: 200 });

    const { db } = await import("@/lib/db");
    const { orders } = await import("@/modules/orders/schema");
    const { eq } = await import("drizzle-orm");
    const updated = db.select().from(orders).where(eq(orders.id, o.id)).get();
    expect(updated?.totalCents).toBe(300);
  });

  it("removeLineItem recomputes total", async () => {
    const c = await createContact({ name: "B" });
    const o = await createOrder({
      contactId: c.id,
      items: [
        { productName: "A", quantity: 1, unitPriceCents: 100 },
        { productName: "B", quantity: 1, unitPriceCents: 200 },
      ],
    });

    const { db } = await import("@/lib/db");
    const { orderItems } = await import("@/modules/orders/schema");
    const { eq } = await import("drizzle-orm");
    const allItems = db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).all();
    await removeLineItem(allItems[0].id);

    const { orders } = await import("@/modules/orders/schema");
    const updated = db.select().from(orders).where(eq(orders.id, o.id)).get();
    expect(updated?.totalCents).toBe(200);
  });

  it("deletes an order", async () => {
    const c = await createContact({ name: "Z" });
    const o = await createOrder({ contactId: c.id, items: [] });
    await deleteOrder(o.id);

    const { db } = await import("@/lib/db");
    const { orders } = await import("@/modules/orders/schema");
    const { eq } = await import("drizzle-orm");
    expect(db.select().from(orders).where(eq(orders.id, o.id)).all()).toHaveLength(0);
  });
});
