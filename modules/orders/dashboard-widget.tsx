import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getOrdersSummary } from "./queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function OrdersDashboardWidget() {
  const s = await getOrdersSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{formatDollars(s.paidThisMonthCents)}</p>
        <p className="text-sm text-muted-foreground">{s.openCount} open · {s.fulfilling} fulfilling</p>
      </CardContent>
    </Card>
  );
}
