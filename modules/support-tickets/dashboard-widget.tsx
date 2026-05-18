import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTicketsSummary } from "./queries";

export async function SupportTicketsDashboardWidget() {
  const s = await getTicketsSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Support tickets</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-semibold">{s.openCount}</p>
          {s.urgentCount > 0 && <Badge variant="destructive">{s.urgentCount} urgent</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {s.overdueCount > 0 ? `${s.overdueCount} overdue` : "All within SLA"}
        </p>
      </CardContent>
    </Card>
  );
}
