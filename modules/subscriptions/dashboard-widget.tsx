import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getSubscriptionsSummary } from "./queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function SubscriptionsDashboardWidget() {
  const s = await getSubscriptionsSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{formatDollars(s.mrrCents)}</p>
        <p className="text-sm text-muted-foreground">{s.activeCount} active · {s.canceledThisMonth} canceled this month</p>
      </CardContent>
    </Card>
  );
}
