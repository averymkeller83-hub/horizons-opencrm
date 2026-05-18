import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getOrderWithItems } from "../../queries";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrderWithItems(id);
  if (!data) notFound();
  const { order, items } = data;
  const c = db.select().from(contacts).where(eq(contacts.id, order.contactId)).get();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order</h1>
          <p className="text-muted-foreground">
            {order.status} · ${(order.totalCents / 100).toFixed(2)} · placed {order.placedAt.toLocaleDateString()}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/orders">Back</Link></Button>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Customer</h2></CardHeader>
        <CardContent>{c ? <Link className="text-primary hover:underline" href={`/contacts/${c.id}`}>{c.name}</Link> : "—"}</CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="font-semibold">Items ({items.length})</h2></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground">No items.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.productName}</td>
                    <td className="text-right">{it.quantity}</td>
                    <td className="text-right">${(it.unitPriceCents / 100).toFixed(2)}</td>
                    <td className="text-right">${((it.unitPriceCents * it.quantity) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {order.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{order.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
