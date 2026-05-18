import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listOrders } from "../queries";

export default async function OrdersPage() {
  const all = await listOrders();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button asChild><Link href="/orders/new">New order</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">${(o.totalCents / 100).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  {o.status} · {o.placedAt.toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
