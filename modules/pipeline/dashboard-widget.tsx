import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPipelineSummary } from "./queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function PipelineDashboardWidget() {
  const summary = await getPipelineSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{formatDollars(summary.openValueCents)}</p>
        <p className="text-sm text-muted-foreground">
          {summary.openDealCount} open deal{summary.openDealCount === 1 ? "" : "s"}
        </p>
      </CardContent>
    </Card>
  );
}
