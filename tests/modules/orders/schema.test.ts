import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { orders, orderItems } from "@/modules/orders/schema";

describe("orders schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts an order with two line items", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Buyer" }).returning().get();
    const o = db.insert(orders).values({
      organizationId: "org_test",
      contactId: c.id,
      status: "placed",
      totalCents: 1500,
    }).returning().get();
    db.insert(orderItems).values([
      { orderId: o.id, productName: "Cookie", quantity: 2, unitPriceCents: 500 },
      { orderId: o.id, productName: "Brownie", quantity: 1, unitPriceCents: 500 },
    ]).run();
    expect(db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).all()).toHaveLength(2);
  });

  it("cascades: deleting an order deletes its items", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "B" }).returning().get();
    const o = db.insert(orders).values({ organizationId: "org_test", contactId: c.id }).returning().get();
    db.insert(orderItems).values({ orderId: o.id, productName: "X", quantity: 1, unitPriceCents: 100 }).run();
    db.delete(orders).where(eq(orders.id, o.id)).run();
    expect(db.select().from(orderItems).all()).toHaveLength(0);
  });

  it("cascades: deleting contact deletes their orders (and via cascade, items)", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Doomed" }).returning().get();
    const o = db.insert(orders).values({ organizationId: "org_test", contactId: c.id }).returning().get();
    db.insert(orderItems).values({ orderId: o.id, productName: "X", quantity: 1, unitPriceCents: 100 }).run();
    db.delete(contacts).where(eq(contacts.id, c.id)).run();
    expect(db.select().from(orders).all()).toHaveLength(0);
    expect(db.select().from(orderItems).all()).toHaveLength(0);
  });
});
