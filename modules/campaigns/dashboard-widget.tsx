import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCampaignsSummary } from "./queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function CampaignsDashboardWidget() {
  const s = await getCampaignsSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{s.activeCount}</p>
        <p className="text-sm text-muted-foreground">active · {formatDollars(s.totalBudgetCents)} total budget</p>
      </CardContent>
    </Card>
  );
}
