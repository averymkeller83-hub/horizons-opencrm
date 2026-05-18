import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getJobsSummary } from "./queries";

export async function JobsDashboardWidget() {
  const s = await getJobsSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{s.openCount}</p>
        <p className="text-sm text-muted-foreground">{s.upcomingCount} upcoming</p>
      </CardContent>
    </Card>
  );
}
