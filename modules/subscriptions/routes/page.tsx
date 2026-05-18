import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listSubscriptions } from "../queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function SubscriptionsPage() {
  const all = await listSubscriptions();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <Button asChild><Link href="/subscriptions/new">New subscription</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No subscriptions yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((s) => (
            <li key={s.id}>
              <Link href={`/subscriptions/${s.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{s.planName}</div>
                <div className="text-sm text-muted-foreground">
                  {s.status} · {formatDollars(s.monthlyValueCents)}/mo
                  {s.currentPeriodEnd && ` · renews ${s.currentPeriodEnd.toLocaleDateString()}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
